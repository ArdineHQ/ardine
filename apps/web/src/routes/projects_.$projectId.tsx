import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@ardine/ui";
import { trpc } from "@/integrations/trpc/react";
import { useState } from "react";
import {
	ArrowLeft,
	Edit,
	Archive,
	ArchiveRestore,
	Users,
	ListTodo,
	Clock,
	DollarSign,
	Calendar,
	Briefcase,
	FileText,
	Plus,
} from "lucide-react";
import type { ProjectStatus, ProjectRole } from "@ardine/shared";
import { effectiveRateCents, formatRateCents } from "@ardine/shared";

export const Route = createFileRoute("/projects_/$projectId")({
	component: ProjectDetailPage,
});

function ProjectDetailPage() {
	const { projectId } = Route.useParams();
	const navigate = useNavigate();
	const utils = trpc.useUtils();
	const [activeTab, setActiveTab] = useState<"overview" | "tasks" | "members" | "time">("overview");

	// Fetch project with summary
	const { data: summaryData, isLoading, error } = trpc.projects.summary.useQuery({ id: projectId });

	// Fetch client for display
	const { data: clientData } = trpc.clients.getById.useQuery(
		{ id: summaryData?.project.clientId || "" },
		{ enabled: !!summaryData?.project.clientId }
	);

	// Archive/unarchive mutations
	const archiveMutation = trpc.projects.archive.useMutation({
		onSuccess: async () => {
			await utils.projects.summary.invalidate({ id: projectId });
			await utils.projects.list.invalidate();
		},
	});

	const unarchiveMutation = trpc.projects.unarchive.useMutation({
		onSuccess: async () => {
			await utils.projects.summary.invalidate({ id: projectId });
			await utils.projects.list.invalidate();
		},
	});

	if (isLoading) {
		return (
			<div className="text-center py-12 text-muted-foreground">
				Loading project...
			</div>
		);
	}

	if (error || !summaryData) {
		return (
			<div className="border border-destructive rounded-lg p-4 text-destructive">
				Error loading project: {error?.message || "Project not found"}
			</div>
		);
	}

	const { project, counts } = summaryData;

	return (
		<div>
			{/* Header */}
			<div className="mb-6">
				<button
					onClick={() => navigate({ to: "/projects" })}
					className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
				>
					<ArrowLeft className="w-4 h-4" />
					Back to Projects
				</button>

				<div className="flex items-start justify-between">
					<div className="flex items-center gap-3">
						{project.color && (
							<div
								className="w-12 h-12 rounded-lg flex-shrink-0"
								style={{ backgroundColor: project.color }}
							/>
						)}
						<div>
							<h1 className="text-3xl font-bold">{project.name}</h1>
							{project.code && (
								<p className="text-muted-foreground">{project.code}</p>
							)}
						</div>
						<StatusBadge status={project.status} />
					</div>

					<div className="flex gap-2">
						<Link to={`/projects/${projectId}/edit`}>
							<Button variant="outline">
								<Edit className="w-4 h-4 mr-2" />
								Edit
							</Button>
						</Link>
						{project.status === "archived" ? (
							<Button
								variant="outline"
								onClick={() => unarchiveMutation.mutate({ id: projectId })}
								disabled={unarchiveMutation.isPending}
							>
								<ArchiveRestore className="w-4 h-4 mr-2" />
								Unarchive
							</Button>
						) : (
							<Button
								variant="outline"
								onClick={() => archiveMutation.mutate({ id: projectId })}
								disabled={archiveMutation.isPending}
							>
								<Archive className="w-4 h-4 mr-2" />
								Archive
							</Button>
						)}
					</div>
				</div>

				{/* Client info */}
				{clientData && (
					<div className="mt-4">
						<Link
							to={`/clients/${clientData.id}`}
							className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
						>
							<Briefcase className="w-4 h-4" />
							{clientData.name}
						</Link>
					</div>
				)}
			</div>

			{/* Tabs */}
			<div className="border-b mb-6">
				<div className="flex gap-6">
					<button
						onClick={() => setActiveTab("overview")}
						className={`pb-3 px-1 border-b-2 transition-colors ${
							activeTab === "overview"
								? "border-primary text-primary font-medium"
								: "border-transparent text-muted-foreground hover:text-foreground"
						}`}
					>
						<div className="flex items-center gap-2">
							<FileText className="w-4 h-4" />
							Overview
						</div>
					</button>
					<button
						onClick={() => setActiveTab("tasks")}
						className={`pb-3 px-1 border-b-2 transition-colors ${
							activeTab === "tasks"
								? "border-primary text-primary font-medium"
								: "border-transparent text-muted-foreground hover:text-foreground"
						}`}
					>
						<div className="flex items-center gap-2">
							<ListTodo className="w-4 h-4" />
							Tasks
							<span className="text-xs bg-muted px-1.5 py-0.5 rounded">
								{counts.tasks}
							</span>
						</div>
					</button>
					<button
						onClick={() => setActiveTab("members")}
						className={`pb-3 px-1 border-b-2 transition-colors ${
							activeTab === "members"
								? "border-primary text-primary font-medium"
								: "border-transparent text-muted-foreground hover:text-foreground"
						}`}
					>
						<div className="flex items-center gap-2">
							<Users className="w-4 h-4" />
							Members
							<span className="text-xs bg-muted px-1.5 py-0.5 rounded">
								{counts.members}
							</span>
						</div>
					</button>
					<button
						onClick={() => setActiveTab("time")}
						className={`pb-3 px-1 border-b-2 transition-colors ${
							activeTab === "time"
								? "border-primary text-primary font-medium"
								: "border-transparent text-muted-foreground hover:text-foreground"
						}`}
					>
						<div className="flex items-center gap-2">
							<Clock className="w-4 h-4" />
							Time
							<span className="text-xs bg-muted px-1.5 py-0.5 rounded">
								{counts.timeEntries}
							</span>
						</div>
					</button>
				</div>
			</div>

			{/* Tab content */}
			{activeTab === "overview" && (
				<OverviewTab project={project} counts={counts} client={clientData} />
			)}
			{activeTab === "tasks" && <TasksTab projectId={projectId} project={project} />}
			{activeTab === "members" && <MembersTab projectId={projectId} />}
			{activeTab === "time" && <TimeTab />}
		</div>
	);
}

