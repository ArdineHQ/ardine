import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@ardine/ui";

export const Route = createFileRoute("/invoices")({
	component: InvoicesPage,
});

function InvoicesPage() {
	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-3xl font-bold">Invoices</h1>
				<Button>New Invoice</Button>
			</div>
			<div className="border rounded-lg p-12 text-center">
				<p className="text-muted-foreground mb-4">No invoices yet</p>
				<Button>Create Your First Invoice</Button>
			</div>
		</div>
	);
}
