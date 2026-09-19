import { requireRole } from "@/lib/auth";
import { getRoles } from "@/lib/actions/role.actions";
import { RolesClient } from "@/components/roles/roles-client";

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  await requireRole(["owner", "super_admin"]);
  const roles = await getRoles();

  return (
    <div className="space-y-6">
      <RolesClient initialRoles={roles} />
    </div>
  );
}
