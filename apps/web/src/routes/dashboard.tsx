import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard")({
	component: DashboardPage,
});

function DashboardPage() {
	return (
		<div>
			<h1 className="text-3xl font-bold mb-6">Dashboard</h1>
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<div className="border rounded-lg p-6">
					<h2 className="text-lg font-semibold mb-2">Active Timer</h2>
					<p className="text-muted-foreground">No active timer</p>
				</div>
				<div className="border rounded-lg p-6">
					<h2 className="text-lg font-semibold mb-2">This Week</h2>
					<p className="text-muted-foreground">0 hours tracked</p>
				</div>
				<div className="border rounded-lg p-6">
					<h2 className="text-lg font-semibold mb-2">Pending Invoices</h2>
					<p className="text-muted-foreground">$0.00</p>
				</div>
			</div>
		</div>
	);
}
