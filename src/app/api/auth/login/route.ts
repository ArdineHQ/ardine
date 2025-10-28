import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query as db } from '@/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { email, password } = body;

		if (!email || !password) {
			return NextResponse.json(
				{ error: 'Email and password are required' },
				{ status: 400 }
			);
		}

		// Query user from database
		const userResult = await db(
			`SELECT id, email, name, password_hash, instance_role
       FROM users
       WHERE email = $1`,
			[email]
		);

		if (userResult.rows.length === 0) {
			return NextResponse.json(
				{ error: 'Invalid email or password' },
				{ status: 401 }
			);
		}

		const user = userResult.rows[0];

		// Verify password with bcrypt
		const passwordMatch = await bcrypt.compare(password, user.password_hash);

		if (!passwordMatch) {
			return NextResponse.json(
				{ error: 'Invalid email or password' },
				{ status: 401 }
			);
		}

		// Get user's teams
		const teamsResult = await db(
			`SELECT tm.team_id, t.name as team_name, tm.role as team_role
       FROM team_memberships tm
       JOIN teams t ON t.id = tm.team_id
       WHERE tm.user_id = $1`,
			[user.id]
		);

		const teams = teamsResult.rows.map(row => ({
			id: row.team_id,
			name: row.team_name,
			role: row.team_role,
		}));

		// Create JWT token
		const token = jwt.sign(
			{
				userId: user.id,
				email: user.email,
				instanceRole: user.instance_role,
			},
			JWT_SECRET,
			{ expiresIn: '7d' }
		);

		// Create response with user data
		const response = NextResponse.json({
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				displayName: user.name,
			},
			teams,
			instanceRole: user.instance_role,
		});

		// Set httpOnly cookie with token
		response.cookies.set('auth_token', token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 7, // 7 days
			path: '/',
		});

		return response;
	} catch (error) {
		console.error('Login error:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}
