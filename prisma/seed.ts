import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Menjalankan seed data lengkap...");

  const passwordHash = await bcrypt.hash("Password123!", 10);

  // 1. Akun Default Users
  const superAdmin = await prisma.user.upsert({
    where: { email: "owner@tokohp.com" },
    update: { passwordHash, role: "super_admin", isActive: true },
    create: {
      name: "Super Admin Owner",
      email: "owner@tokohp.com",
      passwordHash,
      role: "super_admin",
      isActive: true,
    },
  });
  console.log(`✅ User Super Admin: ${superAdmin.email}`);

  const adminKasir = await prisma.user.upsert({
    where: { email: "kasir@tokohp.com" },
    update: { passwordHash, role: "admin", isActive: true },
    create: {
      name: "Staff Kasir",
      email: "kasir@tokohp.com",
      passwordHash,
      role: "admin",
      isActive: true,
    },
  });
  console.log(`✅ User Admin Kasir: ${adminKasir.email}`);

  // 2. Kategori
  const categoriesData = [
    { name: "Smartphone", description: "Handphone pintar berbagai merk" },
    { name: "Aksesoris", description: "Casing, charger, kabel, tempered glass" },
    { name: "Tablet", description: "Tablet android dan iPad" },
    { name: "Sparepart", description: "Baterai, LCD, dan komponen pengganti" },
  ];

  const categoryMap = new Map<string, string>();
  for (const cat of categoriesData) {
    const record = await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
    categoryMap.set(record.name, record.id);
  }
  console.log("✅ Kategori master berhasil disiapkan");

  // 3. Brands
  const brandsData = [
    { name: "Apple", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" },
    { name: "Samsung", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg" },
    { name: "Xiaomi", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/2/29/Xiaomi_logo.svg" },
    { name: "Oppo", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/b/b8/OPPO_Logo.svg" },
    { name: "Vivo", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/e/e5/Vivo_mobile_logo.png" },
  ];

  const brandMap = new Map<string, string>();
  for (const br of brandsData) {
    const record = await prisma.brand.upsert({
      where: { name: br.name },
      update: { logoUrl: br.logoUrl },
      create: br,
    });
    brandMap.set(record.name, record.id);
  }
  console.log("✅ Brand master berhasil disiapkan");

  // 4. Suppliers
  const suppliersData = [
    { name: "PT Surya Abadi Selular", phone: "081234567890", address: "Jl. Hayam Wuruk No. 12, Jakarta" },
    { name: "CV Maju Gadget Distribusi", phone: "081987654321", address: "Ruko ITC Roxy Mas Blok B No. 4, Jakarta" },
  ];

  for (const sup of suppliersData) {
    const existing = await prisma.supplier.findFirst({ where: { name: sup.name } });
    if (!existing) {
      await prisma.supplier.create({ data: sup });
    }
  }
  console.log("✅ Supplier master berhasil disiapkan");

  // 5. Customers
  const customersData = [
    { name: "Budi Santoso", phone: "085612341234", address: "Jl. Melati No. 5" },
    { name: "Siti Aminah", phone: "087799887766", address: "Perum Indah Blok C3" },
  ];

  for (const cust of customersData) {
    const existing = await prisma.customer.findFirst({ where: { name: cust.name } });
    if (!existing) {
      await prisma.customer.create({ data: cust });
    }
  }
  console.log("✅ Pelanggan master berhasil disiapkan");

  // 6. Products
  const productsData = [
    {
      name: "iPhone 15 Pro",
      brandName: "Apple",
      categoryName: "Smartphone",
      sku: "APL-IP15P-128",
      variant: "128GB Black Titanium",
      purchasePrice: 17500000,
      sellingPrice: 19999000,
      stock: 8,
      minStock: 3,
      description: "Garansi resmi iBox Indonesia. Garansi 1 tahun.",
    },
    {
      name: "Samsung Galaxy S24 Ultra",
      brandName: "Samsung",
      categoryName: "Smartphone",
      sku: "SMS-S24U-256",
      variant: "12/256GB Titanium Gray",
      purchasePrice: 18000000,
      sellingPrice: 20499000,
      stock: 6,
      minStock: 2,
      description: "Garansi resmi SEIN. Snapdragon 8 Gen 3 for Galaxy.",
    },
    {
      name: "Redmi Note 13 Pro 5G",
      brandName: "Xiaomi",
      categoryName: "Smartphone",
      sku: "XMI-RN13P-256",
      variant: "8/256GB Ocean Blue",
      purchasePrice: 3600000,
      sellingPrice: 4299000,
      stock: 2, // Low stock on purpose
      minStock: 5,
      description: "Kamera 200MP OIS, Layar AMOLED 120Hz.",
    },
    {
      name: "Samsung Galaxy A55 5G",
      brandName: "Samsung",
      categoryName: "Smartphone",
      sku: "SMS-A55-256",
      variant: "8/256GB Awesome Iceblue",
      purchasePrice: 5100000,
      sellingPrice: 5999000,
      stock: 14,
      minStock: 5,
      description: "Exynos 1480, Super AMOLED 120Hz, Baterai 5000mAh.",
    },
    {
      name: "Adaptor Charger 20W USB-C",
      brandName: "Apple",
      categoryName: "Aksesoris",
      sku: "ACC-CHG-20W",
      variant: "Original White",
      purchasePrice: 120000,
      sellingPrice: 250000,
      stock: 25,
      minStock: 10,
      description: "Pengisian daya cepat original 20W untuk iPhone dan iPad.",
    },
  ];

  for (const prod of productsData) {
    const brandId = brandMap.get(prod.brandName);
    const categoryId = categoryMap.get(prod.categoryName);

    if (brandId && categoryId) {
      await prisma.product.upsert({
        where: { sku: prod.sku },
        update: {
          purchasePrice: prod.purchasePrice,
          sellingPrice: prod.sellingPrice,
          stock: prod.stock,
        },
        create: {
          name: prod.name,
          brandId,
          categoryId,
          sku: prod.sku,
          variant: prod.variant,
          purchasePrice: prod.purchasePrice,
          sellingPrice: prod.sellingPrice,
          stock: prod.stock,
          minStock: prod.minStock,
          description: prod.description,
        },
      });
    }
  }
  console.log("✅ Produk master berhasil disiapkan");

  // 7. Pengaturan Toko Default
  const storeSetting = await prisma.storeSetting.findFirst();
  if (!storeSetting) {
    await prisma.storeSetting.create({
      data: {
        storeName: "Toko Handphone Sejahtera",
        phone: "0812-3456-7890",
        address: "Jl. Sudirman No. 45, Jakarta Pusat",
        receiptFooter: "Terima kasih atas kunjungan Anda!\nGaransi toko 7 hari sejak pembelian.\nBarang yang sudah dibeli tidak dapat diuangkan kembali.",
        defaultMinStock: 5,
      },
    });
    console.log("✅ Profil pengaturan toko default berhasil dibuat");
  }

  console.log("🎉 Seeding Phase 5 berhasil tuntas!");
}

main()
  .catch((e) => {
    console.error("❌ Terjadi kesalahan saat seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
