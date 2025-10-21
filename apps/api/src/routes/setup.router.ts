import type { FastifyInstance } from "fastify";
import { getPool, TeamsRepository, TeamMembershipsRepository } from "@ardine/db";
import { sql } from "slonik";
import { userRowParser, teamRowParser } from "@ardine/db";
import { z } from "zod";
import bcrypt from "bcrypt";

/**
 * Setup status response schema
 */
const setupStatusSchema = z.object({
	needsSetup: z.boolean(),
	message: z.string(),
});

/**
 * Setup initialization input schema
 */
const setupInitSchema = z.object({
	email: z.string().email(),
	password: z.string().min(8).max(255),
	name: z.string().min(1).max(255),
	displayName: z.string().min(1).max(120).optional(),
	teamName: z.string().min(2).max(120).optional(),
});

/**
 * Setup routes for initializing the instance
 * Only available when no users exist in the system
 */
export async function setupRouter(fastify: FastifyInstance) {
	/**
	 * GET /setup/status
	 * Check if instance needs initial setup
	 */
	fastify.get("/setup/status", async (request, reply) => {
		try {
			const pool = await getPool();

			// Check if any users exist
			const result = await pool.query(sql.unsafe`
				SELECT COUNT(*)::INTEGER as count FROM users
			`);

			const needsSetup = (result.rows[0] as any).count === 0;

			return {
				needsSetup,
				message: needsSetup
					? "Instance needs initial setup"
					: "Instance already configured",
			};
		} catch (error) {
			fastify.log.error(error);
			return reply.code(500).send({ error: "Failed to check setup status" });
		}
	});

	/**
	 * POST /setup/init
	 * Initialize the instance with first admin user and default team
	 * Only works when no users exist
	 */
	fastify.post<{ Body: z.infer<typeof setupInitSchema> }>(
		"/setup/init",
		{
			schema: {
				body: {
					type: "object",
					required: ["email", "password", "name"],
					properties: {
						email: { type: "string", format: "email" },
						password: { type: "string", minLength: 8 },
						name: { type: "string", minLength: 1 },
						displayName: { type: "string", minLength: 1 },
						teamName: { type: "string", minLength: 2 },
					},
				},
			},
		},
		async (request, reply) => {
			try {
				// Validate input
				const input = setupInitSchema.parse(request.body);

				const pool = await getPool();

				// Check if any users exist
				const userCount = await pool.query(sql.unsafe`
					SELECT COUNT(*)::INTEGER as count FROM users
				`);

				if ((userCount.rows[0] as any).count > 0) {
					return reply.code(403).send({
						error: "Instance already configured",
						message: "Setup can only be run once",
					});
				}

				// Hash password
				const passwordHash = await bcrypt.hash(input.password, 10);

				// Create first admin user
				const userResult = await pool.query(sql.type(userRowParser)`
					INSERT INTO users (
						email,
						name,
						display_name,
						password_hash,
						instance_role,
						email_verified_at
					)
					VALUES (
						${input.email},
						${input.name},
						${input.displayName ?? null},
						${passwordHash},
						'ADMIN',
						NOW()
					)
					RETURNING
						id, email, name, display_name, password_hash,
						instance_role, email_verified_at, created_at, updated_at
				`);

				const user = userResult.rows[0];

				// Create default team
				const teamName = input.teamName || "Default Team";
				const teamsRepo = new TeamsRepository(pool);
				const team = await teamsRepo.create({ name: teamName });

				// Add user as OWNER of the team
				const membershipsRepo = new TeamMembershipsRepository(pool);
				await membershipsRepo.add(team.id, user.id, "OWNER");

				fastify.log.info(
					`Instance initialized: user=${user.email}, team=${team.name}`,
				);

				return {
					success: true,
					message: "Instance initialized successfully",
					user: {
						id: user.id,
						email: user.email,
						name: user.name,
						displayName: user.displayName,
					},
					team: {
						id: team.id,
						name: team.name,
						slug: team.slug,
					},
				};
			} catch (error: any) {
				fastify.log.error(error);

				// Handle validation errors
				if (error instanceof z.ZodError) {
					return reply.code(400).send({
						error: "Validation error",
						details: error.errors,
					});
				}

				// Handle unique constraint violations
				if (error.code === "23505") {
					return reply.code(409).send({
						error: "Email already in use",
						message: "A user with this email already exists",
					});
				}

				return reply.code(500).send({
					error: "Setup failed",
					message: error.message || "An unknown error occurred",
				});
			}
		},
	);
}