function OverviewTab({
	project,
	counts,
	client,
}: {
	project: any;
	counts: any;
	client?: any;
}) {
	return (
		<div className="space-y-6">
			{/* Summary cards */}
			<div className="grid grid-cols-4 gap-4">
				<div className="border rounded-lg p-4">
					<div className="flex items-center gap-2 text-muted-foreground mb-1">
						<ListTodo className="w-4 h-4" />
						<span className="text-sm">Tasks</span>
					</div>
					<div className="text-2xl font-bold">{counts.tasks}</div>
				</div>
				<div className="border rounded-lg p-4">
					<div className="flex items-center gap-2 text-muted-foreground mb-1">
						<Users className="w-4 h-4" />
						<span className="text-sm">Members</span>
					</div>
					<div className="text-2xl font-bold">{counts.members}</div>
				</div>
				<div className="border rounded-lg p-4">
					<div className="flex items-center gap-2 text-muted-foreground mb-1">
						<Clock className="w-4 h-4" />
						<span className="text-sm">Time Entries</span>
					</div>
					<div className="text-2xl font-bold">{counts.timeEntries}</div>
				</div>
				<div className="border rounded-lg p-4">
					<div className="flex items-center gap-2 text-muted-foreground mb-1">
						<FileText className="w-4 h-4" />
						<span className="text-sm">Invoices</span>
					</div>
					<div className="text-2xl font-bold">{counts.invoices}</div>
				</div>
			</div>

			{/* Details */}
			<div className="border rounded-lg p-6 space-y-4">
				<h2 className="text-lg font-semibold">Project Details</h2>

				{project.description && (
					<div>
						<h3 className="text-sm font-medium text-muted-foreground mb-1">
							Description
						</h3>
						<p className="text-sm whitespace-pre-wrap">{project.description}</p>
					</div>
				)}

				<div className="grid grid-cols-2 gap-6">
					{/* Default hourly rate */}
					{project.default_hourly_rate_cents !== null && (
						<div>
							<h3 className="text-sm font-medium text-muted-foreground mb-1">
								Default Hourly Rate
							</h3>
							<div className="flex items-center gap-2">
								<DollarSign className="w-4 h-4 text-muted-foreground" />
								<span className="font-medium">
									{(project.default_hourly_rate_cents / 100).toFixed(2)}/hr
								</span>
							</div>
						</div>
					)}

					{/* Budget */}
					{project.budget_type && project.budget_type !== "none" && (
						<div>
							<h3 className="text-sm font-medium text-muted-foreground mb-1">
								Budget
							</h3>
							<div className="font-medium">
								{project.budget_type === "hours" && project.budget_hours && (
									<span>{project.budget_hours} hours</span>
								)}
								{project.budget_type === "amount" &&
									project.budget_amount_cents && (
										<span>
											${(project.budget_amount_cents / 100).toFixed(2)}
										</span>
									)}
							</div>
						</div>
					)}

					{/* Start date */}
					{project.start_date && (
						<div>
							<h3 className="text-sm font-medium text-muted-foreground mb-1">
								Start Date
							</h3>
							<div className="flex items-center gap-2">
								<Calendar className="w-4 h-4 text-muted-foreground" />
								<span className="font-medium">
									{new Date(project.start_date).toLocaleDateString()}
								</span>
							</div>
						</div>
					)}

					{/* Due date */}
					{project.due_date && (
						<div>
							<h3 className="text-sm font-medium text-muted-foreground mb-1">
								Due Date
							</h3>
							<div className="flex items-center gap-2">
								<Calendar className="w-4 h-4 text-muted-foreground" />
								<span className="font-medium">
									{new Date(project.due_date).toLocaleDateString()}
								</span>
							</div>
						</div>
					)}
				</div>

				{/* Tags */}
				{project.tags && project.tags.length > 0 && (
					<div>
						<h3 className="text-sm font-medium text-muted-foreground mb-2">
							Tags
						</h3>
						<div className="flex flex-wrap gap-2">
							{project.tags.map((tag: string) => (
								<span
									key={tag}
									className="px-2 py-1 bg-muted rounded text-sm"
								>
									{tag}
								</span>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

function TasksTab({ projectId, project }: { projectId: string; project: any }) {
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<"all" | ProjectStatus>("all");

	const { data, isLoading } = trpc.projects.tasks.list.useQuery({
		projectId,
		q: searchQuery || undefined,
		status: statusFilter,
		limit: 100,
	});

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div className="flex-1 flex gap-4">
					<input
						type="text"
						placeholder="Search tasks..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
					/>
					<select
						value={statusFilter}
						onChange={(e) => setStatusFilter(e.target.value as any)}
						className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
					>
						<option value="all">All Statuses</option>
						<option value="active">Active</option>
						<option value="completed">Completed</option>
						<option value="on_hold">On Hold</option>
						<option value="archived">Archived</option>
					</select>
				</div>
				<Link to={`/projects/${projectId}/tasks/new`}>
					<Button>
						<Plus className="w-4 h-4 mr-2" />
						New Task
					</Button>
				</Link>
			</div>

			{isLoading && (
				<div className="text-center py-12 text-muted-foreground">
					Loading tasks...
				</div>
			)}

			{!isLoading && data && data.items.length === 0 && (
				<div className="border rounded-lg p-12 text-center">
					<p className="text-muted-foreground mb-4">No tasks yet</p>
					<Link to={`/projects/${projectId}/tasks/new`}>
						<Button>
							<Plus className="w-4 h-4 mr-2" />
							Create First Task
						</Button>
					</Link>
				</div>
			)}

			{!isLoading && data && data.items.length > 0 && (
				<div className="border rounded-lg overflow-hidden">
					<table className="w-full">
						<thead className="bg-muted">
							<tr>
								<th className="px-4 py-3 text-left text-sm font-medium">
									Task
								</th>
								<th className="px-4 py-3 text-left text-sm font-medium">
									Status
								</th>
								<th className="px-4 py-3 text-left text-sm font-medium">
									Billable
								</th>
								<th className="px-4 py-3 text-left text-sm font-medium">
									Rate
								</th>
								<th className="px-4 py-3 text-left text-sm font-medium">
									Assignees
								</th>
							</tr>
						</thead>
						<tbody className="divide-y">
							{data.items.map((task) => {
								// Calculate effective rate
								const rate = effectiveRateCents({
									taskRateCents: task.hourlyRateCents,
									projectRateCents: project.defaultHourlyRateCents,
								});

								return (
									<tr key={task.id} className="hover:bg-muted/50">
										<td className="px-4 py-3">
											<div className="font-medium">{task.name}</div>
											{task.description && (
												<div className="text-xs text-muted-foreground line-clamp-1">
													{task.description}
												</div>
											)}
										</td>
										<td className="px-4 py-3">
											<StatusBadge status={task.status} />
										</td>
										<td className="px-4 py-3">
											{task.billable ? (
												<span className="text-green-600 text-sm">Yes</span>
											) : (
												<span className="text-muted-foreground text-sm">
													No
												</span>
											)}
										</td>
										<td className="px-4 py-3 text-sm">
											{rate.rateCents !== null ? (
												<div>
													<div className="font-medium">
														${(rate.rateCents / 100).toFixed(2)}/hr
													</div>
													<div className="text-xs text-muted-foreground">
														from {rate.source}
													</div>
												</div>
											) : (
												<span className="text-muted-foreground">-</span>
											)}
										</td>
										<td className="px-4 py-3 text-sm text-muted-foreground">
											-
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}

function MembersTab({ projectId }: { projectId: string }) {
	const { data, isLoading } = trpc.projects.members.list.useQuery({
		projectId,
	});

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold">Project Members</h2>
				<Button>
					<Plus className="w-4 h-4 mr-2" />
					Add Member
				</Button>
			</div>

			{isLoading && (
				<div className="text-center py-12 text-muted-foreground">
					Loading members...
				</div>
			)}

			{!isLoading && data && data.length === 0 && (
				<div className="border rounded-lg p-12 text-center">
					<p className="text-muted-foreground mb-4">No members yet</p>
					<Button>
						<Plus className="w-4 h-4 mr-2" />
						Add First Member
					</Button>
				</div>
			)}

			{!isLoading && data && data.length > 0 && (
				<div className="border rounded-lg overflow-hidden">
					<table className="w-full">
						<thead className="bg-muted">
							<tr>
								<th className="px-4 py-3 text-left text-sm font-medium">
									Name
								</th>
								<th className="px-4 py-3 text-left text-sm font-medium">
									Email
								</th>
								<th className="px-4 py-3 text-left text-sm font-medium">
									Role
								</th>
								<th className="px-4 py-3 text-left text-sm font-medium">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="divide-y">
							{data.map((member) => (
								<tr key={member.id} className="hover:bg-muted/50">
									<td className="px-4 py-3 font-medium">
										{member.displayName || "Unnamed User"}
									</td>
									<td className="px-4 py-3 text-sm text-muted-foreground">
										{member.email}
									</td>
									<td className="px-4 py-3">
										<RoleBadge role={member.role} />
									</td>
									<td className="px-4 py-3">
										<Button variant="ghost" size="sm">
											Edit
										</Button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}

function TimeTab() {
	return (
		<div className="border rounded-lg p-12 text-center">
			<Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
			<p className="text-muted-foreground mb-2">Time tracking coming soon</p>
			<p className="text-sm text-muted-foreground">
				Time entries will be displayed here once implemented
			</p>
		</div>
	);
}

function StatusBadge({ status }: { status: ProjectStatus }) {
	const styles: Record<ProjectStatus, string> = {
		active: "bg-green-100 text-green-800 border-green-200",
		archived: "bg-gray-100 text-gray-800 border-gray-200",
		completed: "bg-blue-100 text-blue-800 border-blue-200",
		on_hold: "bg-yellow-100 text-yellow-800 border-yellow-200",
	};

	const labels: Record<ProjectStatus, string> = {
		active: "Active",
		archived: "Archived",
		completed: "Completed",
		on_hold: "On Hold",
	};

	return (
		<span
			className={`px-2 py-1 text-xs font-medium rounded border ${styles[status]}`}
		>
			{labels[status]}
		</span>
	);
}

function RoleBadge({ role }: { role: ProjectRole }) {
	const styles: Record<ProjectRole, string> = {
		MANAGER: "bg-purple-100 text-purple-800 border-purple-200",
		CONTRIBUTOR: "bg-blue-100 text-blue-800 border-blue-200",
		VIEWER: "bg-gray-100 text-gray-800 border-gray-200",
	};

	return (
		<span
			className={`px-2 py-1 text-xs font-medium rounded border ${styles[role]}`}
		>
			{role}
		</span>
	);
}
