import { z } from "zod";

/**
 * Instance-level role (affects all teams)
 * - ADMIN: Can manage all teams, users, and instance settings
 * - USER: Regular user with no instance-level privileges
 */
export const instanceRoleSchema = z.enum(["USER", "ADMIN"]);
export type InstanceRole = z.infer<typeof instanceRoleSchema>;

/**
 * Team-level role (scoped to a specific team)
 * - OWNER: Full control over team, can delete team and manage all members
 * - ADMIN: Can manage team settings, members, and all data
 * - MEMBER: Can create and edit data within the team
 * - VIEWER: Read-only access to team data
 * - BILLING: Can manage billing and invoices, read-only for other data
 */
export const teamRoleSchema = z.enum([
	"OWNER",
	"ADMIN",
	"MEMBER",
	"VIEWER",
	"BILLING",
]);
export type TeamRole = z.infer<typeof teamRoleSchema>;

/**
 * Role hierarchy for permission checks
 */
const TEAM_ROLE_HIERARCHY: Record<TeamRole, number> = {
	OWNER: 5,
	ADMIN: 4,
	MEMBER: 3,
	BILLING: 2,
	VIEWER: 1,
};

/**
 * Check if a user has instance admin privileges
 */
export function isInstanceAdmin(role: InstanceRole): boolean {
	return role === "ADMIN";
}

/**
 * Check if a team role has at least the specified minimum role
 * Example: isAtLeastTeamRole('ADMIN', 'MEMBER') returns true
 *          isAtLeastTeamRole('VIEWER', 'MEMBER') returns false
 */
export function isAtLeastTeamRole(
	userRole: TeamRole,
	minRole: TeamRole,
): boolean {
	return TEAM_ROLE_HIERARCHY[userRole] >= TEAM_ROLE_HIERARCHY[minRole];
}

/**
 * Check if a team role can manage team settings
 */
export function canManageTeam(role: TeamRole): boolean {
	return isAtLeastTeamRole(role, "ADMIN");
}

/**
 * Check if a team role can create/edit data
 */
export function canEditData(role: TeamRole): boolean {
	return isAtLeastTeamRole(role, "MEMBER");
}

/**
 * Check if a team role can view data
 */
export function canViewData(role: TeamRole): boolean {
	return isAtLeastTeamRole(role, "VIEWER");
}

/**
 * Check if a team role can manage billing/invoices
 */
export function canManageBilling(role: TeamRole): boolean {
	return role === "BILLING" || isAtLeastTeamRole(role, "ADMIN");
}

/**
 * Check if a team role is an owner
 */
export function isTeamOwner(role: TeamRole): boolean {
	return role === "OWNER";
}
