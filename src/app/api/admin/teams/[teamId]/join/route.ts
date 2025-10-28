import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth, db } from '@/lib/admin-auth';

/**
 * POST /api/admin/teams/[teamId]/join
 * Join a team as admin (adds admin as ADMIN member if not already a member)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const authResult = await requireAdminAuth(request);

  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  const { teamId } = await params;
  const { userId } = authResult.auth;

  try {
    // Check if team exists
    const teamResult = await db(
      'SELECT id, name FROM teams WHERE id = $1',
      [teamId]
    );

    if (teamResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    // Check if already a member
    const memberResult = await db(
      'SELECT team_id FROM team_memberships WHERE team_id = $1 AND user_id = $2',
      [teamId, userId]
    );

    if (memberResult.rows.length === 0) {
      // Add admin as ADMIN member
      await db(
        `INSERT INTO team_memberships (team_id, user_id, role, invited_at, joined_at)
         VALUES ($1, $2, 'ADMIN', NOW(), NOW())`,
        [teamId, userId]
      );
    }

    return NextResponse.json({
      message: 'Joined team successfully',
      team: teamResult.rows[0],
    });
  } catch (error) {
    console.error('Error joining team:', error);
    return NextResponse.json(
      { error: 'Failed to join team' },
      { status: 500 }
    );
  }
}
