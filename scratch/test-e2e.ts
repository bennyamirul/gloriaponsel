import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function runE2ETest() {
  console.log("=================================================");
  console.log("🚀 MEMULAI END-TO-END WORKFLOW TESTING (PHASE 6)");
  console.log("=================================================");

  // 1. Ambil User Owner & Supplier
  const owner = await db.user.findUnique({ where: { email: "owner@tokohp.com" } });
  if (!owner) throw new Error("Super admin owner@tokohp.com tidak ditemukan.");

  const category = await db.category.findFirst();
  const brand = await db.brand.findFirst();
  const supplier = await db.supplier.findFirst();

  if (!category || !brand || !supplier) {
    throw new Error("Master category/brand/supplier belum siap.");
  }

  const testSku = `TEST-E2E-${Date.now()}`;
  console.log(`\n[STEP 1] Membuat Produk Uji: ${testSku}`);

  // 2. Buat Produk Baru
  const testProduct = await db.product.create({
    data: {
      name: "E2E Test Handphone Pro",
      sku: testSku,
      variant: "8GB/256GB Black",
      categoryId: category.id,
      brandId: brand.id,
      purchasePrice: 3000000,
      sellingPrice: 4000000,
      stock: 0,
      minStock: 3,
    },
  });
  console.log(`✅ Produk uji dibuat. ID: ${testProduct.id}, Stok Awal: ${testProduct.stock}`);

  try {
    // 3. Stok Masuk (Penerimaan Barang Supplier)
    console.log(`\n[STEP 2] Stok Masuk: 10 unit dari supplier ${supplier.name}`);
    const purchase = await db.purchase.create({
      data: {
        invoiceNo: `PO-${Date.now()}`,
        supplierId: supplier.id,
        createdById: owner.id,
        items: {
          create: {
            productId: testProduct.id,
            qty: 10,
            unitCost: 3000000,
            subtotal: 30000000,
          },
        },
      },
    });

    await db.product.update({
      where: { id: testProduct.id },
      data: { stock: { increment: 10 } },
    });

    await db.stockMovement.create({
      data: {
        productId: testProduct.id,
        type: "in",
        quantity: 10,
        referenceType: "purchase",
        referenceId: purchase.id,
        note: `Stok Masuk dari Supplier PO #${purchase.invoiceNo}`,
        createdById: owner.id,
      },
    });

    const pAfterIn = await db.product.findUnique({ where: { id: testProduct.id } });
    if (pAfterIn?.stock !== 10) {
      throw new Error(`Stok setelah stok masuk salah: expected 10, got ${pAfterIn?.stock}`);
    }
    console.log(`✅ Stok bertambah menjadi: ${pAfterIn.stock} unit. Mutasi 'in' tercatat.`);

    // 4. Penyesuaian Stok (Stok Opname)
    console.log(`\n[STEP 3] Stok Opname: -1 unit (rusak/display)`);
    await db.product.update({
      where: { id: testProduct.id },
      data: { stock: { decrement: 1 } },
    });

    await db.stockMovement.create({
      data: {
        productId: testProduct.id,
        type: "adjustment",
        quantity: -1,
        referenceType: "manual",
        note: "Stok Opname: 1 unit rusak/display",
        createdById: owner.id,
      },
    });

    const pAfterAdj = await db.product.findUnique({ where: { id: testProduct.id } });
    if (pAfterAdj?.stock !== 9) {
      throw new Error(`Stok setelah adjustment salah: expected 9, got ${pAfterAdj?.stock}`);
    }
    console.log(`✅ Stok setelah penyesuaian: ${pAfterAdj.stock} unit. Mutasi 'adjustment' tercatat.`);

    // 5. Transaksi Kasir POS
    console.log(`\n[STEP 4] Transaksi Penjualan Kasir POS: Jual 2 unit`);
    const invoiceNo = `INV-${Date.now()}`;
    const qtyToSell = 2;
    const unitPrice = 4000000;
    const subtotal = qtyToSell * unitPrice; // 8.000.000
    const discount = 100000; // 100.000
    const total = subtotal - discount; // 7.900.000

    const sale = await db.$transaction(async (tx) => {
      // Potong stok
      await tx.product.update({
        where: { id: testProduct.id },
        data: { stock: { decrement: qtyToSell } },
      });

      // Catat mutasi keluar
      const m = await tx.stockMovement.create({
        data: {
          productId: testProduct.id,
          type: "out",
          quantity: -qtyToSell,
          referenceType: "sale",
          note: `Penjualan Kasir Faktur ${invoiceNo}`,
          createdById: owner.id,
        },
      });

      // Buat record sale
      return tx.sale.create({
        data: {
          invoiceNo,
          subtotal,
          discount,
          total,
          paymentMethod: "cash",
          status: "completed",
          cashierId: owner.id,
          items: {
            create: {
              productId: testProduct.id,
              qty: qtyToSell,
              unitPrice,
              unitCost: 3000000,
              subtotal,
            },
          },
        },
        include: { items: true },
      });
    });

    const pAfterSale = await db.product.findUnique({ where: { id: testProduct.id } });
    if (pAfterSale?.stock !== 7) {
      throw new Error(`Stok setelah penjualan salah: expected 7, got ${pAfterSale?.stock}`);
    }
    console.log(`✅ Transaksi ${sale.invoiceNo} sukses.`);
    console.log(`   Total Tagihan: Rp ${total.toLocaleString("id-ID")}`);
    console.log(`   Sisa Stok di Etalase: ${pAfterSale.stock} unit.`);

    // 6. Verifikasi Laba Kotor Transaksi
    const totalCogs = sale.items.reduce((acc, it) => acc + Number(it.unitCost) * it.qty, 0); // 6.000.000
    const profit = Number(sale.total) - totalCogs; // 7.900.000 - 6.000.000 = 1.900.000
    console.log(`✅ Audit Laba Transaksi: HPP = Rp ${totalCogs.toLocaleString("id-ID")}, Laba Kotor = Rp ${profit.toLocaleString("id-ID")}`);

    if (profit !== 1900000) {
      throw new Error(`Kalkulasi laba tidak sesuai: expected 1900000, got ${profit}`);
    }

    // 7. Pembatalan Transaksi (Cancellation & Return to Stock)
    console.log(`\n[STEP 5] Pembatalan Transaksi Penjualan: ${sale.invoiceNo}`);
    await db.$transaction(async (tx) => {
      // Ubah status jadi cancelled
      await tx.sale.update({
        where: { id: sale.id },
        data: { status: "cancelled" },
      });

      // Kembalikan stok
      await tx.product.update({
        where: { id: testProduct.id },
        data: { stock: { increment: qtyToSell } },
      });

      // Catat mutasi pengembalian
      await tx.stockMovement.create({
        data: {
          productId: testProduct.id,
          type: "in",
          quantity: qtyToSell,
          referenceType: "sale",
          referenceId: sale.id,
          note: `Pengembalian stok pembatalan transaksi ${sale.invoiceNo}`,
          createdById: owner.id,
        },
      });
    });

    const pAfterCancel = await db.product.findUnique({ where: { id: testProduct.id } });
    if (pAfterCancel?.stock !== 9) {
      throw new Error(`Stok setelah pembatalan salah: expected 9, got ${pAfterCancel?.stock}`);
    }
    console.log(`✅ Transaksi berhasil dibatalkan. Stok pulih kembali ke ${pAfterCancel.stock} unit.`);

    // 8. Verifikasi Kartu Stok (Running Balance)
    console.log(`\n[STEP 6] Memverifikasi Kartu Stok Kronologis`);
    const allMovements = await db.stockMovement.findMany({
      where: { productId: testProduct.id },
      orderBy: { createdAt: "asc" },
    });

    let running = 0;
    for (const m of allMovements) {
      running += m.quantity;
      console.log(`   - Mutasi ${m.type.toUpperCase()}: ${m.quantity > 0 ? "+" : ""}${m.quantity} -> Saldo: ${running} (${m.note})`);
    }

    if (running !== 9) {
      throw new Error(`Saldo akhir kartu stok tidak cocok: expected 9, got ${running}`);
    }
    console.log(`✅ Kartu stok saldo berjalan akurat 100%!`);

    // 9. Cleanup Data Uji
    console.log(`\n[STEP 7] Membersihkan data uji`);
    await db.saleItem.deleteMany({ where: { saleId: sale.id } });
    await db.sale.delete({ where: { id: sale.id } });
    await db.purchaseItem.deleteMany({ where: { purchaseId: purchase.id } });
    await db.purchase.delete({ where: { id: purchase.id } });
    await db.stockMovement.deleteMany({ where: { productId: testProduct.id } });
    await db.product.delete({ where: { id: testProduct.id } });
    console.log(`✅ Data uji berhasil dibersihkan dari database.`);

    console.log("\n=================================================");
    console.log("🎉 SELURUH PENGUJIAN END-TO-END BERHASIL 100%!");
    console.log("=================================================");
  } catch (error) {
    // Cleanup if error
    try {
      await db.stockMovement.deleteMany({ where: { productId: testProduct.id } });
      await db.product.delete({ where: { id: testProduct.id } });
    } catch {}
    throw error;
  } finally {
    await db.$disconnect();
  }
}

runE2ETest().catch((err) => {
  console.error("❌ E2E TEST FAILED:", err);
  process.exit(1);
});
