import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@ardine/ui";

export const Route = createFileRoute("/clients")({
	component: ClientsPage,
});

function ClientsPage() {
	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-3xl font-bold">Clients</h1>
				<Button>New Client</Button>
			</div>
			<div className="border rounded-lg p-12 text-center">
				<p className="text-muted-foreground mb-4">No clients yet</p>
				<Button>Add Your First Client</Button>
			</div>
		</div>
	);
}
