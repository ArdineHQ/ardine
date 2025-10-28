import { PageLayout } from "@/components/navigation";

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <PageLayout>{children}</PageLayout>;
}
