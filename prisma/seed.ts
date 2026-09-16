import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Menjalankan seed data lengkap...");

  const passwordHash = await bcrypt.hash("Password123!", 10);

  // 1. Akun Default Users dengan 4 Role Resmi:
  // - Owner: Akses penuh seluruh sistem
  // - Staff Marketing (admin_kasir): Kasir POS, penjualan, cetak invoice
  // - Staff Admin (staff_gudang): Gudang stok, data produk, barcode
  // - Staff Keuangan (staff_keuangan): Laporan keuangan, pengeluaran harian/bulanan
  const usersData = [
    {
      username: "owner",
      email: "owner@gloriaponsel.com",
      name: "Owner Gloria Ponsel",
      role: "owner" as const,
    },
    {
      username: "kasir",
      email: "kasir@gloriaponsel.com",
      name: "Staff Marketing (Kasir)",
      role: "admin_kasir" as const,
    },
    {
      username: "gudang",
      email: "gudang@gloriaponsel.com",
      name: "Staff Admin (Gudang)",
      role: "staff_gudang" as const,
    },
    {
      username: "keuangan",
      email: "keuangan@gloriaponsel.com",
      name: "Staff Keuangan",
      role: "staff_keuangan" as const,
    },
  ];

  const userMap = new Map<string, string>();
  for (const u of usersData) {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ username: u.username }, { email: u.email }],
      },
    });

    let savedUser;
    if (existing) {
      savedUser = await prisma.user.update({
        where: { id: existing.id },
        data: {
          username: u.username,
          name: u.name,
          email: u.email,
          role: u.role,
          passwordHash,
          isActive: true,
        },
      });
      console.log(`✅ User ${savedUser.name} (@${savedUser.username} | Role: ${savedUser.role}) diperbarui`);
    } else {
      savedUser = await prisma.user.create({
        data: {
          username: u.username,
          name: u.name,
          email: u.email,
          role: u.role,
          passwordHash,
          isActive: true,
        },
      });
      console.log(`✅ User ${savedUser.name} (@${savedUser.username} | Role: ${savedUser.role}) dibuat`);
    }
    userMap.set(u.username, savedUser.id);
  }

  // 2. Master Data Produk Lengkap (Brand, Kategori, & Supplier dicatat langsung)

  // 6. Products Lengkap dengan Tipe, IMEI, & Spesifikasi
  const productsData = [
    {
      name: "iPhone 15 Pro",
      brandName: "Apple",
      categoryName: "Smartphone",
      sku: "APL-IP15P-128",
      imei: "356789102345671",
      productType: "phone",
      capacity: "128GB",
      color: "Black Titanium",
      completeness: "Fullset Dus Box + Kabel Type-C",
      retailSupplier: "PT Surya Abadi Selular",
      grade: "Baru (BNIB)",
      status: "available",
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
      imei: "359876543210982",
      productType: "phone",
      capacity: "256GB",
      color: "Titanium Gray",
      completeness: "Fullset Dus Box + S-Pen",
      retailSupplier: "CV Maju Gadget Distribusi",
      grade: "Baru (BNIB)",
      status: "available",
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
      imei: "867890123456783",
      productType: "phone",
      capacity: "256GB",
      color: "Ocean Blue",
      completeness: "Fullset Dus Box + Charger 67W",
      retailSupplier: "PT Surya Abadi Selular",
      grade: "Baru (BNIB)",
      status: "available",
      variant: "8/256GB Ocean Blue",
      purchasePrice: 3600000,
      sellingPrice: 4299000,
      stock: 2, // Low stock
      minStock: 5,
      description: "Kamera 200MP OIS, Layar AMOLED 120Hz.",
    },
    {
      name: "Samsung Galaxy A55 5G",
      brandName: "Samsung",
      categoryName: "Smartphone",
      sku: "SMS-A55-256",
      imei: "351234567890124",
      productType: "phone",
      capacity: "256GB",
      color: "Awesome Iceblue",
      completeness: "Fullset Dus Box + Kabel Data",
      retailSupplier: "CV Maju Gadget Distribusi",
      grade: "Baru (BNIB)",
      status: "available",
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
      imei: null,
      productType: "accessory",
      capacity: null,
      color: "Original White",
      completeness: "Pack Segel Pabrik",
      retailSupplier: "PT Surya Abadi Selular",
      grade: "Original",
      status: "available",
      variant: "Original White",
      purchasePrice: 120000,
      sellingPrice: 250000,
      stock: 25,
      minStock: 10,
      description: "Pengisian daya cepat original 20W untuk iPhone dan iPad.",
    },
    {
      name: "Tempered Glass Anti-Spy iPhone 15",
      brandName: "Apple",
      categoryName: "Aksesoris",
      sku: "ACC-TG-IP15",
      imei: null,
      productType: "accessory",
      capacity: null,
      color: "Black Frame",
      completeness: "Dus + Tisu Pembersih",
      retailSupplier: "PT Surya Abadi Selular",
      grade: "Premium",
      status: "available",
      variant: "Anti-Spy 9H",
      purchasePrice: 25000,
      sellingPrice: 65000,
      stock: 50,
      minStock: 10,
      description: "Kaca tempered glass 9H privasi anti-intip sudut 28 derajat.",
    },
  ];

  const adminUserId = userMap.get("owner") || userMap.get("gudang")!;

  for (const prod of productsData) {
    const savedProd = await prisma.product.upsert({
      where: { sku: prod.sku },
      update: {
        name: prod.name,
        brandName: prod.brandName,
        categoryName: prod.categoryName,
        productType: prod.productType,
        imei: prod.imei,
        capacity: prod.capacity,
        color: prod.color,
        completeness: prod.completeness,
        retailSupplier: prod.retailSupplier,
        grade: prod.grade,
        status: prod.status,
        variant: prod.variant,
        purchasePrice: prod.purchasePrice,
        sellingPrice: prod.sellingPrice,
        stock: prod.stock,
        minStock: prod.minStock,
        description: prod.description,
      },
      create: {
        name: prod.name,
        brandName: prod.brandName,
        categoryName: prod.categoryName,
        sku: prod.sku,
        imei: prod.imei,
        productType: prod.productType,
        capacity: prod.capacity,
        color: prod.color,
        completeness: prod.completeness,
        retailSupplier: prod.retailSupplier,
        grade: prod.grade,
        status: prod.status,
        variant: prod.variant,
        purchasePrice: prod.purchasePrice,
        sellingPrice: prod.sellingPrice,
        stock: prod.stock,
        minStock: prod.minStock,
        description: prod.description,
      },
    });

    // Catat pergerakan stok awal jika belum pernah tercatat
    if (adminUserId && prod.stock > 0) {
      const existingMovement = await prisma.stockMovement.findFirst({
        where: { productId: savedProd.id },
      });

      if (!existingMovement) {
        await prisma.stockMovement.create({
          data: {
            productId: savedProd.id,
            type: "in",
            quantity: prod.stock,
            referenceType: "manual",
            note: "Stok awal master produk (Seeder)",
            createdById: adminUserId,
          },
        });
      }
    }
  }
  console.log("✅ Produk master & pergerakan stok awal berhasil disiapkan");

  // 7. Pengaturan Toko Gloria Ponsel
  const storeSetting = await prisma.storeSetting.findFirst();
  if (!storeSetting) {
    await prisma.storeSetting.create({
      data: {
        storeName: "Gloria Ponsel",
        logoUrl: "/logoGP.png",
        phone: "0812-3456-7890",
        address: "Jl. Sudirman No. 45, Jakarta Pusat",
        receiptFooter: "Terima kasih atas kunjungan Anda di Gloria Ponsel!\nGaransi toko 7 hari sejak pembelian.\nBarang yang sudah dibeli tidak dapat diuangkan kembali.",
        defaultMinStock: 5,
      },
    });
    console.log("✅ Profil pengaturan toko Gloria Ponsel berhasil dibuat");
  } else {
    await prisma.storeSetting.update({
      where: { id: storeSetting.id },
      data: {
        storeName: "Gloria Ponsel",
        logoUrl: "/logoGP.png",
        phone: "0812-3456-7890",
        address: "Jl. Sudirman No. 45, Jakarta Pusat",
        receiptFooter: "Terima kasih atas kunjungan Anda di Gloria Ponsel!\nGaransi toko 7 hari sejak pembelian.\nBarang yang sudah dibeli tidak dapat diuangkan kembali.",
      },
    });
    console.log("✅ Profil pengaturan toko Gloria Ponsel diperbarui");
  }

  // 8. Notifikasi Selamat Datang
  const notifCount = await prisma.notification.count();
  if (notifCount === 0) {
    await prisma.notification.create({
      data: {
        title: "Selamat Datang di Sistem Gloria Ponsel",
        message: "Sistem manajemen stok, POS kasir, dan keuangan Gloria Ponsel siap digunakan.",
        type: "general",
        isRead: false,
      },
    });
    console.log("✅ Notifikasi sambutan sistem berhasil disiapkan");
  }

  console.log("🎉 Seeding database MySQL Gloria Ponsel berhasil tuntas!");
}

main()
  .catch((e) => {
    console.error("❌ Terjadi kesalahan saat seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
