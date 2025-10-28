import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth, db } from '@/lib/admin-auth';

/**
 * GET /api/admin/clients
 * List all clients across all teams
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
        c.id,
        c.name,
        c.email,
        c.phone,
        c.contact_name,
        c.team_id,
        t.name as team_name,
        t.slug as team_slug,
        c.archived_at,
        c.created_at,
        COUNT(DISTINCT p.id) as project_count
      FROM clients c
      JOIN teams t ON c.team_id = t.id
      LEFT JOIN projects p ON c.id = p.client_id AND p.archived_at IS NULL
      GROUP BY c.id, c.name, c.email, c.phone, c.contact_name, c.team_id, t.name, t.slug, c.archived_at, c.created_at
      ORDER BY c.created_at DESC
    `);

    return NextResponse.json({ clients: result.rows });
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}
