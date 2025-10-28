"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "urql";
import { useAuth, useCanAccessInvoices } from "@/lib/auth-context";
import { gql } from "@/lib/gql";
import { useRouter } from "next/navigation";

const LIST_INVOICES_QUERY = gql(`
  query ListInvoices(
    $teamId: ID!
    $clientId: ID
    $status: String
    $from: DateTime
    $to: DateTime
    $offset: Int = 0
    $limit: Int = 25
    $orderBy: String
    $order: String = "desc"
  ) {
    invoices(
      teamId: $teamId
      clientId: $clientId
      status: $status
      from: $from
      to: $to
      offset: $offset
      limit: $limit
      orderBy: $orderBy
      order: $order
    ) {
      nodes {
        id
        invoiceNumber
        status
        issuedDate
        dueDate
        subtotalCents
        taxAmountCents
        totalCents
        client {
          id
          name
        }
        createdAt
      }
      total
      pageInfo {
        hasNextPage
        nextOffset
      }
    }
  }
`);

type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'cancelled';

export default function InvoicesPage() {
	const [statusFilter, setStatusFilter] = useState<InvoiceStatus | undefined>();
	const { currentTeam } = useAuth();
	const canAccessInvoices = useCanAccessInvoices();
	const router = useRouter();

	// Redirect if user doesn't have access to invoices
	useEffect(() => {
		if (currentTeam && !canAccessInvoices) {
			router.push('/dashboard');
		}
	}, [currentTeam, canAccessInvoices, router]);

	// Don't render if user doesn't have access
	if (!canAccessInvoices) {
		return null;
	}

	const [result, refetchInvoices] = useQuery({
		query: LIST_INVOICES_QUERY,
		variables: {
			teamId: currentTeam?.id || '',
			status: statusFilter,
			limit: 50,
			offset: 0,
		},
		pause: !currentTeam?.id,
		requestPolicy: 'cache-and-network',
	});

	const { data, fetching, error } = result;
	const invoices = data?.invoices.nodes || [];

	// Refetch when page becomes visible (user navigates back)
	useEffect(() => {
		const handleVisibilityChange = () => {
			if (document.visibilityState === 'visible') {
				refetchInvoices({ requestPolicy: 'network-only' });
			}
		};

		document.addEventListener('visibilitychange', handleVisibilityChange);

		// Also refetch on mount
		refetchInvoices({ requestPolicy: 'network-only' });

		return () => {
			document.removeEventListener('visibilitychange', handleVisibilityChange);
		};
	}, [refetchInvoices]);

	const formatCurrency = (cents: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
		}).format(cents / 100);
	};

	const formatDate = (date: string) => {
		return new Date(date).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		});
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
			case 'sent': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
			case 'paid': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
			case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
			default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
		}
	};

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-3xl font-bold dark:text-foreground">Invoices</h1>
				<Link href="/invoices/new">
					<Button>
						<Plus className="w-4 h-4 mr-2" />
						New Invoice
					</Button>
				</Link>
			</div>

			{/* Status filter */}
			<div className="mb-6 flex gap-2">
				<Button
					variant={statusFilter === undefined ? 'default' : 'outline'}
					size="sm"
					onClick={() => setStatusFilter(undefined)}
				>
					All
				</Button>
				<Button
					variant={statusFilter === 'draft' ? 'default' : 'outline'}
					size="sm"
					onClick={() => setStatusFilter('draft')}
				>
					Draft
				</Button>
				<Button
					variant={statusFilter === 'sent' ? 'default' : 'outline'}
					size="sm"
					onClick={() => setStatusFilter('sent')}
				>
					Sent
				</Button>
				<Button
					variant={statusFilter === 'paid' ? 'default' : 'outline'}
					size="sm"
					onClick={() => setStatusFilter('paid')}
				>
					Paid
				</Button>
				<Button
					variant={statusFilter === 'cancelled' ? 'default' : 'outline'}
					size="sm"
					onClick={() => setStatusFilter('cancelled')}
				>
					Cancelled
				</Button>
			</div>

			{/* Error state */}
			{error && (
				<div className="border border-red-500 rounded-lg p-4 bg-red-50 dark:bg-red-900/20 mb-6">
					<p className="text-red-700 dark:text-red-400">Error loading invoices: {error.message}</p>
				</div>
			)}

			{/* Loading state */}
			{fetching && (
				<div className="border dark:border-border rounded-lg p-12 text-center bg-card dark:bg-card">
					<p className="text-muted-foreground dark:text-muted-foreground">Loading invoices...</p>
				</div>
			)}

			{/* Empty state */}
			{!fetching && !error && invoices.length === 0 && (
				<div className="border dark:border-border rounded-lg p-12 text-center bg-card dark:bg-card">
					<p className="text-muted-foreground dark:text-muted-foreground mb-4">
						{statusFilter ? `No ${statusFilter} invoices` : 'No invoices yet'}
					</p>
					<Link href="/invoices/new">
						<Button>
							<Plus className="w-4 h-4 mr-2" />
							Create Your First Invoice
						</Button>
					</Link>
				</div>
			)}

			{/* Invoices table */}
			{!fetching && invoices.length > 0 && (
				<div className="border dark:border-border rounded-lg overflow-hidden bg-card dark:bg-card">
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead className="bg-muted/50 dark:bg-muted/50 border-b dark:border-border">
								<tr>
									<th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
										Invoice #
									</th>
									<th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
										Client
									</th>
									<th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
										Status
									</th>
									<th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
										Issued
									</th>
									<th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
										Due
									</th>
									<th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">
										Amount
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border dark:divide-border">
								{invoices.map((invoice: any) => (
									<tr key={invoice.id} className="hover:bg-muted/30 dark:hover:bg-muted/30 transition-colors">
										<td className="py-4 px-4 whitespace-nowrap">
										<Link
											href={`/invoices/${invoice.id}`}
											className="text-sm font-medium text-primary hover:underline"
										>
											{invoice.invoiceNumber}
										</Link>
									</td>
									<td className="py-4 px-4 whitespace-nowrap">
										<div className="text-sm text-foreground dark:text-foreground">
											{invoice.client.name}
										</div>
									</td>
									<td className="py-4 px-4 whitespace-nowrap">
										<span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
											{invoice.status}
										</span>
									</td>
									<td className="py-4 px-4 whitespace-nowrap text-sm text-muted-foreground dark:text-muted-foreground">
										{formatDate(invoice.issuedDate)}
									</td>
									<td className="py-4 px-4 whitespace-nowrap text-sm text-muted-foreground dark:text-muted-foreground">
										{formatDate(invoice.dueDate)}
									</td>
									<td className="py-4 px-4 whitespace-nowrap text-sm text-right font-semibold text-foreground dark:text-foreground">
										{formatCurrency(invoice.totalCents)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
					</div>
				</div>
			)}

			{/* Pagination info */}
			{!fetching && data && data.invoices.total > 0 && (
				<div className="mt-6 text-center text-sm text-muted-foreground dark:text-muted-foreground">
					Showing {invoices.length} of {data.invoices.total} invoices
				</div>
			)}
		</div>
	);
}
