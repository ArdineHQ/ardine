import { z } from "zod";
import { router, publicProcedure } from "../trpc/init";
import { createInvoiceSchema, updateInvoiceSchema } from "@ardine/shared";

export const invoicesRouter = router({
	list: publicProcedure.query(async () => {
		// Stub: return empty array
		return [];
	}),

	getById: publicProcedure
		.input(z.object({ id: z.string().uuid() }))
		.query(async ({ input }) => {
			// Stub: return null
			return null;
		}),

	create: publicProcedure
		.input(createInvoiceSchema)
		.mutation(async ({ input }) => {
			// Stub: validate input
			return { id: "stub", ...input };
		}),
});
