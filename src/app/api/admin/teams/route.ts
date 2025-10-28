import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth, db } from '@/lib/admin-auth';

/**
 * GET /api/admin/teams
 * List all teams with member counts and stats
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
        t.id,
        t.name,
        t.slug,
        t.created_at,
        t.updated_at,
        COUNT(DISTINCT tm.user_id) as member_count,
        COUNT(DISTINCT c.id) as client_count,
        COUNT(DISTINCT p.id) as project_count
      FROM teams t
      LEFT JOIN team_memberships tm ON t.id = tm.team_id
      LEFT JOIN clients c ON t.id = c.team_id AND c.archived_at IS NULL
      LEFT JOIN projects p ON t.id = p.team_id AND p.archived_at IS NULL
      GROUP BY t.id, t.name, t.slug, t.created_at, t.updated_at
      ORDER BY t.created_at DESC
    `);

    return NextResponse.json({ teams: result.rows });
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json(
      { error: 'Failed to fetch teams' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/teams
 * Create a new team
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAdminAuth(request);

  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const body = await request.json();
    const { name, slug, owner_user_id, generate_invite, invite_email } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const existingTeam = await db(
      'SELECT id FROM teams WHERE slug = $1',
      [slug]
    );

    if (existingTeam.rows.length > 0) {
      return NextResponse.json(
        { error: 'Team slug already exists' },
        { status: 400 }
      );
    }

    // Create team
    const teamResult = await db(
      `INSERT INTO teams (name, slug, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       RETURNING id, name, slug, created_at, updated_at`,
      [name, slug]
    );

    const team = teamResult.rows[0];

    // If owner_user_id is provided, add them as team owner
    if (owner_user_id) {
      await db(
        `INSERT INTO team_memberships (team_id, user_id, role, invited_at, joined_at)
         VALUES ($1, $2, 'OWNER', NOW(), NOW())`,
        [team.id, owner_user_id]
      );
    }

    // Generate invite link with OWNER role if requested
    let inviteToken = null;
    let inviteEmail = null;
    if (generate_invite) {
      const crypto = require('crypto');
      const token = crypto.randomBytes(32).toString('hex');

      // Create invite (expires in 7 days)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const email = invite_email || 'invite@placeholder.com';

      await db(
        `INSERT INTO invites (team_id, email, role, token, expires_at)
         VALUES ($1, $2, 'OWNER', $3, $4)`,
        [team.id, email.toLowerCase(), token, expiresAt]
      );

      inviteToken = token;
      inviteEmail = email;
    }

    return NextResponse.json({
      message: 'Team created successfully',
      team,
      invite: inviteToken ? {
        token: inviteToken,
        email: inviteEmail,
        url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${inviteToken}`,
      } : null,
    });
  } catch (error) {
    console.error('Error creating team:', error);
    return NextResponse.json(
      { error: 'Failed to create team' },
      { status: 500 }
    );
  }
}
