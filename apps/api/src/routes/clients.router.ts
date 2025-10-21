import { z } from "zod";
import { router, publicProcedure } from "../trpc/init";
import { createClientSchema, updateClientSchema } from "@ardine/shared";

export const clientsRouter = router({
	list: publicProcedure.query(async () => {
		// Stub: return empty array for now
		return [];
	}),

	getById: publicProcedure
		.input(z.object({ id: z.string().uuid() }))
		.query(async ({ input }) => {
			// Stub: return null for now
			return null;
		}),

	create: publicProcedure
		.input(createClientSchema)
		.mutation(async ({ input }) => {
			// Stub: just validate input for now
			return { id: "stub", ...input };
		}),
});
