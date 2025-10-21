import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@ardine/ui";
import { trpc } from "@/integrations/trpc/react";
import { useState, useEffect } from "react";
import { Search } from "lucide-react";

export const Route = createFileRoute("/clients")({
	component: ClientsPage,
});

function ClientsPage() {
	const [searchQuery, setSearchQuery] = useState("");
	const [debouncedQuery, setDebouncedQuery] = useState("");

	// Debounce search with useEffect
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedQuery(searchQuery);
		}, 300);

		return () => clearTimeout(timer);
	}, [searchQuery]);

	console.log("[ClientsPage] Rendering, about to call useQuery");
	const { data, isLoading, error } = trpc.clients.list.useQuery({
		q: debouncedQuery || undefined,
		limit: 20,
		includeArchived: false,
	});
	console.log("[ClientsPage] Query result:", { data, isLoading, error });

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-3xl font-bold">Clients</h1>
				<Link to="/clients/new">
					<Button>New Client</Button>
				</Link>
			</div>

			{/* Search bar */}
			<div className="mb-6">
				<div className="relative">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
					<input
						type="text"
						placeholder="Search clients by name, email, or contact..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
					/>
				</div>
			</div>

			{/* Loading state */}
			{isLoading && (
				<div className="text-center py-12 text-muted-foreground">
					Loading clients...
				</div>
			)}

			{/* Error state */}
			{error && (
				<div className="border border-destructive rounded-lg p-4 text-destructive">
					Error loading clients: {error.message}
				</div>
			)}

			{/* Empty state */}
			{!isLoading && !error && data?.items.length === 0 && !debouncedQuery && (
				<div className="border rounded-lg p-12 text-center">
					<p className="text-muted-foreground mb-4">No clients yet</p>
					<Link to="/clients/new">
						<Button>Add Your First Client</Button>
					</Link>
				</div>
			)}

			{/* No search results */}
			{!isLoading && !error && data?.items.length === 0 && debouncedQuery && (
				<div className="border rounded-lg p-12 text-center">
					<p className="text-muted-foreground">
						No clients found matching "{debouncedQuery}"
					</p>
				</div>
			)}

			{/* Clients table */}
			{!isLoading && !error && data && data.items.length > 0 && (
				<div className="border rounded-lg overflow-hidden">
					<table className="w-full">
						<thead className="bg-muted">
							<tr>
								<th className="px-4 py-3 text-left text-sm font-medium">Name</th>
								<th className="px-4 py-3 text-left text-sm font-medium">
									Contact
								</th>
								<th className="px-4 py-3 text-left text-sm font-medium">Email</th>
								<th className="px-4 py-3 text-left text-sm font-medium">Phone</th>
								<th className="px-4 py-3 text-left text-sm font-medium">Status</th>
							</tr>
						</thead>
						<tbody className="divide-y">
							{data.items.map((rawClient) => {
							// Normalize data to handle both snake_case and camelCase
							const client = {
								id: rawClient.id,
								name: rawClient.name,
								contactName: (rawClient as any).contactName || (rawClient as any).contact_name,
								email: rawClient.email,
								phone: rawClient.phone,
								archivedAt: (rawClient as any).archivedAt || (rawClient as any).archived_at,
							};

							return (
								<tr
									key={client.id}
									className="hover:bg-muted/50 transition-colors cursor-pointer"
									onClick={() => {
										window.location.href = `/clients/${client.id}`;
									}}
								>
									<td className="px-4 py-3 font-medium">{client.name}</td>
									<td className="px-4 py-3 text-sm text-muted-foreground">
										{client.contactName || "-"}
									</td>
									<td className="px-4 py-3 text-sm text-muted-foreground">
										{client.email || "-"}
									</td>
									<td className="px-4 py-3 text-sm text-muted-foreground">
										{client.phone || "-"}
									</td>
									<td className="px-4 py-3 text-sm">
										{client.archivedAt ? (
											<span className="text-muted-foreground">Archived</span>
										) : (
											<span className="text-green-600">Active</span>
										)}
									</td>
								</tr>
							);
						})}
						</tbody>
					</table>

					{/* Pagination indicator */}
					{data.nextCursor && (
						<div className="px-4 py-3 bg-muted/50 text-sm text-muted-foreground text-center">
							More clients available (pagination to be implemented)
						</div>
					)}
				</div>
			)}
		</div>
	);
}
