import { useAuth } from './auth-context';

export type ProjectRole = 'MANAGER' | 'CONTRIBUTOR' | 'VIEWER';
export type TeamRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' | 'BILLING';

export interface ProjectMember {
  id: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
    displayName?: string;
  };
}

export interface ProjectPermissions {
  role: ProjectRole | null;
  effectiveRole: ProjectRole | null;  // Effective role considering team-level permissions
  canManageProject: boolean;  // Edit project details, status
  canAddMembers: boolean;      // Add/remove project members
  canUpdateMembers: boolean;   // Change member roles
  canCreateTasks: boolean;     // Create new tasks
  canUpdateTasks: boolean;     // Edit task details
  canDeleteTasks: boolean;     // Delete tasks
  canAssignTasks: boolean;     // Assign users to tasks
  canLogTime: boolean;         // Create time entries
  canViewProject: boolean;     // View project details
  isManager: boolean;
  isContributor: boolean;
  isViewer: boolean;
}

/**
 * Helper to determine effective project role based on team role
 * Team-level roles supersede project-level roles:
 * - OWNER/ADMIN: Full access to ALL projects (like MANAGER)
 * - MEMBER: Only sees projects they're assigned to, gets at least CONTRIBUTOR access
 * - VIEWER/BILLING: Read-only access to ALL projects (at least VIEWER)
 */
function getEffectiveProjectRole(
  teamRole: TeamRole | null,
  projectRole: ProjectRole | null
): ProjectRole | null {
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
 * Hook to get the current user's permissions for a project
 * Considers both team-level and project-level roles.
 * @param members - Array of project members with roles
 * @returns ProjectPermissions object with role and permission flags
 */
export function useProjectPermissions(members: ProjectMember[] | undefined): ProjectPermissions {
  const { user, currentTeam } = useAuth();

  // Find the current user's role in this project
  const currentMember = members?.find((m) => m.user.id === user?.id);
  const projectRole = (currentMember?.role as ProjectRole) ?? null;

  // Get team role from current team
  const teamRole = currentTeam?.role ?? null;

  // Calculate effective role considering both team and project roles
  const effectiveRole = getEffectiveProjectRole(teamRole, projectRole);

  const isManager = effectiveRole === 'MANAGER';
  const isContributor = effectiveRole === 'CONTRIBUTOR';
  const isViewer = effectiveRole === 'VIEWER';

  return {
    role: projectRole,
    effectiveRole,
    canManageProject: isManager,
    canAddMembers: isManager,
    canUpdateMembers: isManager,
    canCreateTasks: isManager,
    canUpdateTasks: isManager,
    canDeleteTasks: isManager,
    canAssignTasks: isManager,
    canLogTime: isManager || isContributor,
    canViewProject: effectiveRole !== null,
    isManager,
    isContributor,
    isViewer,
  };
}

/**
 * Helper to get a role badge color
 */
export function getRoleBadgeColor(role: string): string {
  switch (role) {
    case 'MANAGER':
      return 'bg-purple-100 text-purple-800 border-purple-300';
    case 'CONTRIBUTOR':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'VIEWER':
      return 'bg-gray-100 text-gray-800 border-gray-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}

/**
 * Helper to get a user-friendly role name
 */
export function getRoleDisplayName(role: string): string {
  switch (role) {
    case 'MANAGER':
      return 'Manager';
    case 'CONTRIBUTOR':
      return 'Contributor';
    case 'VIEWER':
      return 'Viewer';
    default:
      return role;
  }
}
