import { z } from "zod";
import { router, publicProcedure } from "../trpc/init";
import {
	createTimeEntrySchema,
	updateTimeEntrySchema,
	stopTimeEntrySchema,
} from "@ardine/shared";

export const timeEntriesRouter = router({
	list: publicProcedure.query(async () => {
		// Stub: return empty array
		return [];
	}),

	active: publicProcedure.query(async () => {
		// Stub: return null (no active timer)
		return null;
	}),

	start: publicProcedure
		.input(createTimeEntrySchema)
		.mutation(async ({ input }) => {
			// Stub: validate input
			return { id: "stub", ...input };
		}),

	stop: publicProcedure
		.input(z.object({ id: z.string().uuid() }).merge(stopTimeEntrySchema))
		.mutation(async ({ input }) => {
			// Stub: validate input
			return { id: input.id, stopped: true };
		}),
});
