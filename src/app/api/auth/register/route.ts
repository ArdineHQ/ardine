import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query as db } from '@/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { name, email, password, inviteToken } = body;

		if (!name || !email || !password) {
			return NextResponse.json(
				{ error: 'Name, email, and password are required' },
				{ status: 400 }
			);
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return NextResponse.json(
				{ error: 'Invalid email address' },
				{ status: 400 }
			);
		}

		// Validate password strength
		if (password.length < 8) {
			return NextResponse.json(
				{ error: 'Password must be at least 8 characters long' },
				{ status: 400 }
			);
		}

		// Check if user already exists
		const existingUserResult = await db(
			'SELECT id FROM users WHERE email = $1',
			[email.toLowerCase()]
		);

		if (existingUserResult.rows.length > 0) {
			return NextResponse.json(
				{ error: 'An account with this email already exists' },
				{ status: 409 }
			);
		}

		// Hash password
		const passwordHash = await bcrypt.hash(password, 10);

		// Check if this is the first user in the database
		const userCountResult = await db('SELECT COUNT(*) as count FROM users');
		const userCount = parseInt(userCountResult.rows[0].count);
		const instanceRole = userCount === 0 ? 'ADMIN' : 'USER';

		// Create user
		const userResult = await db(
			`INSERT INTO users (email, name, password_hash, instance_role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, instance_role`,
			[email.toLowerCase(), name, passwordHash, instanceRole]
		);

		const user = userResult.rows[0];

		// If registering via invite, accept the invite instead of creating a personal team
		if (inviteToken) {
			// Get the invite
			const inviteResult = await db(
				`SELECT * FROM invites
				 WHERE token = $1 AND accepted_at IS NULL AND expires_at > NOW()`,
				[inviteToken]
			);

			if (inviteResult.rows.length === 0) {
				return NextResponse.json(
					{ error: 'Invalid or expired invitation' },
					{ status: 400 }
				);
			}

			const invite = inviteResult.rows[0];

			// Verify the email matches (case-insensitive)
			if (email.toLowerCase() !== invite.email.toLowerCase()) {
				return NextResponse.json(
					{ error: 'This invitation was sent to a different email address' },
					{ status: 400 }
				);
			}

			// Create team membership
			await db(
				`INSERT INTO team_memberships (team_id, user_id, role)
				 VALUES ($1, $2, $3)`,
				[invite.team_id, user.id, invite.role]
			);

			// Mark invite as accepted
			await db(
				'UPDATE invites SET accepted_at = NOW() WHERE id = $1',
				[invite.id]
			);
		} else {
			// Create default team for the user
			// Generate a safe slug from the name
			const baseSlug = name
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with dashes
				.replace(/^-+|-+$/g, '') // Remove leading/trailing dashes
				.substring(0, 50); // Limit length

			const slug = `${baseSlug || 'team'}-${Date.now()}`.substring(0, 120);

			const teamResult = await db(
				`INSERT INTO teams (name, slug)
				 VALUES ($1, $2)
				 RETURNING id, name`,
				[name, slug]
			);

			const team = teamResult.rows[0];

			// Add user as owner of the team
			await db(
				`INSERT INTO team_memberships (team_id, user_id, role)
				 VALUES ($1, $2, $3)`,
				[team.id, user.id, 'OWNER']
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
		console.error('Registration error:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}
