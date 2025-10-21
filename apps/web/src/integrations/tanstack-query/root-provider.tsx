import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { trpc, trpcClientOptions } from "../trpc/react";
import { TeamProvider } from "@/lib/team-context";
import { useState } from "react";

export function RootProvider({ children }: { children: React.ReactNode }) {
	const [queryClient] = useState(
		() => {
			console.log("[RootProvider] Creating QueryClient");
			return new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: 60 * 1000,
					},
				},
			});
		},
	);

	const [trpcClient] = useState(() => {
		console.log("[RootProvider] Creating tRPC client with options:", trpcClientOptions);
		return trpc.createClient(trpcClientOptions);
	});

	return (
		<trpc.Provider client={trpcClient} queryClient={queryClient}>
			<QueryClientProvider client={queryClient}>
				<TeamProvider>
					{children}
					<ReactQueryDevtools initialIsOpen={false} />
				</TeamProvider>
			</QueryClientProvider>
		</trpc.Provider>
	);
}
