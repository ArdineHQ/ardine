import { createFileRoute, Link, useNavigate, Outlet, useMatchRoute } from "@tanstack/react-router";
import { Button } from "@ardine/ui";
import { trpc } from "@/integrations/trpc/react";
import { useState } from "react";
import {
	Archive,
	ArchiveRestore,
	Edit,
	Mail,
	Phone,
	MapPin,
	Calendar,
	DollarSign,
	FileText,
} from "lucide-react";

export const Route = createFileRoute("/clients_/$clientId")({
	component: ClientViewPage,
});

function ClientViewPage() {
	const { clientId } = Route.useParams();
	const navigate = useNavigate();
	const utils = trpc.useUtils();
	const matchRoute = useMatchRoute();

	const [activeTab, setActiveTab] = useState<"projects" | "invoices">(
		"projects",
	)
	const [projectsSearch, setProjectsSearch] = useState("");
	const [projectsStatus, setProjectsStatus] = useState<
		"active" | "archived" | "all"
	>("all");
	const [invoicesSearch, setInvoicesSearch] = useState("");
	const [invoicesStatus, setInvoicesStatus] = useState<
		"all" | "draft" | "sent" | "paid" | "overdue"
	>("all");

	// Fetch client summary
	const {
		data: summaryData,
		isLoading: summaryLoading,
		error: summaryError,
	} = trpc.clients.summary.useQuery({ id: clientId });

	// Fetch related projects
	const {
		data: projectsData,
		isLoading: projectsLoading,
		error: projectsError,
	} = trpc.clients.relatedProjects.useQuery({
		clientId,
		q: projectsSearch || undefined,
		status: projectsStatus,
		limit: 10,
	})

	// Fetch related invoices
	const {
		data: invoicesData,
		isLoading: invoicesLoading,
		error: invoicesError,
	} = trpc.clients.relatedInvoices.useQuery({
		clientId,
		q: invoicesSearch || undefined,
		status: invoicesStatus,
		limit: 10,
	})

	// Archive mutation
	const archiveMutation = trpc.clients.archive.useMutation({
		onSuccess: async () => {
			await utils.clients.summary.invalidate({ id: clientId });
			await utils.clients.list.invalidate();
		},
	})

	// Unarchive mutation
	const unarchiveMutation = trpc.clients.unarchive.useMutation({
		onSuccess: async () => {
			await utils.clients.summary.invalidate({ id: clientId });
			await utils.clients.list.invalidate();
		},
	})

	const handleArchive = () => {
		if (
			window.confirm(
				"Are you sure you want to archive this client? They will be hidden from the main list.",
			)
		) {
			archiveMutation.mutate({ id: clientId });
		}
	}

	const handleUnarchive = () => {
		unarchiveMutation.mutate({ id: clientId });
	}

	const formatCurrency = (cents: number | null, currency: string) => {
		if (cents === null) return "-";
		const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : "£";
		return `${symbol}${(cents / 100).toFixed(2)}`;
	}

	const formatDate = (date: Date) => {
		return new Date(date).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		})
	}

	// Check if we're on a child route (like edit page)
	const isOnChildRoute = matchRoute({ to: "/clients/$clientId/edit", params: { clientId } });

	// If on a child route, just render the child
	if (isOnChildRoute) {
		return <Outlet />;
	}

	// Loading state
	if (summaryLoading) {
		return (
			<div className="text-center py-12 text-muted-foreground">
				Loading client...
			</div>
		)
	}

	// Error state
	if (summaryError || !summaryData) {
		return (
			<div className="border border-destructive rounded-lg p-4 text-destructive">
				Error loading client: {summaryError?.message || "Client not found"}
			</div>
		)
	}

	const { client: rawClient, counts } = summaryData;

	// Normalize client data to handle both snake_case and camelCase
	const rawCreatedAt = (rawClient as any).createdAt || (rawClient as any).created_at;
	const rawUpdatedAt = (rawClient as any).updatedAt || (rawClient as any).updated_at;
	const rawArchivedAt = (rawClient as any).archivedAt || (rawClient as any).archived_at;

	const client = {
		id: rawClient.id,
		name: rawClient.name,
		contactName: (rawClient as any).contactName || (rawClient as any).contact_name,
		email: rawClient.email,
		phone: rawClient.phone,
		billingAddress: (rawClient as any).billingAddress || (rawClient as any).billing_address,
		taxId: (rawClient as any).taxId || (rawClient as any).tax_id,
		defaultHourlyRateCents: (rawClient as any).defaultHourlyRateCents ?? (rawClient as any).default_hourly_rate_cents,
		currency: rawClient.currency,
		notes: rawClient.notes,
		archivedAt: rawArchivedAt ? new Date(rawArchivedAt) : null,
		createdAt: rawCreatedAt ? new Date(rawCreatedAt) : new Date(),
		updatedAt: rawUpdatedAt ? new Date(rawUpdatedAt) : new Date(),
	};

	// Check if contact information exists
	const hasContactInfo = client.contactName || client.email || client.phone || client.billingAddress;

	return (
		<div>
			{/* Header */}
			<div className="flex items-start justify-between mb-6">
				<div>
					<div className="flex items-center gap-3 mb-2">
						<h1 className="text-3xl font-bold">{client.name}</h1>
						{client.archivedAt && (
							<span className="px-3 py-1 bg-muted text-muted-foreground text-sm rounded-full">
								Archived
							</span>
						)}
					</div>
					<Link to="/clients" className="text-sm text-primary hover:underline">
						← Back to clients
					</Link>
				</div>
				<div className="flex gap-2">
					<Link to={`/clients/${clientId}/edit`}>
						<Button variant="outline">
							<Edit className="w-4 h-4 mr-2" />
							Edit
						</Button>
					</Link>
					{client.archivedAt ? (
						<Button
							variant="outline"
							onClick={handleUnarchive}
							disabled={unarchiveMutation.isPending}
						>
							<ArchiveRestore className="w-4 h-4 mr-2" />
							{unarchiveMutation.isPending ? "Unarchiving..." : "Unarchive"}
						</Button>
					) : (
						<Button
							variant="outline"
							onClick={handleArchive}
							disabled={archiveMutation.isPending}
						>
							<Archive className="w-4 h-4 mr-2" />
							{archiveMutation.isPending ? "Archiving..." : "Archive"}
						</Button>
					)}
				</div>
			</div>

			{/* Client Details */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
				{/* Contact Information */}
				{hasContactInfo && (
					<div className="border rounded-lg p-6">
						<h2 className="text-lg font-semibold mb-4">Contact Information</h2>
						<div className="space-y-3">
							{client.contactName && (
								<div>
									<p className="text-sm text-muted-foreground">Contact Name</p>
									<p className="font-medium">{client.contactName}</p>
								</div>
							)}
							{client.email && (
								<div className="flex items-center gap-2">
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
								<div className="flex items-center gap-2">
									<Phone className="w-4 h-4 text-muted-foreground" />
									<p>{client.phone}</p>
								</div>
							)}
							{client.billingAddress && (
								<div className="flex items-start gap-2">
									<MapPin className="w-4 h-4 text-muted-foreground mt-1" />
									<div className="text-sm">
										<p>{client.billingAddress.line1}</p>
										{client.billingAddress.line2 && (
											<p>{client.billingAddress.line2}</p>
										)}
										<p>
											{client.billingAddress.city}, {client.billingAddress.region}{" "}
											{client.billingAddress.postalCode}
										</p>
										<p>{client.billingAddress.country}</p>
									</div>
								</div>
							)}
						</div>
					</div>
				)}

				{/* Billing Information */}
				<div className="border rounded-lg p-6">
					<h2 className="text-lg font-semibold mb-4">Billing Information</h2>
					<div className="space-y-3">
						{client.taxId && (
							<div>
								<p className="text-sm text-muted-foreground">Tax ID</p>
								<p className="font-medium">{client.taxId}</p>
							</div>
						)}
						<div>
							<p className="text-sm text-muted-foreground">Currency</p>
							<p className="font-medium">{client.currency}</p>
						</div>
						{client.defaultHourlyRateCents !== null && client.defaultHourlyRateCents !== undefined && (
							<div className="flex items-center gap-2">
								<DollarSign className="w-4 h-4 text-muted-foreground" />
								<div>
									<p className="text-sm text-muted-foreground">
										Default Hourly Rate
									</p>
									<p className="font-medium">
										{formatCurrency(
											client.defaultHourlyRateCents,
											client.currency,
										)}
										/hr
									</p>
								</div>
							</div>
						)}
						<div className="flex items-center gap-2">
							<Calendar className="w-4 h-4 text-muted-foreground" />
							<div>
								<p className="text-sm text-muted-foreground">Created</p>
								<p className="text-sm">{formatDate(client.createdAt)}</p>
							</div>
						</div>
					</div>
				</div>

				{/* Summary Stats */}
				<div className="border rounded-lg p-6">
					<h2 className="text-lg font-semibold mb-4">Summary</h2>
					<div className="space-y-4">
						<div>
							<p className="text-2xl font-bold">{counts.projects}</p>
							<p className="text-sm text-muted-foreground">Projects</p>
						</div>
						<div>
							<p className="text-2xl font-bold">{counts.invoices}</p>
							<p className="text-sm text-muted-foreground">Invoices</p>
						</div>
						<div>
							<p className="text-2xl font-bold">{counts.timeEntries}</p>
							<p className="text-sm text-muted-foreground">Time Entries</p>
						</div>
					</div>
				</div>
			</div>

			{/* Notes */}
			{client.notes && (
				<div className="border rounded-lg p-6 mb-8">
					<h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
						<FileText className="w-5 h-5" />
						Notes
					</h2>
					<p className="text-muted-foreground whitespace-pre-wrap">
						{client.notes}
					</p>
				</div>
			)}

			{/* Tabs */}
			<div className="border-b mb-6">
				<div className="flex gap-6">
					<button
						onClick={() => setActiveTab("projects")}
						className={`pb-3 px-1 border-b-2 transition-colors ${
							activeTab === "projects"
								? "border-primary text-primary font-medium"
								: "border-transparent text-muted-foreground hover:text-foreground"
						}`}
					>
						Projects ({counts.projects})
					</button>
					<button
						onClick={() => setActiveTab("invoices")}
						className={`pb-3 px-1 border-b-2 transition-colors ${
							activeTab === "invoices"
								? "border-primary text-primary font-medium"
								: "border-transparent text-muted-foreground hover:text-foreground"
						}`}
					>
						Invoices ({counts.invoices})
					</button>
				</div>
			</div>

			{/* Projects Tab */}
			{activeTab === "projects" && (
				<div>
					<div className="flex items-center gap-4 mb-6">
						<input
							type="text"
							placeholder="Search projects..."
							value={projectsSearch}
							onChange={(e) => setProjectsSearch(e.target.value)}
							className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
						/>
						<select
							value={projectsStatus}
							onChange={(e) =>
								setProjectsStatus(e.target.value as "active" | "archived" | "all")
							}
							className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
						>
							<option value="all">All Status</option>
							<option value="active">Active</option>
							<option value="archived">Archived</option>
						</select>
						<Link to={`/projects/new?clientId=${clientId}`}>
							<Button>Create Project</Button>
						</Link>
					</div>

					{projectsLoading && (
						<div className="text-center py-8 text-muted-foreground">
							Loading projects...
						</div>
					)}

					{projectsError && (
						<div className="border border-destructive rounded-lg p-4 text-destructive">
							Error loading projects: {projectsError.message}
						</div>
					)}

					{projectsData && projectsData.items.length === 0 && (
						<div className="border rounded-lg p-12 text-center">
							<p className="text-muted-foreground mb-4">
								No projects found for this client
							</p>
							<Link to={`/projects/new?clientId=${clientId}`}>
								<Button>Create First Project</Button>
							</Link>
						</div>
					)}

					{projectsData && projectsData.items.length > 0 && (
						<div className="border rounded-lg overflow-hidden">
							<table className="w-full">
								<thead className="bg-muted">
									<tr>
										<th className="px-4 py-3 text-left text-sm font-medium">
											Name
										</th>
										<th className="px-4 py-3 text-left text-sm font-medium">
											Status
										</th>
										<th className="px-4 py-3 text-left text-sm font-medium">
											Hourly Rate
										</th>
										<th className="px-4 py-3 text-left text-sm font-medium">
											Last Updated
										</th>
									</tr>
								</thead>
								<tbody className="divide-y">
									{projectsData.items.map((project) => (
										<tr
											key={project.id}
											className="hover:bg-muted/50 transition-colors"
										>
											<td className="px-4 py-3">
												<div>
													<p className="font-medium">{project.name}</p>
													{project.description && (
														<p className="text-sm text-muted-foreground">
															{project.description}
														</p>
													)}
												</div>
											</td>
											<td className="px-4 py-3 text-sm">
												{project.isActive ? (
													<span className="text-green-600">Active</span>
												) : (
													<span className="text-muted-foreground">
														Archived
													</span>
												)}
											</td>
											<td className="px-4 py-3 text-sm">
												{formatCurrency(
													project.hourlyRateCents,
													client.currency,
												)}
											</td>
											<td className="px-4 py-3 text-sm text-muted-foreground">
												{formatDate(project.updatedAt)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			)}

			{/* Invoices Tab */}
			{activeTab === "invoices" && (
				<div>
					<div className="flex items-center gap-4 mb-6">
						<input
							type="text"
							placeholder="Search invoices..."
							value={invoicesSearch}
							onChange={(e) => setInvoicesSearch(e.target.value)}
							className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
						/>
						<select
							value={invoicesStatus}
							onChange={(e) =>
								setInvoicesStatus(
									e.target.value as
										| "all"
										| "draft"
										| "sent"
										| "paid"
										| "overdue",
								)
							}
							className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
						>
							<option value="all">All Status</option>
							<option value="draft">Draft</option>
							<option value="sent">Sent</option>
							<option value="paid">Paid</option>
							<option value="overdue">Overdue</option>
						</select>
						<Link to={`/invoices/new?clientId=${clientId}`}>
							<Button>Create Invoice</Button>
						</Link>
					</div>

					{invoicesLoading && (
						<div className="text-center py-8 text-muted-foreground">
							Loading invoices...
						</div>
					)}

					{invoicesError && (
						<div className="border border-destructive rounded-lg p-4 text-destructive">
							Error loading invoices: {invoicesError.message}
						</div>
					)}

					{invoicesData && invoicesData.items.length === 0 && (
						<div className="border rounded-lg p-12 text-center">
							<p className="text-muted-foreground mb-4">
								No invoices found for this client
							</p>
							<Link to={`/invoices/new?clientId=${clientId}`}>
								<Button>Create First Invoice</Button>
							</Link>
						</div>
					)}

					{invoicesData && invoicesData.items.length > 0 && (
						<div className="border rounded-lg overflow-hidden">
							<table className="w-full">
								<thead className="bg-muted">
									<tr>
										<th className="px-4 py-3 text-left text-sm font-medium">
											Number
										</th>
										<th className="px-4 py-3 text-left text-sm font-medium">
											Issue Date
										</th>
										<th className="px-4 py-3 text-left text-sm font-medium">
											Due Date
										</th>
										<th className="px-4 py-3 text-left text-sm font-medium">
											Status
										</th>
										<th className="px-4 py-3 text-left text-sm font-medium">
											Total
										</th>
									</tr>
								</thead>
								<tbody className="divide-y">
									{invoicesData.items.map((invoice) => (
										<tr
											key={invoice.id}
											className="hover:bg-muted/50 transition-colors"
										>
											<td className="px-4 py-3 font-medium">
												{invoice.invoiceNumber}
											</td>
											<td className="px-4 py-3 text-sm text-muted-foreground">
												{formatDate(invoice.issuedDate)}
											</td>
											<td className="px-4 py-3 text-sm text-muted-foreground">
												{formatDate(invoice.dueDate)}
											</td>
											<td className="px-4 py-3 text-sm">
												<span
													className={`px-2 py-1 rounded-full text-xs font-medium ${
														invoice.status === "paid"
															? "bg-green-100 text-green-700"
															: invoice.status === "sent"
																? "bg-blue-100 text-blue-700"
																: invoice.status === "draft"
																	? "bg-gray-100 text-gray-700"
																	: "bg-yellow-100 text-yellow-700"
													}`}
												>
													{invoice.status}
												</span>
											</td>
											<td className="px-4 py-3 text-sm font-medium">
												{formatCurrency(invoice.totalCents, client.currency)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			)}
		</div>
	)
}
