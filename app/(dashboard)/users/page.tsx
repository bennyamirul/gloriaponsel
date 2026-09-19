import { requireRole, getCurrentUser } from "@/lib/auth";
import { getUsers } from "@/lib/actions/user.actions";
import { getRoles } from "@/lib/actions/role.actions";
import { UsersClient } from "@/components/users/users-client";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  await requireRole(["owner", "super_admin"]);
  const currentUser = await getCurrentUser();
  const [users, roles] = await Promise.all([getUsers(), getRoles()]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Manajemen User & Hak Akses
        </h2>
        <p className="text-sm text-muted-foreground">
          Khusus Owner: kelola akun, atur hak akses (Owner, Admin Kasir, Staff Gudang), reset password, dan status aktif.
        </p>
      </div>

      <UsersClient
        initialUsers={users}
        roles={roles}
        currentUserId={currentUser?.id}
      />
    </div>
  );
}
