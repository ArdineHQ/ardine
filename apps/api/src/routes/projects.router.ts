import { z } from "zod";
import { router, publicProcedure } from "../trpc/init";
import { ProjectsRepository } from "@ardine/db";
import { createProjectSchema, updateProjectSchema } from "@ardine/shared";

export const projectsRouter = router({
	list: publicProcedure.query(async ({ ctx }) => {
		// Mock userId for now - will come from auth later
		const userId = "00000000-0000-0000-0000-000000000000";
		const repo = new ProjectsRepository(ctx.pool);
		return repo.findByUserId(userId);
	}),

	getById: publicProcedure
		.input(z.object({ id: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const userId = "00000000-0000-0000-0000-000000000000";
			const repo = new ProjectsRepository(ctx.pool);
			return repo.findById(input.id, userId);
		}),

	create: publicProcedure
		.input(createProjectSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = "00000000-0000-0000-0000-000000000000";
			const repo = new ProjectsRepository(ctx.pool);
			return repo.create({ ...input, userId });
		}),
});
