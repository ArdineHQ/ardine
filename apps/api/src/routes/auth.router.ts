import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc/init";
import { protectedProcedure } from "../middleware/rbac";
import { loginSchema, registerSchema } from "@ardine/shared";
import { UsersRepository, SessionsRepository } from "@ardine/db";
import bcrypt from "bcrypt";

/**
 * Auth router - authentication operations
 */
export const authRouter = router({
	/**
	 * Login with email and password
	 */
	login: publicProcedure.input(loginSchema).mutation(async ({ ctx, input }) => {
		const usersRepo = new UsersRepository(ctx.pool);
		const sessionsRepo = new SessionsRepository(ctx.pool);

		// Find user by email (includes password hash for auth)
		const user = await usersRepo.findByEmailForAuth(input.email);

		if (!user) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "Invalid email or password",
			});
		}

		if (!user.passwordHash) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "User account is missing password hash",
			});
		}

		// Verify password
		const isValidPassword = await bcrypt.compare(
			input.password,
			user.passwordHash,
		);

		if (!isValidPassword) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "Invalid email or password",
			});
		}

		// Create session
		const session = await sessionsRepo.create(user.id);

		// Set session cookie
		ctx.res.setCookie("session_id", session.id, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			maxAge: 30 * 24 * 60 * 60, // 30 days
			path: "/",
		});

		return {
			user: {
				id: user.id,
				email: user.email,
				displayName: user.displayName,
				instanceRole: user.instanceRole,
			},
		};
	}),

	/**
	 * Register a new user
	 */
	register: publicProcedure
		.input(registerSchema)
		.mutation(async ({ ctx, input }) => {
			const usersRepo = new UsersRepository(ctx.pool);
			const sessionsRepo = new SessionsRepository(ctx.pool);

			// Check if user already exists
			const existingUser = await usersRepo.findByEmail(input.email);

			if (existingUser) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "User with this email already exists",
				});
			}

			// Hash password
			const passwordHash = await bcrypt.hash(input.password, 10);

			// Create user
			const user = await usersRepo.create({
				email: input.email,
				name: input.name,
				passwordHash,
			});

			// Create session
			const session = await sessionsRepo.create(user.id);

			// Set session cookie
			ctx.res.setCookie("session_id", session.id, {
				httpOnly: true,
				secure: process.env.NODE_ENV === "production",
				sameSite: "lax",
				maxAge: 30 * 24 * 60 * 60, // 30 days
				path: "/",
			});

			return {
				user: {
					id: user.id,
					email: user.email,
					displayName: user.displayName,
					instanceRole: user.instanceRole,
				},
			};
		}),

	/**
	 * Logout (delete session)
	 */
	logout: protectedProcedure.mutation(async ({ ctx }) => {
		const sessionId = ctx.req.cookies.session_id;

		if (sessionId) {
			const sessionsRepo = new SessionsRepository(ctx.pool);
			await sessionsRepo.delete(sessionId);
		}

		// Clear session cookie
		ctx.res.clearCookie("session_id", { path: "/" });

		return { success: true };
	}),

	/**
	 * Get current user
	 */
	me: protectedProcedure.query(async ({ ctx }) => {
		return {
			user: {
				id: ctx.sessionUser.id,
				email: ctx.sessionUser.email,
				displayName: ctx.sessionUser.displayName,
				instanceRole: ctx.sessionUser.instanceRole,
			},
		};
	}),
});
