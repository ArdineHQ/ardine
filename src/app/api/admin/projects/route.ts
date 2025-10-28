import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth, db } from '@/lib/admin-auth';

/**
 * GET /api/admin/projects
 * List all projects across all teams
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
        p.id,
        p.name,
        p.code,
        p.description,
        p.status,
        p.team_id,
        t.name as team_name,
        t.slug as team_slug,
        p.client_id,
        c.name as client_name,
        p.archived_at,
        p.created_at,
        COUNT(DISTINCT pm.user_id) as member_count,
        COUNT(DISTINCT pt.id) as task_count
      FROM projects p
      JOIN teams t ON p.team_id = t.id
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN project_members pm ON p.id = pm.project_id
      LEFT JOIN project_tasks pt ON p.id = pt.project_id AND pt.status != 'archived'
      GROUP BY p.id, p.name, p.code, p.description, p.status, p.team_id, t.name, t.slug, p.client_id, c.name, p.archived_at, p.created_at
      ORDER BY p.created_at DESC
    `);

    return NextResponse.json({ projects: result.rows });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}
