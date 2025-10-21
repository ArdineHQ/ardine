import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@ardine/api/src/trpc/router";

export const trpc = createTRPCReact<AppRouter>();

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Get active team ID from localStorage
function getActiveTeamId(): string | null {
	try {
		return localStorage.getItem("ardine_active_team_id");
	} catch {
		return null;
	}
}

export const trpcClientOptions = {
	links: [
		httpBatchLink({
			url: `${API_URL}/trpc`,
			transformer: superjson,
			fetch(url, options) {
				const headers = new Headers(options?.headers);
				headers.set("credentials", "include");

				// Add active team header if available
				const activeTeamId = getActiveTeamId();
				if (activeTeamId) {
					headers.set("x-ardine-team", activeTeamId);
				}

				return fetch(url, {
					...options,
					credentials: "include",
					headers,
				});
			},
		}),
	],
};
