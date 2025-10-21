import { z } from "zod";
import { teamRoleSchema } from "./rbac.schema";

/**
 * Full invite schema (database row)
 * Note: OWNER role is not allowed in invites - only existing team members can become owners through transfer
 */
export const inviteRoleSchema = z.enum(["ADMIN", "MEMBER", "VIEWER", "BILLING"]);
export type InviteRole = z.infer<typeof inviteRoleSchema>;

export const inviteSchema = z.object({
	id: z.string().uuid(),
	teamId: z.string().uuid(),
	email: z.string().email(),
	role: inviteRoleSchema,
	token: z.string(),
	expiresAt: z.date(),
	acceptedAt: z.date().nullable(),
	createdAt: z.date(),
});

/**
 * Create invite input
 */
export const createInviteSchema = z.object({
	email: z.string().email(),
	role: inviteRoleSchema,
	expiresInDays: z.number().int().min(1).max(30).default(7),
});

/**
 * Accept invite input
 */
export const acceptInviteSchema = z.object({
	token: z.string(),
});

/**
 * Invite with team details (for list views)
 */
export const inviteWithTeamSchema = inviteSchema.extend({
	team: z.object({
		id: z.string().uuid(),
		name: z.string(),
		slug: z.string(),
	}),
});

/**
 * Types
 */
export type Invite = z.infer<typeof inviteSchema>;
export type CreateInvite = z.infer<typeof createInviteSchema>;
export type AcceptInvite = z.infer<typeof acceptInviteSchema>;
export type InviteWithTeam = z.infer<typeof inviteWithTeamSchema>;
