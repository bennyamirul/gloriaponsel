import { requireRole, getCurrentUser } from "@/lib/auth";
import { getUsers } from "@/lib/actions/user.actions";
import { UsersClient } from "@/components/users/users-client";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  await requireRole(["super_admin"]);
  const currentUser = await getCurrentUser();
  const users = await getUsers();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Manajemen User & Staf Kasir
        </h2>
        <p className="text-sm text-muted-foreground">
          Khusus Super Admin: kelola akun, atur hak akses (Super Admin vs Admin Kasir), reset password, dan status aktif.
        </p>
      </div>

      <UsersClient initialUsers={users} currentUserId={currentUser?.id} />
    </div>
  );
}
