import { z } from "zod";

/**
 * Team slug validation
 * Must be lowercase alphanumeric with hyphens, 2-120 chars
 */
export const teamSlugSchema = z
	.string()
	.min(2)
	.max(120)
	.regex(
		/^[a-z0-9-]+$/,
		"Slug must be lowercase alphanumeric with hyphens only",
	);

/**
 * Team name validation
 */
export const teamNameSchema = z.string().min(2).max(120).trim();

/**
 * Full team schema (database row)
 */
export const teamSchema = z.object({
	id: z.string().uuid(),
	name: teamNameSchema,
	slug: teamSlugSchema,
	createdAt: z.date(),
	updatedAt: z.date(),
});

/**
 * Team creation input
 * Slug is optional and will be auto-generated from name if not provided
 */
export const createTeamSchema = z.object({
	name: teamNameSchema,
	slug: teamSlugSchema.optional(),
});

/**
 * Team update input
 */
export const updateTeamSchema = z.object({
	name: teamNameSchema.optional(),
	slug: teamSlugSchema.optional(),
});

/**
 * Team with member count (for list views)
 */
export const teamWithStatsSchema = teamSchema.extend({
	memberCount: z.number().int().nonnegative(),
});

/**
 * Types
 */
export type Team = z.infer<typeof teamSchema>;
export type CreateTeam = z.infer<typeof createTeamSchema>;
export type UpdateTeam = z.infer<typeof updateTeamSchema>;
export type TeamWithStats = z.infer<typeof teamWithStatsSchema>;

/**
 * Generate a slug from a team name
 * - Convert to lowercase
 * - Replace spaces and underscores with hyphens
 * - Remove special characters
 * - Remove consecutive hyphens
 * - Trim hyphens from start/end
 */
export function generateSlugFromName(name: string): string {
	return name
		.toLowerCase()
		.trim()
		.replace(/[\s_]+/g, "-")
		.replace(/[^\w-]+/g, "")
		.replace(/--+/g, "-")
		.replace(/^-+|-+$/g, "")
		.substring(0, 120);
}
