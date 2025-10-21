import { TRPCError } from "@trpc/server";
import type { Context } from "../context";
import {
	isInstanceAdmin,
	isAtLeastTeamRole,
	type TeamRole,
} from "@ardine/shared";
import { middleware, publicProcedure } from "../trpc/init";

/**
 * Middleware that ensures the user is authenticated
 */
export const isAuthenticated = middleware(async ({ ctx, next }) => {
	if (!ctx.sessionUser) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "You must be logged in to perform this action",
		});
	}

	return next({
		ctx: {
			...ctx,
			sessionUser: ctx.sessionUser, // Narrow the type to non-null
		},
	});
});

/**
 * Middleware that ensures the user has instance admin privileges
 */
export const isAdmin = middleware(async ({ ctx, next }) => {
	if (!ctx.sessionUser) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "You must be logged in to perform this action",
		});
	}

	if (!isInstanceAdmin(ctx.sessionUser.instanceRole)) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "You must be an instance administrator to perform this action",
		});
	}

	return next({
		ctx: {
			...ctx,
			sessionUser: ctx.sessionUser,
		},
	});
});

/**
 * Middleware that ensures the user is a member of a team
 */
export const isTeamMember = middleware(async ({ ctx, next }) => {
	if (!ctx.sessionUser) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "You must be logged in to perform this action",
		});
	}

	if (!ctx.activeTeamId || !ctx.teamRole) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "You must be a member of a team to perform this action",
		});
	}

	return next({
		ctx: {
			...ctx,
			sessionUser: ctx.sessionUser,
			activeTeamId: ctx.activeTeamId,
			teamRole: ctx.teamRole,
		},
	});
});

/**
 * Middleware that ensures the user is at least a team admin
 */
export const isTeamAdmin = middleware(async ({ ctx, next }) => {
	if (!ctx.sessionUser) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "You must be logged in to perform this action",
		});
	}

	if (!ctx.activeTeamId || !ctx.teamRole) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "You must be a member of a team to perform this action",
		});
	}

	if (!isAtLeastTeamRole(ctx.teamRole, "ADMIN")) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "You must be a team administrator to perform this action",
		});
	}

	return next({
		ctx: {
			...ctx,
			sessionUser: ctx.sessionUser,
			activeTeamId: ctx.activeTeamId,
			teamRole: ctx.teamRole,
		},
	});
});

/**
 * Helper to ensure a user has at least a specific team role
 */
export function requireTeamRole(ctx: Context, minRole: TeamRole): void {
	if (!ctx.sessionUser) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "You must be logged in to perform this action",
		});
	}

	if (!ctx.activeTeamId || !ctx.teamRole) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "You must be a member of a team to perform this action",
		});
	}

	if (!isAtLeastTeamRole(ctx.teamRole, minRole)) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: `You must have at least ${minRole} role to perform this action`,
		});
	}
}

/**
 * Helper to ensure team ID matches the active team
 */
export function assertTeamScope(ctx: Context, teamId: string): void {
	if (!ctx.activeTeamId) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "No active team selected",
		});
	}

	if (teamId !== ctx.activeTeamId) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "You can only access resources within your active team",
		});
	}
}

/**
 * Helper to require instance admin
 */
export function requireInstanceAdmin(ctx: Context): void {
	if (!ctx.sessionUser) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "You must be logged in to perform this action",
		});
	}

	if (!isInstanceAdmin(ctx.sessionUser.instanceRole)) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "You must be an instance administrator to perform this action",
		});
	}
}

/**
 * tRPC Procedures with middleware applied
 */

// Protected procedure (requires authentication)
export const protectedProcedure = publicProcedure.use(isAuthenticated);

// Admin procedure (requires instance admin role)
export const adminProcedure = publicProcedure.use(isAdmin);

// Team member procedure (requires team membership)
export const teamMemberProcedure = publicProcedure.use(isTeamMember);

// Team admin procedure (requires team admin role)
export const teamAdminProcedure = publicProcedure.use(isTeamAdmin);
