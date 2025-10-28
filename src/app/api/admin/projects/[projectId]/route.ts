import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth, db } from '@/lib/admin-auth';

/**
 * DELETE /api/admin/projects/[projectId]
 * Delete a project (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const authResult = await requireAdminAuth(request);

  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  const { projectId } = await params;

  try {
    // Check if project exists
    const projectResult = await db(
      'SELECT id, name, team_id FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Delete project (cascading deletes should handle related records)
    await db('DELETE FROM projects WHERE id = $1', [projectId]);

    return NextResponse.json({
      message: 'Project deleted successfully',
      project: projectResult.rows[0],
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}
