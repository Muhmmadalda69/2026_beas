import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import RedocViewer from "@/components/RedocViewer";

// Developer API documentation — restricted to superadmins.
export default async function AdminDocsPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  if (admin.role !== "superadmin") redirect("/admin");

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-foreground">
        Dokumentasi API
      </h1>
      <p className="mt-1 text-muted">
        Referensi internal — hanya dapat diakses oleh superadmin.
      </p>
      <div className="mt-6">
        <RedocViewer />
      </div>
    </div>
  );
}
