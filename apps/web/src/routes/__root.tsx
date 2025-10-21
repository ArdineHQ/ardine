import { createRootRoute, Outlet, Link } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { RootProvider } from "@/integrations/tanstack-query/root-provider";
import "@ardine/ui/styles.css";

export const Route = createRootRoute({
	component: RootComponent,
});

function RootComponent() {
	return (
		<RootProvider>
			<html lang="en">
				<head>
					<meta charSet="UTF-8" />
					<meta name="viewport" content="width=device-width, initial-scale=1.0" />
					<title>Ardine - Time Tracking & Invoicing</title>
				</head>
				<body>
					<div className="min-h-screen bg-background">
						<nav className="border-b">
							<div className="container mx-auto px-4 py-4">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-8">
										<Link to="/" className="text-xl font-bold">
											Ardine
										</Link>
										<div className="flex gap-4">
											<Link
												to="/dashboard"
												className="text-sm hover:text-primary"
												activeProps={{ className: "text-primary font-medium" }}
											>
												Dashboard
											</Link>
											<Link
												to="/clients"
												className="text-sm hover:text-primary"
												activeProps={{ className: "text-primary font-medium" }}
											>
												Clients
											</Link>
											<Link
												to="/projects"
												className="text-sm hover:text-primary"
												activeProps={{ className: "text-primary font-medium" }}
											>
												Projects
											</Link>
											<Link
												to="/timesheets"
												className="text-sm hover:text-primary"
												activeProps={{ className: "text-primary font-medium" }}
											>
												Timesheets
											</Link>
											<Link
												to="/invoices"
												className="text-sm hover:text-primary"
												activeProps={{ className: "text-primary font-medium" }}
											>
												Invoices
											</Link>
										</div>
									</div>
								</div>
							</div>
						</nav>
						<main className="container mx-auto px-4 py-8">
							<Outlet />
						</main>
					</div>
					<TanStackRouterDevtools position="bottom-right" />
				</body>
			</html>
		</RootProvider>
	);
}
