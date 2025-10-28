import { QueryResult, QueryResultRow } from 'pg';
import { query as dbQuery } from '@/db';
import { createLoaders, Loaders } from './loaders';
import { UnauthorizedError } from './errors';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface AuthContext {
  userId: string | null;
  teamId: string | null;
  instanceRole: 'USER' | 'ADMIN' | null;
  teamRole: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' | 'BILLING' | null;
}

export interface DbContext {
  query: <T extends QueryResultRow = any>(text: string, params?: any[]) => Promise<QueryResult<T>>;
}

export interface GraphQLContext {
  db: DbContext;
  auth: AuthContext;
  loaders: Loaders;
}

/**
 * Extracts auth info from JWT cookie or headers (fallback)
 */
async function extractAuth(request: Request): Promise<AuthContext> {
  // Try to get token from cookie
  const cookieHeader = request.headers.get('cookie');
  let token: string | null = null;

  if (cookieHeader) {
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
    token = cookies['auth_token'];
  }

  // If no token in cookie, check Authorization header (for GraphQL Playground, etc.)
  if (!token) {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  // If no token, check custom headers (backwards compatibility)
  if (!token) {
    const userId = request.headers.get('x-user-id');
    const teamId = request.headers.get('x-team-id');
    const instanceRole = request.headers.get('x-instance-role') as 'USER' | 'ADMIN' | null;
    const teamRole = request.headers.get('x-team-role') as 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' | 'BILLING' | null;

    if (userId) {
      return { userId, teamId, instanceRole, teamRole };
    }

    return {
      userId: null,
      teamId: null,
      instanceRole: null,
      teamRole: null,
    };
  }

  try {
    // Verify and decode JWT
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
      instanceRole: 'USER' | 'ADMIN';
    };

    // Get team ID from x-team-id header (set by client)
    // This allows users to switch between teams
    const teamId = request.headers.get('x-team-id');

    // If team ID is provided, verify user has access to that team
    let teamRole: AuthContext['teamRole'] = null;
    if (teamId && decoded.userId) {
      const result = await dbQuery(
        `SELECT role FROM team_memberships WHERE user_id = $1 AND team_id = $2`,
        [decoded.userId, teamId]
      );

      if (result.rows.length > 0) {
        teamRole = result.rows[0].role;
      }
    }

    return {
      userId: decoded.userId,
      teamId: teamId || null,
      instanceRole: decoded.instanceRole,
      teamRole,
    };
  } catch (error) {
    // Invalid token
    return {
      userId: null,
      teamId: null,
      instanceRole: null,
      teamRole: null,
    };
  }
}

/**
 * Creates GraphQL context for each request
 */
export async function createContext(request: Request): Promise<GraphQLContext> {
  const auth = await extractAuth(request);

  return {
    db: {
      query: dbQuery,
    },
    auth,
    loaders: createLoaders(dbQuery),
  };
}

/**
 * Ensures user is authenticated (requires both userId and teamId)
 */
export function requireAuth(context: GraphQLContext): asserts context is GraphQLContext & { auth: Required<AuthContext> } {
  if (!context.auth.userId || !context.auth.teamId) {
    throw new UnauthorizedError('Authentication required');
  }
}

/**
 * Ensures user has a valid userId (doesn't require teamId)
 * Use this for operations that don't require team context, like accepting invites
 */
export function requireUserId(context: GraphQLContext): asserts context is GraphQLContext & { auth: AuthContext & { userId: string } } {
  if (!context.auth.userId) {
    throw new UnauthorizedError('Authentication required');
  }
}

/**
 * Ensures user has the required team role
 */
export function requireTeamRole(
  context: GraphQLContext,
  allowedRoles: ('OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' | 'BILLING')[]
): void {
  requireAuth(context);

  if (!context.auth.teamRole || !allowedRoles.includes(context.auth.teamRole)) {
    throw new UnauthorizedError('Insufficient permissions');
  }
}

/**
 * Ensures user can manage team resources (create/edit projects, clients, etc.)
 * Only OWNER and ADMIN have these permissions.
 */
export function requireTeamManagement(context: GraphQLContext): void {
  requireAuth(context);

  if (context.auth.teamRole !== 'OWNER' && context.auth.teamRole !== 'ADMIN') {
    throw new UnauthorizedError('Only team owners and admins can manage team resources');
  }
}

/**
 * Helper to check if user can manage team resources
 */
export function canManageTeam(context: GraphQLContext): boolean {
  if (!context.auth.userId || !context.auth.teamId) {
    return false;
  }
  return context.auth.teamRole === 'OWNER' || context.auth.teamRole === 'ADMIN';
}

/**
 * Ensures user can access invoicing features (OWNER, ADMIN, or BILLING)
 */
