import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@ardine/ui";
import { trpc } from "@/integrations/trpc/react";
import { useState, useEffect } from "react";
import { Search, Plus, Filter } from "lucide-react";
import type { ProjectStatus } from "@ardine/shared";

export const Route = createFileRoute("/projects")({
    component: ProjectsPage,
});

function ProjectsPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [clientFilter, setClientFilter] = useState<string>("");
    const [statusFilter, setStatusFilter] = useState<
        "all" | ProjectStatus
    >("all");

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch clients for filter dropdown
    const { data: clientsData } = trpc.clients.list.useQuery({
        limit: 100,
        includeArchived: false,
    });

    // Fetch projects
    const { data, isLoading, error } = trpc.projects.list.useQuery({
        q: debouncedQuery || undefined,
        clientId: clientFilter || undefined,
        status: statusFilter,
        limit: 20,
    });

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold">Projects</h1>
                <Link to="/projects/new">
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        New Project
                    </Button>
                </Link>
            </div>

            {/* Filters */}
            <div className="mb-6 space-y-4">
                {/* Search bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search projects by name, code, or description..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                    />
                </div>

                {/* Filter row */}
                <div className="flex gap-4">
                    {/* Client filter */}
                    <div className="flex-1">
                        <label className="block text-sm font-medium mb-1.5">Client</label>
                        <select
                            value={clientFilter}
                            onChange={(e) => setClientFilter(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="">All Clients</option>
                            {clientsData?.items.map((client) => (
                                <option key={client.id} value={client.id}>
                                    {client.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Status filter */}
                    <div className="flex-1">
                        <label className="block text-sm font-medium mb-1.5">Status</label>
                        <select
                            value={statusFilter}
                            onChange={(e) =>
                                setStatusFilter(e.target.value as "all" | ProjectStatus)
                            }
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="all">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="archived">Archived</option>
                            <option value="completed">Completed</option>
                            <option value="on_hold">On Hold</option>
                        </select>
                    </div>
                </div>

                {/* Active filters summary */}
                {(clientFilter || statusFilter !== "all" || debouncedQuery) && (
                    <div className="flex items-center gap-2 text-sm">
                        <Filter className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Active filters:</span>
                        {debouncedQuery && (
                            <span className="px-2 py-1 bg-muted rounded">
								Search: "{debouncedQuery}"
							</span>
                        )}
                        {clientFilter && (
                            <span className="px-2 py-1 bg-muted rounded">
								Client:{" "}
                                {clientsData?.items.find((c) => c.id === clientFilter)?.name}
							</span>
                        )}
                        {statusFilter !== "all" && (
                            <span className="px-2 py-1 bg-muted rounded">
								Status: {statusFilter}
							</span>
                        )}
                        <button
                            onClick={() => {
                                setSearchQuery("");
                                setClientFilter("");
                                setStatusFilter("all");
                            }}
                            className="text-primary hover:underline ml-2"
                        >
                            Clear all
                        </button>
                    </div>
                )}
            </div>

            {/* Loading state */}
            {isLoading && (
                <div className="text-center py-12 text-muted-foreground">
                    Loading projects...
                </div>
            )}

            {/* Error state */}
            {error && (
                <div className="border border-destructive rounded-lg p-4 text-destructive">
                    Error loading projects: {error.message}
                </div>
            )}

            {/* Empty state */}
            {!isLoading && !error && data?.items.length === 0 && !debouncedQuery && (
                <div className="border rounded-lg p-12 text-center">
                    <p className="text-muted-foreground mb-4">No projects yet</p>
                    <Link to="/projects/new">
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Your First Project
                        </Button>
                    </Link>
                </div>
            )}

            {/* No search results */}
            {!isLoading &&
                !error &&
                data?.items.length === 0 &&
                (debouncedQuery || clientFilter || statusFilter !== "all") && (
                    <div className="border rounded-lg p-12 text-center">
                        <p className="text-muted-foreground">
                            No projects found matching your filters
                        </p>
                    </div>
                )}

            {/* Projects table */}
            {!isLoading && !error && data && data.items.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-muted">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium">
                                Project
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium">
                                Client
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium">
                                Status
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium">
                                Budget
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium">
                                Rate
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium">
                                Updated
                            </th>
                        </tr>
                        </thead>
                        <tbody className="divide-y">
                        {data.items.map((project) => {
                            // Get client name for display
                            const client = clientsData?.items.find(
                                (c) => c.id === project.client_id,
                            );

                            return (
                                <tr
                                    key={project.id}
                                    className="hover:bg-muted/50 transition-colors cursor-pointer"
                                    onClick={() => {
                                        window.location.href = `/projects/${project.id}`;
                                    }}
                                >
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            {project.color && (
                                                <div
                                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: project.color }}
                                                />
                                            )}
                                            <div>
                                                <div className="font-medium">{project.name}</div>
                                                {project.code && (
                                                    <div className="text-xs text-muted-foreground">
                                                        {project.code}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-muted-foreground">
                                        {client?.name || "-"}
                                    </td>
                                    <td className="px-4 py-3">
                                        <StatusBadge status={project.status} />
                                    </td>
                                    <td className="px-4 py-3 text-sm text-muted-foreground">
                                        {project.budget_type === "hours" &&
                                        project.budget_hours ? (
                                            <span>{project.budget_hours}h</span>
                                        ) : project.budget_type === "amount" &&
                                        project.budget_amount_cents ? (
                                            <span>
													${(project.budget_amount_cents / 100).toFixed(2)}
												</span>
                                        ) : (
                                            "-"
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-muted-foreground">
                                        {project.default_hourly_rate_cents ? (
                                            <span>
													${(project.default_hourly_rate_cents / 100).toFixed(2)}/hr
												</span>
                                        ) : (
                                            "-"
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-muted-foreground">
                                        {new Date(project.updated_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>

                    {/* Pagination indicator */}
                    {data.nextCursor && (
                        <div className="px-4 py-3 bg-muted/50 text-sm text-muted-foreground text-center">
                            More projects available (pagination to be implemented)
                        </div>
                    )}
                </div>
            )}
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
