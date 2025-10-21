import { router, publicProcedure } from "../trpc/init";

export const healthRouter = router({
	check: publicProcedure.query(() => {
		return {
			status: "ok",
			timestamp: new Date(),
		};
	}),
});