export function requireInvoiceAccess(context: GraphQLContext): void {
  requireAuth(context);

  if (
    context.auth.teamRole !== 'OWNER' &&
    context.auth.teamRole !== 'ADMIN' &&
    context.auth.teamRole !== 'BILLING'
  ) {
    throw new UnauthorizedError('Only team owners, admins, and billing managers can access invoices');
  }
}

/**
 * Ensures the entity belongs to the user's team
 */
export async function requireTeamAccess(
  context: GraphQLContext,
  entityTeamId: string
): Promise<void> {
  requireAuth(context);

  if (context.auth.teamId !== entityTeamId) {
    throw new UnauthorizedError('Access denied: entity belongs to a different team');
  }
}

/**
 * Helper to determine effective project permissions based on team role
 * Team-level roles supersede project-level roles:
 * - OWNER/ADMIN: Full access to ALL projects (like MANAGER)
 * - MEMBER: Only sees projects they're assigned to, gets at least CONTRIBUTOR access
 * - VIEWER/BILLING: Read-only access to ALL projects (at least VIEWER)
 */
function getEffectiveProjectRole(
  teamRole: AuthContext['teamRole'],
  projectRole: 'MANAGER' | 'CONTRIBUTOR' | 'VIEWER' | null
): 'MANAGER' | 'CONTRIBUTOR' | 'VIEWER' | null {
  // OWNER and ADMIN have full access to all projects
  if (teamRole === 'OWNER' || teamRole === 'ADMIN') {
    return 'MANAGER';
  }

  // MEMBER: Only has access if explicitly assigned to the project
  // When assigned, gets at least CONTRIBUTOR access
  if (teamRole === 'MEMBER') {
    if (!projectRole) {
      return null; // Not assigned to this project
    }
    // If they're a project MANAGER, keep that; otherwise, at least CONTRIBUTOR
    return projectRole === 'MANAGER' ? 'MANAGER' : 'CONTRIBUTOR';
  }

  // VIEWER and BILLING have at least VIEWER access to all projects
  if (teamRole === 'VIEWER' || teamRole === 'BILLING') {
    // Project role can upgrade them to CONTRIBUTOR or MANAGER
    return projectRole || 'VIEWER';
  }

  // No team role, use project role only
  return projectRole;
}

/**
 * Gets the user's role in a specific project
 */
export async function getProjectMemberRole(
  context: GraphQLContext,
  projectId: string
): Promise<'MANAGER' | 'CONTRIBUTOR' | 'VIEWER' | null> {
  requireAuth(context);

  const result = await context.db.query<{ role: 'MANAGER' | 'CONTRIBUTOR' | 'VIEWER' }>(
    `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2`,
    [projectId, context.auth.userId]
  );

  return result.rows.length > 0 ? result.rows[0].role : null;
}

/**
 * Gets the user's effective role in a project, considering both team-level and project-level roles.
 * Team-level roles (OWNER, ADMIN) supersede project-level roles.
 */
export async function getEffectiveRole(
  context: GraphQLContext,
  projectId: string
): Promise<'MANAGER' | 'CONTRIBUTOR' | 'VIEWER' | null> {
  requireAuth(context);

  const projectRole = await getProjectMemberRole(context, projectId);
  return getEffectiveProjectRole(context.auth.teamRole, projectRole);
}

/**
 * Ensures user has the required project role (considering team-level roles)
 */
export async function requireProjectRole(
  context: GraphQLContext,
  projectId: string,
  allowedRoles: ('MANAGER' | 'CONTRIBUTOR' | 'VIEWER')[]
): Promise<void> {
  requireAuth(context);

  const effectiveRole = await getEffectiveRole(context, projectId);

  if (!effectiveRole || !allowedRoles.includes(effectiveRole)) {
    throw new UnauthorizedError('Insufficient project permissions');
  }
}

/**
 * Helper to check if user can manage a project (edit project, add/remove members, create tasks, etc.)
 * Team OWNER and ADMIN have full management access to all projects.
 */
export async function canManageProject(
  context: GraphQLContext,
  projectId: string
): Promise<boolean> {
  requireAuth(context);

  const effectiveRole = await getEffectiveRole(context, projectId);
  return effectiveRole === 'MANAGER';
}

/**
 * Helper to check if user can log time on a project
 * Team OWNER, ADMIN, and MEMBER can log time on any project.
 */
export async function canLogTime(
  context: GraphQLContext,
  projectId: string
): Promise<boolean> {
  requireAuth(context);

  const effectiveRole = await getEffectiveRole(context, projectId);
  return effectiveRole === 'MANAGER' || effectiveRole === 'CONTRIBUTOR';
}

/**
 * Helper to check if user can view a project
 * All team members (with any team role) can view all projects in their team.
 */
export async function canViewProject(
  context: GraphQLContext,
  projectId: string
): Promise<boolean> {
  requireAuth(context);

  const effectiveRole = await getEffectiveRole(context, projectId);
  return effectiveRole !== null; // Any role (MANAGER, CONTRIBUTOR, VIEWER) can view
}
