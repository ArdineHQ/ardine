import type { Metadata } from "next";
import "@/app/globals.css";
import { GraphQLProvider } from "@/lib/graphql-client";
import { AuthProvider } from "@/lib/auth-context";
import { TeamProvider } from "@/lib/team-context";

export const metadata: Metadata = {
	title: "Ardine - Time Tracking & Invoicing",
	description: "Self-hosted time tracking and invoicing for freelancers and teams",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body className="antialiased">
				<AuthProvider>
					<TeamProvider>
						<GraphQLProvider>
							{children}
						</GraphQLProvider>
					</TeamProvider>
				</AuthProvider>
			</body>
		</html>
	);
}
