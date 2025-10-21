import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@ardine/api/src/trpc/router";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const trpcClient = createTRPCClient<AppRouter>({
	links: [
		httpBatchLink({
			url: `${API_URL}/trpc`,
			transformer: superjson,
		}),
	],
});
