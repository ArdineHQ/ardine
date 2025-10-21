import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@ardine/ui";

export const Route = createFileRoute("/")({
	component: HomePage,
});

function HomePage() {
	return (
		<div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
			<h1 className="text-5xl font-bold mb-4">Welcome to Ardine</h1>
			<p className="text-xl text-muted-foreground mb-8 max-w-2xl">
				A self-hosted time tracking and invoicing application built for
				freelancers, contractors, and small teams who want full control over
				their data.
			</p>
			<div className="flex gap-4">
				<Link to="/dashboard">
					<Button size="lg">Get Started</Button>
				</Link>
				<Button variant="outline" size="lg">
					Learn More
				</Button>
			</div>
		</div>
	);
}
