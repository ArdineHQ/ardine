import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { trpc } from "@/integrations/trpc/react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const Route = createFileRoute("/admin/users")({
	component: AdminUsersPage,
});

function AdminUsersPage() {
	const navigate = useNavigate();
	const { data: meData, isLoading: meLoading } = trpc.auth.me.useQuery(
		undefined,
		{
			retry: false,
		},
	);

	// Redirect if not authenticated or not admin
	useEffect(() => {
		if (!meLoading && !meData) {
			window.location.href = "/login";
		} else if (
			!meLoading &&
			meData &&
			meData.user.instanceRole !== "ADMIN"
		) {
			navigate({ to: "/dashboard" });
		}
	}, [meData, meLoading, navigate]);

	const utils = trpc.useUtils();
	const { data: users, isLoading } = trpc.admin.users.list.useQuery(undefined, {
		enabled: !!meData && meData.user.instanceRole === "ADMIN",
	});
	const { data: stats } = trpc.admin.stats.useQuery(undefined, {
		enabled: !!meData && meData.user.instanceRole === "ADMIN",
	});

	const setRoleMutation = trpc.admin.users.setRole.useMutation({
		onSuccess: () => {
			utils.admin.users.list.invalidate();
			utils.admin.stats.invalidate();
		},
	});

	// Count admin users
	const adminCount = users?.filter((u) => u.instanceRole === "ADMIN").length || 0;
	const isLastAdmin = adminCount === 1;

	const handlePromoteToAdmin = (userId: string) => {
		setRoleMutation.mutate({
			userId,
			instanceRole: "ADMIN",
		});
	};

	const handleDemoteToUser = (userId: string) => {
		setRoleMutation.mutate({
			userId,
			instanceRole: "USER",
		});
	};

	if (isLoading) {
		return <div>Loading...</div>;
	}

	return (
		<div className="space-y-8">
			<div>
				<h1 className="text-3xl font-bold">User Management</h1>
				<p className="text-muted-foreground">
					Manage user accounts and permissions
				</p>
			</div>

			{stats && (
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<Card>
						<CardHeader className="pb-3">
							<CardDescription>Total Users</CardDescription>
							<CardTitle className="text-3xl">{stats.userCount}</CardTitle>
						</CardHeader>
					</Card>
					<Card>
						<CardHeader className="pb-3">
							<CardDescription>Total Teams</CardDescription>
							<CardTitle className="text-3xl">{stats.teamCount}</CardTitle>
						</CardHeader>
					</Card>
					<Card>
						<CardHeader className="pb-3">
							<CardDescription>Total Clients</CardDescription>
							<CardTitle className="text-3xl">{stats.clientCount}</CardTitle>
						</CardHeader>
					</Card>
				</div>
			)}

			<Card>
				<CardHeader>
					<CardTitle>Users</CardTitle>
					<CardDescription>All registered users in the system</CardDescription>
				</CardHeader>
				<CardContent>
					{setRoleMutation.error && (
						<Alert variant="destructive" className="mb-4">
							<AlertDescription>
								{setRoleMutation.error.message}
							</AlertDescription>
						</Alert>
					)}

					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Email</TableHead>
								<TableHead>Role</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Joined</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{users?.map((user) => (
								<TableRow key={user.id}>
									<TableCell className="font-medium">
										{user.displayName}
									</TableCell>
									<TableCell>{user.email}</TableCell>
									<TableCell>
										<Badge
											variant={
												user.instanceRole === "ADMIN"
													? "default"
													: "secondary"
											}
										>
											{user.instanceRole}
										</Badge>
									</TableCell>
									<TableCell>
										<Badge
											variant={user.emailVerified ? "default" : "outline"}
										>
											{user.emailVerified ? "Verified" : "Unverified"}
										</Badge>
									</TableCell>
									<TableCell>
										{new Date(user.createdAt).toLocaleDateString()}
									</TableCell>
									<TableCell className="text-right">
										{user.instanceRole === "ADMIN" ? (
											<Button
												variant="outline"
												size="sm"
												onClick={() => handleDemoteToUser(user.id)}
												disabled={
													setRoleMutation.isPending ||
													(isLastAdmin && user.instanceRole === "ADMIN")
												}
												title={
													isLastAdmin && user.instanceRole === "ADMIN"
														? "Cannot demote the last administrator"
														: undefined
												}
											>
												Demote to User
											</Button>
										) : (
											<Button
												variant="outline"
												size="sm"
												onClick={() => handlePromoteToAdmin(user.id)}
												disabled={setRoleMutation.isPending}
											>
												Promote to Admin
											</Button>
										)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
}
