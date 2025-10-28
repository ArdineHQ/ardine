"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Mail, Phone, Archive } from "lucide-react";
import { useState } from "react";
import { useQuery } from "urql";
import { useAuth, useCanManageTeam, useCanAccessFinancials } from "@/lib/auth-context";
import { gql } from "@/lib/gql";

const LIST_CLIENTS_QUERY = gql(`
  query ListClients($args: ListArgs!) {
    clients(args: $args) {
      nodes {
        id
        name
        email
        phone
        contactName
        defaultHourlyRateCents
        currency
        archivedAt
        createdAt
        updatedAt
      }
      total
      pageInfo {
        hasNextPage
        nextOffset
      }
    }
  }
`);

export default function ClientsPage() {
	const [searchQuery, setSearchQuery] = useState("");
	const { currentTeam } = useAuth();
	const canManageTeam = useCanManageTeam();
	const canAccessFinancials = useCanAccessFinancials();

	const [result, refetchClients] = useQuery({
		query: LIST_CLIENTS_QUERY,
		variables: {
			args: {
				teamId: currentTeam?.id || '',
				search: searchQuery || undefined,
				limit: 50,
				offset: 0,
			},
		},
		pause: !currentTeam?.id,
		requestPolicy: 'cache-and-network',
	});

	const { data, fetching, error } = result;
	const clients = data?.clients.nodes || [];

	const formatCurrency = (cents: number | null, currency: string = 'USD') => {
		if (cents === null) return null;
		const amount = cents / 100;
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: currency,
		}).format(amount);
	};

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-3xl font-bold dark:text-foreground">Clients</h1>
				{canManageTeam && (
					<Link href="/clients/new">
						<Button>
							<Plus className="w-4 h-4 mr-2" />
							New Client
						</Button>
					</Link>
				)}
			</div>

			{/* Search bar */}
			<div className="mb-6">
				<div className="relative">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground dark:text-muted-foreground w-4 h-4" />
					<input
						type="text"
						placeholder="Search clients by name, email, or contact..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="w-full pl-10 pr-4 py-2 border dark:border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-ring placeholder:text-muted-foreground dark:placeholder:text-muted-foreground bg-background dark:bg-background text-foreground dark:text-foreground"
					/>
				</div>
			</div>

			{/* Error state */}
			{error && (
				<div className="border border-red-500 rounded-lg p-4 bg-red-50 dark:bg-red-900/20 mb-6">
					<p className="text-red-700 dark:text-red-400">Error loading clients: {error.message}</p>
				</div>
			)}

			{/* Loading state */}
			{fetching && (
				<div className="border dark:border-border rounded-lg p-12 text-center bg-card dark:bg-card">
					<p className="text-muted-foreground dark:text-muted-foreground">Loading clients...</p>
				</div>
			)}

			{/* Empty state */}
			{!fetching && !error && clients.length === 0 && (
				<div className="border dark:border-border rounded-lg p-12 text-center bg-card dark:bg-card">
					<p className="text-muted-foreground dark:text-muted-foreground mb-4">
						{searchQuery ? 'No clients found matching your search' : 'No clients yet'}
					</p>
                    {canManageTeam && (
					<Link href="/clients/new">
						<Button>
							<Plus className="w-4 h-4 mr-2" />
							Add Your First Client
						</Button>
					</Link>
                        )}
				</div>
			)}

			{/* Clients table */}
			{!fetching && clients.length > 0 && (
				<div className="border dark:border-border rounded-lg overflow-hidden bg-card dark:bg-card">
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead className="bg-muted/50 dark:bg-muted/50 border-b dark:border-border">
								<tr>
									<th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Client</th>
									<th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Contact</th>
									<th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Email</th>
									<th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Phone</th>
									{canAccessFinancials && (
										<th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Default Rate</th>
									)}
								</tr>
							</thead>
							<tbody className="divide-y divide-border dark:divide-border">
								{clients.map((client: any) => (
									<tr key={client.id} className="hover:bg-muted/30 dark:hover:bg-muted/30 transition-colors">
										<td className="py-4 px-4">
											<Link href={`/clients/${client.id}`} className="group">
												<div className="flex items-center gap-2">
													<h3 className="font-semibold text-foreground dark:text-foreground group-hover:text-primary transition-colors">
														{client.name}
													</h3>
													{client.archivedAt && (
														<Badge variant="outline" className="text-xs flex items-center gap-1">
															<Archive className="w-3 h-3" />
															Archived
														</Badge>
													)}
												</div>
											</Link>
										</td>
										<td className="py-4 px-4">
											{client.contactName ? (
												<span className="text-sm text-foreground dark:text-foreground">
													{client.contactName}
												</span>
											) : (
												<span className="text-sm text-muted-foreground">-</span>
											)}
										</td>
										<td className="py-4 px-4">
											{client.email ? (
												<div className="flex items-center gap-1 text-sm text-foreground dark:text-foreground">
													<Mail className="w-3 h-3 text-muted-foreground" />
													<span>{client.email}</span>
												</div>
											) : (
												<span className="text-sm text-muted-foreground">-</span>
											)}
										</td>
										<td className="py-4 px-4">
											{client.phone ? (
												<div className="flex items-center gap-1 text-sm text-foreground dark:text-foreground">
													<Phone className="w-3 h-3 text-muted-foreground" />
													<span>{client.phone}</span>
												</div>
											) : (
												<span className="text-sm text-muted-foreground">-</span>
											)}
										</td>
										{canAccessFinancials && (
											<td className="py-4 px-4">
												{client.defaultHourlyRateCents ? (
													<span className="text-sm text-foreground dark:text-foreground">
														{formatCurrency(client.defaultHourlyRateCents, client.currency || 'USD')}/hr
													</span>
												) : (
													<span className="text-sm text-muted-foreground">-</span>
												)}
											</td>
										)}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{/* Pagination info */}
			{!fetching && data && data.clients.total > 0 && (
				<div className="mt-6 text-center text-sm text-muted-foreground dark:text-muted-foreground">
					Showing {clients.length} of {data.clients.total} clients
				</div>
			)}
		</div>
	);
}
