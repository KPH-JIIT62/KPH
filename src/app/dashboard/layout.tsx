import { DashboardShell } from "@/components/layout/dashboard-shell";
import { DashboardAccess } from "@/components/dashboard-access";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardAccess><DashboardShell>{children}</DashboardShell></DashboardAccess>;
}
