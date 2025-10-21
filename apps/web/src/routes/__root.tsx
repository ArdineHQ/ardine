import { createRootRoute, Outlet, Link } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { RootProvider } from "@/integrations/tanstack-query/root-provider";
import { trpc } from "@/integrations/trpc/react";
import { useTeam } from "@/lib/team-context";
import { useTeamSwitchRedirect } from "@/lib/use-team-switch-redirect";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import "../styles.css";

export const Route = createRootRoute({
	component: RootComponent,
});

function RootComponent() {
	return (
		<RootProvider>
			<RootLayout />
			<TanStackRouterDevtools position="bottom-right" />
		</RootProvider>
	);
}

function RootLayout() {
	// Hook to redirect when team is switched on team-specific pages
	useTeamSwitchRedirect();

	return (
		<div className="min-h-screen bg-background">
			<nav className="border-b">
				<div className="container mx-auto px-4 py-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-8">
							<Link to="/" className="text-xl font-bold">
								Ardine
							</Link>
							<TeamSwitcher />
							<Navigation />
						</div>
						<UserMenu />
					</div>
				</div>
			</nav>
			<main className="container mx-auto px-4 py-8">
				<Outlet />
			</main>
		</div>
	);
}

function Navigation() {
	const { data: meData } = trpc.auth.me.useQuery(undefined, {
		retry: false,
		refetchOnWindowFocus: false,
	});

	if (!meData) {
		return null;
	}

	return (
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
	);
}

function UserMenu() {
	const { data: meData, isLoading } = trpc.auth.me.useQuery(undefined, {
		retry: false,
		refetchOnWindowFocus: false,
	});

	const logoutMutation = trpc.auth.logout.useMutation({
		onSuccess: () => {
			window.location.href = "/login";
		},
	});

	if (isLoading) {
		return null;
	}

	if (!meData) {
		return (
			<div className="flex gap-2">
				<Button variant="ghost" size="sm" asChild>
					<a href="/login">Sign in</a>
				</Button>
				<Button size="sm" asChild>
					<a href="/register">Sign up</a>
				</Button>
			</div>
		);
	}

	const handleLogout = () => {
		logoutMutation.mutate();
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="sm">
					{meData.user.displayName}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuLabel>
					<div className="flex flex-col">
						<span>{meData.user.displayName}</span>
						<span className="text-xs font-normal text-muted-foreground">
							{meData.user.email}
						</span>
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{meData.user.instanceRole === "ADMIN" && (
					<>
						<DropdownMenuItem asChild>
							<Link to="/admin/users">Admin Dashboard</Link>
						</DropdownMenuItem>
						<DropdownMenuSeparator />
					</>
				)}
				<DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function TeamSwitcher() {
	const { data: meData } = trpc.auth.me.useQuery(undefined, {
		retry: false,
		refetchOnWindowFocus: false,
	});
	const { data: teams } = trpc.teams.listMine.useQuery(undefined, {
		enabled: !!meData,
	});
	const { activeTeamId, setActiveTeamId } = useTeam();
	const utils = trpc.useUtils();

	// Auto-select first team if none selected
	useEffect(() => {
		if (teams && teams.length > 0 && !activeTeamId) {
			setActiveTeamId(teams[0].id);
		}
	}, [teams, activeTeamId, setActiveTeamId]);

	if (!meData || !teams || teams.length === 0) {
		return null;
	}

	const activeTeam = teams.find((t) => t.id === activeTeamId);

	const handleTeamSwitch = (teamId: string) => {
		setActiveTeamId(teamId);
		// Invalidate all queries to refetch with new team context
		utils.invalidate();
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="sm">
					{activeTeam?.name || "Select Team"}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start">
				<DropdownMenuLabel>Switch Team</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{teams.map((team) => (
					<DropdownMenuItem
						key={team.id}
						onClick={() => handleTeamSwitch(team.id)}
						className={activeTeamId === team.id ? "bg-accent" : ""}
					>
						{team.name}
						{activeTeamId === team.id && " ✓"}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
