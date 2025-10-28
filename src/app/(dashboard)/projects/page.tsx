"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { useQuery } from "urql";
import { useAuth, useCanManageTeam } from "@/lib/auth-context";
import { gql } from "@/lib/gql";

const LIST_PROJECTS_QUERY = gql(`
  query ListProjects($args: ListArgs!) {
    projects(args: $args) {
      nodes {
        id
        name
        code
        status
        color
        tags
        startDate
        dueDate
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

export default function ProjectsPage() {
	const [searchQuery, setSearchQuery] = useState("");
	const { currentTeam } = useAuth();
	const canManageTeam = useCanManageTeam();

	const [result] = useQuery({
		query: LIST_PROJECTS_QUERY,
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
	const projects = data?.projects.nodes || [];

	// Status badge colors
	const getStatusColor = (status: string) => {
		switch (status) {
			case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
			case 'on_hold': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
			case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
			case 'archived': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
			default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
		}
	};

	const formatDate = (date: string | null) => {
		if (!date) return null;
		return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	};

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-3xl font-bold dark:text-foreground">Projects</h1>
				{canManageTeam && (
					<Link href="/projects/new">
						<Button>
							<Plus className="w-4 h-4 mr-2" />
							New Project
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
						placeholder="Search projects by name, code, or description..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="w-full pl-10 pr-4 py-2 border dark:border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-ring placeholder:text-muted-foreground dark:placeholder:text-muted-foreground bg-background dark:bg-background text-foreground dark:text-foreground"
					/>
				</div>
			</div>

			{/* Error state */}
			{error && (
				<div className="border border-red-500 rounded-lg p-4 bg-red-50 dark:bg-red-900/20 mb-6">
					<p className="text-red-700 dark:text-red-400">Error loading projects: {error.message}</p>
				</div>
			)}

			{/* Loading state */}
			{fetching && (
				<div className="border dark:border-border rounded-lg p-12 text-center bg-card dark:bg-card">
					<p className="text-muted-foreground dark:text-muted-foreground">Loading projects...</p>
				</div>
			)}

			{/* Empty state */}
			{!fetching && !error && projects.length === 0 && (
				<div className="border dark:border-border rounded-lg p-12 text-center bg-card dark:bg-card">
					<p className="text-muted-foreground dark:text-muted-foreground mb-4">
						{searchQuery ? 'No projects found matching your search' : 'No projects yet'}
					</p>
                    {canManageTeam && (
					<Link href="/projects/new">
						<Button>
							<Plus className="w-4 h-4 mr-2" />
							Create Your First Project
						</Button>
					</Link>
                        )}
				</div>
			)}

			{/* Projects table */}
			{!fetching && projects.length > 0 && (
				<div className="border dark:border-border rounded-lg overflow-hidden bg-card dark:bg-card">
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead className="bg-muted/50 dark:bg-muted/50 border-b dark:border-border">
								<tr>
									<th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Project</th>
									<th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Client</th>
									<th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Status</th>
									<th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Timeline</th>
									<th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Tags</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border dark:divide-border">
								{projects.map((project: any) => (
									<tr key={project.id} className="hover:bg-muted/30 dark:hover:bg-muted/30 transition-colors">
										<td className="py-4 px-4">
											<Link href={`/projects/${project.id}`} className="group">
												<div className="flex items-center gap-3">
													{project.color && (
														<div
															className="w-3 h-3 rounded-full flex-shrink-0"
															style={{ backgroundColor: project.color }}
														/>
													)}
													<div>
														<div className="flex items-center gap-2">
															<h3 className="font-semibold text-foreground dark:text-foreground group-hover:text-primary transition-colors">
																{project.name}
															</h3>
															{project.code && (
																<Badge variant="outline" className="text-xs">
																	{project.code}
																</Badge>
															)}
														</div>
													</div>
												</div>
											</Link>
										</td>
										<td className="py-4 px-4">
											{project.client ? (
												<Link
													href={`/clients/${project.client.id}`}
													className="text-sm text-foreground dark:text-foreground hover:text-primary hover:underline"
												>
													{project.client.name}
												</Link>
											) : (
												<span className="text-sm text-muted-foreground">No client</span>
											)}
										</td>
										<td className="py-4 px-4">
											<span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(project.status)}`}>
												{project.status.replace('_', ' ')}
											</span>
										</td>
										<td className="py-4 px-4">
											<div className="text-sm text-muted-foreground space-y-1">
												{project.startDate && (
													<div>Start: {formatDate(project.startDate)}</div>
												)}
												{project.dueDate && (
													<div>Due: {formatDate(project.dueDate)}</div>
												)}
												{!project.startDate && !project.dueDate && (
													<span className="text-muted-foreground">-</span>
												)}
											</div>
										</td>
										<td className="py-4 px-4">
											{project.tags && project.tags.length > 0 ? (
												<div className="flex gap-1 flex-wrap">
													{project.tags.slice(0, 3).map((tag: any, idx: number) => (
														<Badge key={idx} variant="secondary" className="text-xs">
															{tag}
														</Badge>
													))}
													{project.tags.length > 3 && (
														<Badge variant="secondary" className="text-xs">
															+{project.tags.length - 3}
														</Badge>
													)}
												</div>
											) : (
												<span className="text-sm text-muted-foreground">-</span>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{/* Pagination info */}
			{!fetching && data && data.projects.total > 0 && (
				<div className="mt-6 text-center text-sm text-muted-foreground dark:text-muted-foreground">
					Showing {projects.length} of {data.projects.total} projects
				</div>
			)}
		</div>
	);
}
