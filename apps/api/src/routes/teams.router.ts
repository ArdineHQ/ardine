import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router } from "../trpc/init";
import {
	protectedProcedure,
	teamMemberProcedure,
	teamAdminProcedure,
} from "../middleware/rbac";
import {
	createTeamSchema,
	updateTeamSchema,
	addTeamMemberSchema,
	updateTeamMemberRoleSchema,
	generateSlugFromName,
} from "@ardine/shared";
import {
	TeamsRepository,
	TeamMembershipsRepository,
	userRowParser,
} from "@ardine/db";
import { sql } from "slonik";

/**
 * Teams router - team management operations
 */
export const teamsRouter = router({
	/**
	 * Create a new team
	 * Caller automatically becomes OWNER
	 */
	create: protectedProcedure
		.input(createTeamSchema)
		.mutation(async ({ ctx, input }) => {
			const teamsRepo = new TeamsRepository(ctx.pool);
			const membershipsRepo = new TeamMembershipsRepository(ctx.pool);

			try {
				// Create the team
				const team = await teamsRepo.create(input);

				// Add creator as OWNER
				await membershipsRepo.add(team.id, ctx.sessionUser.id, "OWNER");

				return team;
			} catch (error: any) {
				if (error.code === "TEAM_SLUG_TAKEN") {
					throw new TRPCError({
						code: "CONFLICT",
						message: error.message,
					});
				}
				throw error;
			}
		}),

	/**
	 * List teams for the current user
	 */
	listMine: protectedProcedure.query(async ({ ctx }) => {
		const teamsRepo = new TeamsRepository(ctx.pool);
		return await teamsRepo.listForUser(ctx.sessionUser.id);
	}),

	/**
	 * Get team details (requires membership)
	 */
	get: teamMemberProcedure
		.input(z.object({ id: z.string().uuid().optional() }))
		.query(async ({ ctx, input }) => {
			const teamId = input.id || ctx.activeTeamId!;
			const teamsRepo = new TeamsRepository(ctx.pool);

			const team = await teamsRepo.findById(teamId);

			if (!team) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Team not found",
				});
			}

			return team;
		}),

	/**
	 * Update team details (requires admin)
	 */
	update: teamAdminProcedure
		.input(updateTeamSchema.extend({ id: z.string().uuid().optional() }))
		.mutation(async ({ ctx, input }) => {
			const teamId = input.id || ctx.activeTeamId!;
			const { id, ...data } = input;

			const teamsRepo = new TeamsRepository(ctx.pool);

			try {
				return await teamsRepo.update(teamId, data);
			} catch (error: any) {
				if (error.code === "TEAM_SLUG_TAKEN") {
					throw new TRPCError({
						code: "CONFLICT",
						message: error.message,
					});
				}
				if (error.message === "Team not found") {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Team not found",
					});
				}
				throw error;
			}
		}),

	/**
	 * Team members operations
	 */
	members: router({
		/**
		 * List team members
		 */
		list: teamMemberProcedure
			.input(z.object({ teamId: z.string().uuid().optional() }))
			.query(async ({ ctx, input }) => {
				const teamId = input.teamId || ctx.activeTeamId!;
				const membershipsRepo = new TeamMembershipsRepository(ctx.pool);

				return await membershipsRepo.listMembers(teamId);
			}),

		/**
		 * Add a new member to the team
		 * The user must already exist in the system
		 */
		add: teamAdminProcedure
			.input(addTeamMemberSchema.extend({ teamId: z.string().uuid().optional() }))
			.mutation(async ({ ctx, input }) => {
				const teamId = input.teamId || ctx.activeTeamId!;
				const membershipsRepo = new TeamMembershipsRepository(ctx.pool);

				// Find user by email
				const userResult = await ctx.pool.query(sql.type(userRowParser)`
					SELECT
						id, email, name, display_name, password_hash,
						instance_role, email_verified_at, created_at, updated_at
					FROM users
					WHERE email = ${input.email}
				`);

				if (userResult.rows.length === 0) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "User not found with this email",
					});
				}

				const user = userResult.rows[0];

				try {
					const membership = await membershipsRepo.add(
						teamId,
						user.id,
						input.role,
					);

					return {
						...membership,
						user: {
							id: user.id,
							email: user.email,
							name: user.name,
							displayName: user.displayName,
						},
					};
				} catch (error: any) {
					if (error.code === "MEMBERSHIP_EXISTS") {
						throw new TRPCError({
							code: "CONFLICT",
							message: "User is already a member of this team",
						});
					}
					throw error;
				}
			}),

		/**
		 * Update a member's role
		 * Prevents changing away from the last OWNER
		 */
		updateRole: teamAdminProcedure
			.input(
				updateTeamMemberRoleSchema.extend({
					teamId: z.string().uuid().optional(),
					userId: z.string().uuid(),
				}),
			)
			.mutation(async ({ ctx, input }) => {
				const teamId = input.teamId || ctx.activeTeamId!;
				const membershipsRepo = new TeamMembershipsRepository(ctx.pool);

				// Get current membership
				const currentMembership = await membershipsRepo.get(teamId, input.userId);

				if (!currentMembership) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Membership not found",
					});
				}

				// If changing from OWNER, ensure not the last owner
				if (currentMembership.role === "OWNER" && input.role !== "OWNER") {
					const ownerCount = await membershipsRepo.countOwners(teamId);
					if (ownerCount <= 1) {
						throw new TRPCError({
							code: "FORBIDDEN",
							message: "Cannot change the last owner's role",
						});
					}
				}

				return await membershipsRepo.updateRole(teamId, input.userId, input.role);
			}),

		/**
		 * Remove a member from the team
		 * Prevents removing the last OWNER
		 */
		remove: teamAdminProcedure
			.input(
				z.object({
					teamId: z.string().uuid().optional(),
					userId: z.string().uuid(),
				}),
			)
			.mutation(async ({ ctx, input }) => {
				const teamId = input.teamId || ctx.activeTeamId!;
				const membershipsRepo = new TeamMembershipsRepository(ctx.pool);

				// Get current membership
				const membership = await membershipsRepo.get(teamId, input.userId);

				if (!membership) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Membership not found",
					});
				}

				// If removing an owner, ensure not the last owner
				if (membership.role === "OWNER") {
					const ownerCount = await membershipsRepo.countOwners(teamId);
					if (ownerCount <= 1) {
						throw new TRPCError({
							code: "FORBIDDEN",
							message: "Cannot remove the last owner from the team",
						});
					}
				}

				await membershipsRepo.remove(teamId, input.userId);

				return { success: true };
			}),
	}),
});
