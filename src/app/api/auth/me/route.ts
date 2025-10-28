import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { query } from '@/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function GET(request: NextRequest) {
	try {
		const token = request.cookies.get('auth_token')?.value;

		if (!token) {
			return NextResponse.json(
				{ error: 'Not authenticated' },
				{ status: 401 }
			);
		}

		// Verify JWT token
		let decoded: any;
		try {
			decoded = jwt.verify(token, JWT_SECRET);
		} catch (error) {
			return NextResponse.json(
				{ error: 'Invalid token' },
				{ status: 401 }
			);
		}

		// Get user from database
		const userResult = await query(
			`SELECT id, email, name, instance_role
       FROM users
       WHERE id = $1`,
			[decoded.userId]
		);

		if (userResult.rows.length === 0) {
			return NextResponse.json(
				{ error: 'User not found' },
				{ status: 401 }
			);
		}

		const user = userResult.rows[0];

		// Get user's teams
		const teamsResult = await query(
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

		return NextResponse.json({
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				displayName: user.name,
			},
			teams,
			instanceRole: user.instance_role,
		});
	} catch (error) {
		console.error('Get user error:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}
