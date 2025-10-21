import { createFileRoute } from "@tanstack/react-router";
import { trpc } from "@/integrations/trpc/react";
import { Button } from "@ardine/ui";

export const Route = createFileRoute("/projects")({
	component: ProjectsPage,
});

function ProjectsPage() {
	const { data: projects, isLoading } = trpc.projects.list.useQuery();

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-3xl font-bold">Projects</h1>
				<Button>New Project</Button>
			</div>

			{isLoading ? (
				<p>Loading projects...</p>
			) : projects && projects.length > 0 ? (
				<div className="border rounded-lg">
					<table className="w-full">
						<thead>
							<tr className="border-b">
								<th className="text-left p-4">Name</th>
								<th className="text-left p-4">Client</th>
								<th className="text-left p-4">Rate</th>
								<th className="text-left p-4">Status</th>
							</tr>
						</thead>
						<tbody>
							{projects.map((project) => (
								<tr key={project.id} className="border-b last:border-0">
									<td className="p-4">{project.name}</td>
									<td className="p-4">{project.clientId}</td>
									<td className="p-4">
										${(project.hourlyRateCents / 100).toFixed(2)}/hr
									</td>
									<td className="p-4">
										{project.isActive ? "Active" : "Inactive"}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : (
				<div className="border rounded-lg p-12 text-center">
					<p className="text-muted-foreground mb-4">No projects yet</p>
					<Button>Create Your First Project</Button>
				</div>
			)}
		</div>
	);
}
