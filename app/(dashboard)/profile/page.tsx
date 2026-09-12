import { redirect } from "next/navigation";
import { getProfileData } from "@/lib/actions/profile.actions";
import { ProfileClient } from "@/components/profile/profile-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pengaturan Profil - Gloria Ponsel",
  description: "Kelola profil akun, ubah nama, dan ganti kata sandi",
};

export default async function ProfilePage() {
  const profile = await getProfileData();

  if (!profile) {
    redirect("/login");
  }

  return <ProfileClient initialData={profile} />;
}
