import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router } from "../trpc/init";
import { teamMemberProcedure } from "../middleware/rbac";
import {
	createClientSchema,
	updateClientSchema,
	clientListQuerySchema,
	projectListQuerySchema,
	invoiceListQuerySchema,
} from "@ardine/shared";
import {
	ClientsRepository,
	ProjectsRepository,
	InvoicesRepository,
} from "@ardine/db";

export const clientsRouter = router({
	/**
	 * List clients with search and pagination (team-scoped)
	 */
	list: teamMemberProcedure
		.input(clientListQuerySchema)
		.query(async ({ ctx, input }) => {
			const repo = new ClientsRepository(ctx.pool);
			return await repo.list(ctx.activeTeamId, input);
		}),

	/**
	 * Get client by ID (team-scoped)
	 */
	getById: teamMemberProcedure
		.input(z.object({ id: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const repo = new ClientsRepository(ctx.pool);
			const client = await repo.findById(input.id, ctx.activeTeamId);

			if (!client) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Client not found",
				});
			}

			return client;
		}),

	/**
	 * Create a new client (team-scoped)
	 */
	create: teamMemberProcedure
		.input(createClientSchema)
		.mutation(async ({ ctx, input }) => {
			const repo = new ClientsRepository(ctx.pool);

			try {
				return await repo.create(ctx.activeTeamId, input);
			} catch (error: any) {
				if (error.code === "CLIENT_NAME_TAKEN") {
					throw new TRPCError({
						code: "CONFLICT",
						message: error.message,
					});
				}
				throw error;
			}
		}),

	/**
	 * Update an existing client (team-scoped)
	 */
	update: teamMemberProcedure
		.input(updateClientSchema)
		.mutation(async ({ ctx, input }) => {
			const { id, ...data } = input;
			const repo = new ClientsRepository(ctx.pool);

			try {
				return await repo.update(id, ctx.activeTeamId, data);
			} catch (error: any) {
				if (error.code === "CLIENT_NAME_TAKEN") {
					throw new TRPCError({
						code: "CONFLICT",
						message: error.message,
					});
				}
				if (error.message === "Client not found") {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Client not found",
					});
				}
				throw error;
			}
		}),

	/**
	 * Archive a client (soft delete, team-scoped)
	 */
	archive: teamMemberProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const repo = new ClientsRepository(ctx.pool);

			try {
				return await repo.archive(input.id, ctx.activeTeamId);
			} catch (error: any) {
				if (error.message === "Client not found") {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Client not found",
					});
				}
				throw error;
			}
		}),

	/**
	 * Unarchive a client (team-scoped)
	 */
	unarchive: teamMemberProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const repo = new ClientsRepository(ctx.pool);

			try {
				return await repo.unarchive(input.id, ctx.activeTeamId);
			} catch (error: any) {
				if (error.message === "Client not found") {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Client not found",
					});
				}
				throw error;
			}
		}),

	/**
	 * Get client summary with counts (team-scoped)
	 */
	summary: teamMemberProcedure
		.input(z.object({ id: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const repo = new ClientsRepository(ctx.pool);

			try {
				return await repo.getSummary(input.id, ctx.activeTeamId);
			} catch (error: any) {
				if (error.message === "Client not found") {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Client not found",
					});
				}
				throw error;
			}
		}),

	/**
	 * Get projects related to a client (team-scoped, paginated)
	 */
	relatedProjects: teamMemberProcedure
		.input(
			z.object({
				clientId: z.string().uuid(),
				q: z.string().max(120).optional(),
				status: z.enum(["active", "archived", "all"]).default("all"),
				limit: z.number().int().min(1).max(100).default(20),
				cursor: z.string().uuid().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const { clientId, ...query } = input;
			const repo = new ProjectsRepository(ctx.pool);

			// Verify client exists and belongs to team
			const clientsRepo = new ClientsRepository(ctx.pool);
			const client = await clientsRepo.findById(clientId, ctx.activeTeamId);

			if (!client) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Client not found",
				});
			}

			return await repo.list(ctx.activeTeamId, {
				...query,
				clientId,
			});
		}),

	/**
	 * Get invoices related to a client (team-scoped, paginated)
	 */
	relatedInvoices: teamMemberProcedure
		.input(
			z.object({
				clientId: z.string().uuid(),
				q: z.string().max(120).optional(),
				status: z.enum(["all", "draft", "sent", "paid", "overdue"]).default("all"),
				limit: z.number().int().min(1).max(100).default(20),
				cursor: z.string().uuid().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const { clientId, ...query } = input;
			const repo = new InvoicesRepository(ctx.pool);

			// Verify client exists and belongs to team
			const clientsRepo = new ClientsRepository(ctx.pool);
			const client = await clientsRepo.findById(clientId, ctx.activeTeamId);

			if (!client) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Client not found",
				});
			}

			return await repo.list(ctx.activeTeamId, {
				...query,
				clientId,
			});
		}),
});
