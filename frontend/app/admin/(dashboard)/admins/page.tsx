import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import AdminsManager from "@/components/AdminsManager";

// Admin account management (RBAC) — restricted to superadmins.
export default async function AdminsPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  if (admin.role !== "superadmin") redirect("/admin");

  return <AdminsManager currentUsername={admin.username} />;
}
