import { requireRole } from "@/lib/auth";
import { getCatalogs } from "@/lib/actions/catalog.actions";
import { CatalogsClient } from "@/components/catalogs/catalogs-client";

export const dynamic = "force-dynamic";

export default async function CatalogsPage() {
  const user = await requireRole(["owner", "super_admin", "staff_gudang"]);
  const data = await getCatalogs({ limit: 100 });

  return (
    <div className="space-y-6">
      <CatalogsClient
        initialCatalogs={data.catalogs}
        currentUserRole={user.role}
      />
    </div>
  );
}
