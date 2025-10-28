'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from 'urql';
import { gql } from '@/lib/gql';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Mail, Phone, MapPin, DollarSign, FileText } from 'lucide-react';
import Link from 'next/link';
import { useCanManageTeam, useCanAccessFinancials } from '@/lib/auth-context';

const GET_CLIENT_QUERY = gql(`
  query GetClient($id: ID!, $teamId: ID) {
    client(id: $id, teamId: $teamId) {
      id
      name
      email
      phone
      contactName
      billingAddress
      taxId
      defaultHourlyRateCents
      currency
      notes
      archivedAt
      createdAt
      updatedAt

      projects(limit: 10, order: desc) {
        nodes {
          id
          name
          status
          code
          color
          createdAt
        }
        total
        pageInfo {
          hasNextPage
        }
      }

      invoices(limit: 5, order: desc) {
        nodes {
          id
          invoiceNumber
          status
          issuedDate
          dueDate
          totalCents
        }
        total
      }
    }
  }
`);

export default function ClientDetailPage() {
	const params = useParams();
	const router = useRouter();
	const clientId = params.clientId as string;
	const canManageTeam = useCanManageTeam();
	const canAccessFinancials = useCanAccessFinancials();

	const [result] = useQuery({
		query: GET_CLIENT_QUERY,
		variables: { id: clientId, teamId: undefined },
	});

	const { data, fetching, error } = result;
	const client = data?.client;

	const formatCurrency = (cents: number | null, currency: string = 'USD') => {
		if (cents === null) return null;
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: currency,
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
			case 'active':
				return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
			case 'on_hold':
				return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
			case 'completed':
				return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
			case 'archived':
				return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
			default:
				return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
		}
	};

	const getInvoiceStatusColor = (status: string) => {
		switch (status) {
			case 'draft':
				return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
			case 'sent':
				return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
			case 'paid':
				return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
			case 'cancelled':
				return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
			default:
				return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
		}
	};

	if (fetching) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<p className="text-muted-foreground">Loading client...</p>
			</div>
		);
	}

	if (error || !client) {
		return (
			<div>
				<Link
					href="/clients"
					className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
				>
					<ArrowLeft className="w-4 h-4 mr-2" />
					Back to Clients
				</Link>
				<div className="border border-red-500 rounded-lg p-4 bg-red-50 dark:bg-red-900/20">
					<p className="text-red-700 dark:text-red-400">{error ? error.message : 'Client not found'}</p>
				</div>
			</div>
		);
	}

	const billingAddress = client.billingAddress as any;

	return (
		<div>
			<div className="mb-6">
				<Link
					href="/clients"
					className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
				>
					<ArrowLeft className="w-4 h-4 mr-2" />
					Back to Clients
				</Link>

				<div className="flex items-start justify-between">
					<div className="flex-1">
						<div className="flex items-center gap-3 mb-2">
							<h1 className="text-3xl font-bold dark:text-foreground">{client.name}</h1>
							{client.archivedAt && (
								<Badge variant="outline" className="text-sm">
									Archived
								</Badge>
							)}
						</div>

						{client.contactName && (
							<p className="text-lg text-muted-foreground mb-2">Contact: {client.contactName}</p>
						)}
					</div>

					{canManageTeam && (
						<Button onClick={() => router.push(`/clients/${clientId}/edit`)}>Edit Client</Button>
					)}
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
				{/* Contact Information */}
				<div className="border dark:border-border rounded-lg p-6 bg-card dark:bg-card">
					<h2 className="text-lg font-semibold mb-4 dark:text-card-foreground">Contact Information</h2>
					<div className="space-y-3">
						{client.email && (
							<div className="flex items-center gap-3">
								<Mail className="w-4 h-4 text-muted-foreground" />
								<a
									href={`mailto:${client.email}`}
									className="text-primary hover:underline"
								>
									{client.email}
								</a>
							</div>
						)}
						{client.phone && (
							<div className="flex items-center gap-3">
								<Phone className="w-4 h-4 text-muted-foreground" />
								<a href={`tel:${client.phone}`} className="text-primary hover:underline">
									{client.phone}
								</a>
							</div>
						)}
						{billingAddress && (billingAddress.street || billingAddress.city) && (
							<div className="flex items-start gap-3">
								<MapPin className="w-4 h-4 text-muted-foreground mt-1" />
								<div className="text-sm">
									{billingAddress.street && <p>{billingAddress.street}</p>}
									{(billingAddress.city || billingAddress.state || billingAddress.postalCode) && (
										<p>
											{[billingAddress.city, billingAddress.state, billingAddress.postalCode]
												.filter(Boolean)
												.join(', ')}
										</p>
									)}
									{billingAddress.country && <p>{billingAddress.country}</p>}
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Billing Information */}
				{canAccessFinancials && (
					<div className="border dark:border-border rounded-lg p-6 bg-card dark:bg-card">
						<h2 className="text-lg font-semibold mb-4 dark:text-card-foreground">Billing Information</h2>
						<div className="space-y-3">
							{client.defaultHourlyRateCents && (
								<div className="flex items-center gap-3">
									<DollarSign className="w-4 h-4 text-muted-foreground" />
									<div>
										<p className="text-sm text-muted-foreground">Default Hourly Rate</p>
										<p className="font-semibold">
											{formatCurrency(client.defaultHourlyRateCents, client.currency || 'USD')}/hour
										</p>
									</div>
								</div>
							)}
							{client.currency && (
								<div className="flex items-center gap-3">
									<div className="w-4 h-4" /> {/* Spacer */}
									<div>
										<p className="text-sm text-muted-foreground">Currency</p>
										<p className="font-semibold">{client.currency}</p>
									</div>
								</div>
							)}
							{client.taxId && (
								<div className="flex items-center gap-3">
									<FileText className="w-4 h-4 text-muted-foreground" />
									<div>
										<p className="text-sm text-muted-foreground">Tax ID</p>
										<p className="font-semibold">{client.taxId}</p>
									</div>
								</div>
							)}
						</div>
					</div>
				)}
			</div>

			{/* Notes */}
			{client.notes && (
				<div className="border dark:border-border rounded-lg p-6 bg-card dark:bg-card mb-6">
					<h2 className="text-lg font-semibold mb-3 dark:text-card-foreground">Notes</h2>
					<p className="text-muted-foreground whitespace-pre-wrap">{client.notes}</p>
				</div>
			)}

			{/* Projects Section */}
			<div className="border dark:border-border rounded-lg bg-card dark:bg-card mb-6">
				<div className="p-6 border-b dark:border-border">
					<div className="flex items-center justify-between">
						<h2 className="text-xl font-semibold dark:text-card-foreground">
							Projects ({client.projects.total})
						</h2>
						{canManageTeam && (
							<Link href={`/projects/new?clientId=${clientId}`}>
								<Button size="sm">New Project</Button>
							</Link>
						)}
					</div>
				</div>

				<div className="divide-y divide-border dark:divide-border">
					{client.projects.nodes.length === 0 ? (
						<div className="p-12 text-center">
							<p className="text-muted-foreground mb-4">No projects yet</p>
							{canManageTeam && (
								<Link href={`/projects/new?clientId=${clientId}`}>
									<Button size="sm">Create First Project</Button>
								</Link>
							)}
						</div>
					) : (
						client.projects.nodes.map((project: any) => (
							<Link
								key={project.id}
								href={`/projects/${project.id}`}
								className="block p-6 hover:bg-muted/30 dark:hover:bg-muted/30"
							>
								<div className="flex items-center gap-3">
									{project.color && (
										<div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} />
									)}
									<h3 className="font-semibold text-foreground dark:text-foreground">{project.name}</h3>
									{project.code && (
										<Badge variant="outline" className="text-xs">
											{project.code}
										</Badge>
									)}
									<span
										className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}
									>
										{project.status.replace('_', ' ')}
									</span>
								</div>
							</Link>
						))
					)}
				</div>

				{client.projects.pageInfo.hasNextPage && (
					<div className="p-4 border-t dark:border-border text-center">
						<Link href={`/projects?client=${clientId}`} className="text-sm text-primary hover:underline">
							View all {client.projects.total} projects
						</Link>
					</div>
				)}
			</div>

			{/* Invoices Section */}
			{canAccessFinancials && (
				<div className="border dark:border-border rounded-lg bg-card dark:bg-card">
					<div className="p-6 border-b dark:border-border">
						<div className="flex items-center justify-between">
							<h2 className="text-xl font-semibold dark:text-card-foreground">
								Recent Invoices ({client.invoices.total})
							</h2>
							<Link href={`/invoices/new?clientId=${clientId}`}>
								<Button size="sm">New Invoice</Button>
							</Link>
						</div>
					</div>

					<div className="divide-y divide-border dark:divide-border">
						{client.invoices.nodes.length === 0 ? (
							<div className="p-12 text-center">
								<p className="text-muted-foreground mb-4">No invoices yet</p>
								<Link href={`/invoices/new?clientId=${clientId}`}>
									<Button size="sm">Create First Invoice</Button>
								</Link>
							</div>
						) : (
							client.invoices.nodes.map((invoice: any) => (
								<Link
									key={invoice.id}
									href={`/invoices/${invoice.id}`}
									className="block p-6 hover:bg-muted/30 dark:hover:bg-muted/30"
								>
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-3">
											<p className="font-semibold text-foreground dark:text-foreground">
												{invoice.invoiceNumber}
											</p>
											<span
												className={`px-2 py-0.5 rounded-full text-xs font-medium ${getInvoiceStatusColor(invoice.status)}`}
											>
												{invoice.status}
											</span>
										</div>
										<div className="text-right">
											<p className="font-semibold text-foreground dark:text-foreground">
												{formatCurrency(invoice.totalCents)}
											</p>
											<p className="text-xs text-muted-foreground">
												Due: {formatDate(invoice.dueDate)}
											</p>
										</div>
									</div>
								</Link>
							))
						)}
					</div>

					{client.invoices.total > 5 && (
						<div className="p-4 border-t dark:border-border text-center">
							<Link href={`/invoices?client=${clientId}`} className="text-sm text-primary hover:underline">
								View all {client.invoices.total} invoices
							</Link>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
