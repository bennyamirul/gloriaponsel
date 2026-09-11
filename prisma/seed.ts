import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Menjalankan seed akun default...");

  const passwordHash = await bcrypt.hash("Password123!", 10);

  // 1. Akun Super Admin (Owner Toko)
  const superAdmin = await prisma.user.upsert({
    where: { email: "owner@tokohp.com" },
    update: {
      passwordHash,
      role: "super_admin",
      isActive: true,
    },
    create: {
      name: "Super Admin Owner",
      email: "owner@tokohp.com",
      passwordHash,
      role: "super_admin",
      isActive: true,
    },
  });
  console.log(`✅ Super Admin siap: ${superAdmin.email} (Role: ${superAdmin.role})`);

  // 2. Akun Admin (Staff Kasir Toko)
  const adminKasir = await prisma.user.upsert({
    where: { email: "kasir@tokohp.com" },
    update: {
      passwordHash,
      role: "admin",
      isActive: true,
    },
    create: {
      name: "Staff Kasir",
      email: "kasir@tokohp.com",
      passwordHash,
      role: "admin",
      isActive: true,
    },
  });
  console.log(`✅ Admin Kasir siap: ${adminKasir.email} (Role: ${adminKasir.role})`);

  console.log("🎉 Seeding selesai! Kredensial default: Password123!");
}

main()
  .catch((e) => {
    console.error("❌ Terjadi kesalahan saat seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
