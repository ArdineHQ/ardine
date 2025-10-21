import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@ardine/api/src/trpc/router";

export const trpc = createTRPCReact<AppRouter>();

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const trpcClientOptions = {
	links: [
		httpBatchLink({
			url: `${API_URL}/trpc`,
			transformer: superjson,
		}),
	],
};
