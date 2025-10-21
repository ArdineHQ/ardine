import { TRPCError } from "@trpc/server";
import { router } from "../trpc/init";
import { adminProcedure } from "../middleware/rbac";
import { updateUserInstanceRoleSchema } from "@ardine/shared";
import { sql } from "slonik";
import { userRowParser } from "@ardine/db";

/**
 * Admin router - instance-level admin operations
 * All procedures require instance admin role
 */
export const adminRouter = router({
	/**
	 * List all users in the instance
	 */
	users: router({
		list: adminProcedure.query(async ({ ctx }) => {
			const result = await ctx.pool.query(sql.type(userRowParser)`
				SELECT
					id, email, name, display_name, password_hash, instance_role,
					email_verified_at, created_at, updated_at
				FROM users
				ORDER BY created_at DESC
			`);

			return result.rows.map((row: any) => ({
				id: row.id,
				email: row.email,
				name: row.name,
				displayName: row.displayName || row.display_name,
				instanceRole: row.instanceRole || row.instance_role,
				emailVerified: (row.emailVerifiedAt ?? row.email_verified_at) !== null,
				createdAt: row.createdAt || new Date(row.created_at),
				updatedAt: row.updatedAt || new Date(row.updated_at),
			}));
		}),

		/**
		 * Set a user's instance role (promote/demote)
		 * Guards against demoting the last admin
		 */
		setRole: adminProcedure
			.input(updateUserInstanceRoleSchema)
			.mutation(async ({ ctx, input }) => {
				// If demoting an admin, check they're not the last one
				if (input.instanceRole === "USER") {
					const adminCount = await ctx.pool.query(sql.unsafe`
						SELECT COUNT(*)::INTEGER as count
						FROM users
						WHERE instance_role = 'ADMIN'
					`);

					if ((adminCount.rows[0] as any).count <= 1) {
						throw new TRPCError({
							code: "FORBIDDEN",
							message: "Cannot demote the last instance administrator",
						});
					}
				}

				const result = await ctx.pool.query(sql.type(userRowParser)`
					UPDATE users
					SET instance_role = ${input.instanceRole}
					WHERE id = ${input.userId}
					RETURNING
						id, email, name, display_name, password_hash,
						instance_role, email_verified_at, created_at, updated_at
				`);

				if (result.rows.length === 0) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "User not found",
					});
				}

				const row: any = result.rows[0];
				return {
					id: row.id,
					email: row.email,
					name: row.name,
					displayName: row.displayName || row.display_name,
					instanceRole: row.instanceRole || row.instance_role,
					emailVerified: (row.emailVerifiedAt ?? row.email_verified_at) !== null,
				};
			}),
	}),

	/**
	 * List all teams in the instance
	 */
	teams: router({
		listAll: adminProcedure.query(async ({ ctx }) => {
			const result = await ctx.pool.query(sql.unsafe`
				SELECT
					t.id,
					t.name,
					t.slug,
					t.created_at,
					t.updated_at,
					COUNT(tm.id)::INTEGER as member_count
				FROM teams t
				LEFT JOIN team_memberships tm ON t.id = tm.team_id
				GROUP BY t.id, t.name, t.slug, t.created_at, t.updated_at
				ORDER BY t.name ASC
			`);

			return result.rows.map((row: any) => ({
				id: row.id,
				name: row.name,
				slug: row.slug,
				memberCount: row.member_count,
				createdAt: new Date(row.created_at),
				updatedAt: new Date(row.updated_at),
			}));
		}),
	}),

	/**
	 * Get instance statistics
	 */
	stats: adminProcedure.query(async ({ ctx }) => {
		const [userCount, teamCount, clientCount] = await Promise.all([
			ctx.pool.query(sql.unsafe`
				SELECT COUNT(*)::INTEGER as count FROM users
			`),
			ctx.pool.query(sql.unsafe`
				SELECT COUNT(*)::INTEGER as count FROM teams
			`),
			ctx.pool.query(sql.unsafe`
				SELECT COUNT(*)::INTEGER as count FROM clients
			`),
		]);

		return {
			userCount: (userCount.rows[0] as any).count,
			teamCount: (teamCount.rows[0] as any).count,
			clientCount: (clientCount.rows[0] as any).count,
		};
	}),
});
