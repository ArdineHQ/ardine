import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { trpc } from "@/integrations/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const Route = createFileRoute("/login")({
	component: LoginPage,
	validateSearch: (search: Record<string, unknown>) => {
		return {
			redirect: (search.redirect as string) || undefined,
		};
	},
});

function LoginPage() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const navigate = useNavigate();
	const search = useSearch({ from: "/login" });
	const { data: meData } = trpc.auth.me.useQuery(undefined, {
		retry: false,
	});

	// Redirect if already authenticated
	useEffect(() => {
		if (meData) {
			const redirectTo = search.redirect || "/dashboard";
			navigate({ to: redirectTo });
		}
	}, [meData, navigate, search.redirect]);

	const loginMutation = trpc.auth.login.useMutation({
		onSuccess: () => {
			const redirectTo = search.redirect || "/dashboard";
			window.location.href = redirectTo;
		},
		onError: (err) => {
			setError(err.message);
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		loginMutation.mutate({ email, password });
	};

	return (
		<div className="flex min-h-[calc(100vh-200px)] items-center justify-center">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>Welcome back</CardTitle>
					<CardDescription>
						Sign in to your Ardine account to continue
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						{error && (
							<Alert variant="destructive">
								<AlertDescription>{error}</AlertDescription>
							</Alert>
						)}

						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								placeholder="you@example.com"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
								autoComplete="email"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="password">Password</Label>
							<Input
								id="password"
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								autoComplete="current-password"
							/>
						</div>

						<Button
							type="submit"
							className="w-full"
							disabled={loginMutation.isPending}
						>
							{loginMutation.isPending ? "Signing in..." : "Sign in"}
						</Button>

						<div className="text-center text-sm text-muted-foreground">
							Don't have an account?{" "}
							<a href="/register" className="text-primary hover:underline">
								Sign up
							</a>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
