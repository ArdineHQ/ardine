import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { trpc, trpcClientOptions } from "../trpc/react";
import { useState } from "react";
import superjson from "superjson";

export function RootProvider({ children }: { children: React.ReactNode }) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: 60 * 1000,
					},
				},
			}),
	);

	const [trpcClient] = useState(() => trpc.createClient(trpcClientOptions));

	return (
		<trpc.Provider client={trpcClient} queryClient={queryClient}>
			<QueryClientProvider client={queryClient}>
				{children}
				<ReactQueryDevtools initialIsOpen={false} />
			</QueryClientProvider>
		</trpc.Provider>
	);
}
