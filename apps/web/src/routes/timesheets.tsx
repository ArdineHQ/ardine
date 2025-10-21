import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@ardine/ui";

export const Route = createFileRoute("/timesheets")({
	component: TimesheetsPage,
});

function TimesheetsPage() {
	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-3xl font-bold">Timesheets</h1>
				<Button>Start Timer</Button>
			</div>
			<div className="border rounded-lg p-12 text-center">
				<p className="text-muted-foreground mb-4">No time entries yet</p>
				<Button>Log Your First Entry</Button>
			</div>
		</div>
	);
}
