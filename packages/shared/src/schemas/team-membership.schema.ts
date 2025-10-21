import { z } from "zod";
import { teamRoleSchema } from "./rbac.schema";

/**
 * Full team membership schema (database row)
 */
export const teamMembershipSchema = z.object({
	id: z.string().uuid(),
	teamId: z.string().uuid(),
	userId: z.string().uuid(),
	role: teamRoleSchema,
	invitedAt: z.date().nullable(),
	joinedAt: z.date(),
	createdAt: z.date(),
});

/**
 * Team membership with user details (for list views)
 */
export const teamMembershipWithUserSchema = teamMembershipSchema.extend({
	user: z.object({
		id: z.string().uuid(),
		email: z.string().email(),
		name: z.string(),
		displayName: z.string().nullable(),
	}),
});

/**
 * Add team member input
 */
export const addTeamMemberSchema = z.object({
	email: z.string().email(),
	role: teamRoleSchema,
});

/**
 * Update team member role input
 */
export const updateTeamMemberRoleSchema = z.object({
	role: teamRoleSchema,
});

/**
 * Types
 */
export type TeamMembership = z.infer<typeof teamMembershipSchema>;
export type TeamMembershipWithUser = z.infer<
	typeof teamMembershipWithUserSchema
>;
export type AddTeamMember = z.infer<typeof addTeamMemberSchema>;
export type UpdateTeamMemberRole = z.infer<typeof updateTeamMemberRoleSchema>;
