import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth, db } from '@/lib/admin-auth';

/**
 * GET /api/admin/teams/[teamId]
 * Get team details with members
 */
export async function GET(
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

  try {
    // Get team info
    const teamResult = await db(
      'SELECT * FROM teams WHERE id = $1',
      [teamId]
    );

    if (teamResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    // Get team members
    const membersResult = await db(
      `SELECT
         u.id,
         u.email,
         u.name,
         u.instance_role,
         tm.role as team_role,
         tm.invited_at,
         tm.joined_at
       FROM team_memberships tm
       JOIN users u ON tm.user_id = u.id
       WHERE tm.team_id = $1
       ORDER BY tm.joined_at DESC`,
      [teamId]
    );

    return NextResponse.json({
      team: teamResult.rows[0],
      members: membersResult.rows,
    });
  } catch (error) {
    console.error('Error fetching team:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/teams/[teamId]
 * Delete a team (admin only)
 */
export async function DELETE(
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

    // Delete team (cascading deletes should handle related records)
    await db('DELETE FROM teams WHERE id = $1', [teamId]);

    return NextResponse.json({
      message: 'Team deleted successfully',
      team: teamResult.rows[0],
    });
  } catch (error) {
    console.error('Error deleting team:', error);
    return NextResponse.json(
      { error: 'Failed to delete team' },
      { status: 500 }
    );
  }
}
