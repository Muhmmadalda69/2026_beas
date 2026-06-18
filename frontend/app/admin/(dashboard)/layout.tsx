import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import AdminShell from "@/components/AdminShell";

// Server-side guard for the admin dashboard. The middleware blocks requests
// without a cookie; here we additionally verify the token is still valid by
// asking the auth service, then render the authenticated shell.
export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <AdminShell username={admin.username} role={admin.role}>
      {children}
    </AdminShell>
  );
}
