import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth, db } from '@/lib/admin-auth';

/**
 * GET /api/admin/users
 * List all users with their teams and roles
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAdminAuth(request);

  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const result = await db(`
      SELECT
        u.id,
        u.email,
        u.name,
        u.instance_role,
        u.created_at,
        u.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'team_id', tm.team_id,
              'team_name', t.name,
              'team_slug', t.slug,
              'role', tm.role,
              'joined_at', tm.joined_at
            )
          ) FILTER (WHERE tm.team_id IS NOT NULL),
          '[]'
        ) as teams
      FROM users u
      LEFT JOIN team_memberships tm ON u.id = tm.user_id
      LEFT JOIN teams t ON tm.team_id = t.id
      GROUP BY u.id, u.email, u.name, u.instance_role, u.created_at, u.updated_at
      ORDER BY u.created_at DESC
    `);

    return NextResponse.json({ users: result.rows });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
