import { formatRupiah } from "@/lib/utils";

export interface CompositeSaleItem {
  productName: string;
  productImei?: string | null;
  productSku?: string | null;
  capacity?: string | null;
  color?: string | null;
  completeness?: string | null;
  qty?: number;
}

export interface CompositeParams {
  invoiceNo: string;
  transactionDate?: string | null;
  cashierName?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  total?: number | null;
  items?: CompositeSaleItem[] | null;
  imageSource: File | Blob | string;
}

/**
 * Format tanggal presisi Indonesia: 18 Sep 2026, 02.58 WIB
 */
export function formatProofDate(dateVal?: string | Date | null): string {
  if (!dateVal) return "-";
  try {
    const d = typeof dateVal === "string" ? new Date(dateVal) : dateVal;
    if (isNaN(d.getTime())) return String(dateVal);

    const day = String(d.getDate()).padStart(2, "0");
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "Mei",
      "Jun",
      "Jul",
      "Agu",
      "Sep",
      "Okt",
      "Nov",
      "Des",
    ];
    const month = months[d.getMonth()] || "Sep";
    const year = d.getFullYear();
    const hour = String(d.getHours()).padStart(2, "0");
    const minute = String(d.getMinutes()).padStart(2, "0");

    return `${day} ${month} ${year}, ${hour}.${minute} WIB`;
  } catch {
    return String(dateVal);
  }
}

/**
 * Helper untuk memformat teks caption WhatsApp bukti pembayaran
 * Sesuai spesifikasi tepat format pengguna
 */
export function formatWhatsAppProofCaption(params: {
  invoiceNo: string;
  transactionDate?: string | Date | null;
  cashierName?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  total?: number | null;
  items?: CompositeSaleItem[] | null;
}): string {
  const tgl = formatProofDate(params.transactionDate);
  const cashier = params.cashierName || "Kasir";
  const customerPart = params.customerName
    ? `${params.customerName}${params.customerPhone ? ` / ${params.customerPhone}` : ""}`
    : params.customerPhone || "Pelanggan Umum";

  const itemTexts = (params.items || [])
    .map((it) => {
      const prodName = String(it.productName || "Produk").trim();
      const capStr = it.capacity ? String(it.capacity).trim() : "";
      const colStr = it.color ? String(it.color).trim() : "";
      const imeiVal = it.productImei
        ? String(it.productImei).trim()
        : it.productSku
          ? String(it.productSku).trim()
          : "";

      const tokens: string[] = [prodName];
      if (capStr && !prodName.toLowerCase().includes(capStr.toLowerCase())) {
        tokens.push(capStr);
      }
      if (colStr && !prodName.toLowerCase().includes(colStr.toLowerCase())) {
        tokens.push(colStr);
      }
      if (imeiVal) {
        tokens.push(imeiVal);
      }

      const mainLine = tokens.join(" ");
      const completenessStr = it.completeness ? ` (${it.completeness.trim()})` : "";
      return `• ${mainLine}${completenessStr}`;
    })
    .join("\n");

  const formattedTotal = params.total ? formatRupiah(params.total) : "Rp 0";

  return `Bukti Pembayaran :

${tgl}
${params.invoiceNo}

Cashier : ${cashier}
Customer : ${customerPart}

List Produk :
${itemTexts || "• (Produk)"}

Total: ${formattedTotal}`;
}

/**
 * Menggambar 1 pesan gambar komposit utuh:
 * ┌─────────────────────────┐
 * │                         │
 * │   FOTO BUKTI TRANSFER   │  (Foto slip asli di bagian atas)
 * │                         │
 * ├─────────────────────────┤
 * │ Bukti Pembayaran        │  (Kotak caption dark-green di bawah)
 * │ INV-20260916-0001       │  (No Invoice - tanpa label)
 * │ 16 Sep 2026, 22.44 WIB  │  (Tgl Transaksi - tanpa label)
 * │ Staff Marketing (Kasir) │  (Kasir - tanpa label)
 * │ ADIT                    │  (Pelanggan - tanpa label)
 * │                         │
 * │ • Infinix Note 50 (8/256GB Forest Green) (Spesifikasi Produk)
 * │   8996006856180         │  (IMEI - tanpa label)
 * │                         │
 * │ Total: Rp 6.950.000     │  (Total Harga)
 * └─────────────────────────┘
 * Menghasilkan 1 file gambar JPEG komposit beresolusi tinggi yang 100% menyatu.
 */
export async function createCompositePaymentProof(params: CompositeParams): Promise<File> {
  const {
    invoiceNo,
    transactionDate,
    cashierName,
    customerName,
    total,
    items,
    imageSource,
  } = params;

  // 1. Muat gambar bukti transfer asli ke memori
  const img = new Image();
  let objectUrlToRevoke: string | null = null;
  if (imageSource instanceof Blob) {
    objectUrlToRevoke = URL.createObjectURL(imageSource);
    img.src = objectUrlToRevoke;
  } else {
    img.src = imageSource;
  }

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Gagal membaca file gambar bukti transfer."));
  });

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "-";
    try {
      const d = new Date(isoString);
      return (
        d.toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }) + " WIB"
      );
    } catch {
      return isoString;
    }
  };

  // 2. Hitung dimensi Canvas (lebar standar: 800px)
  const canvasWidth = 800;
  const paddingX = 36;
  const contentWidth = canvasWidth - paddingX * 2;

  // Hitung tinggi foto bukti transfer di atas secara proporsional
  const naturalWidth = img.naturalWidth || 800;
  const naturalHeight = img.naturalHeight || 600;
  const photoRatio = naturalHeight / naturalWidth;

  let targetPhotoHeight = Math.round(canvasWidth * photoRatio);
  // Batasi tinggi jika struk terlampau panjang agar proporsional
  if (targetPhotoHeight > 1400) {
    targetPhotoHeight = 1400;
  }
  if (targetPhotoHeight < 250) {
    targetPhotoHeight = 350;
  }

  // Hitung tinggi dinamis kotak caption di bawah
  const itemList = items && items.length > 0 ? items : [];
  let calculatedItemsHeight = 0;
  if (itemList.length > 0) {
    itemList.forEach((it) => {
      calculatedItemsHeight += 28; // baris spesifikasi produk
      if (it.productImei || it.productSku) {
        calculatedItemsHeight += 24; // baris IMEI/SKU
      }
    });
  } else {
    calculatedItemsHeight += 28;
  }

  // Baris dalam caption box:
  // Bukti Pembayaran (44px)
  // No Invoice (38px)
  // Tgl Transaksi (36px)
  // Kasir (36px)
  // Pelanggan (36px)
  // Spasi sebelum produk (18px)
  // calculatedItemsHeight
  // Spasi sebelum total (20px)
  // Total Pembayaran (48px)
  // Padding bawah & timestamp (44px)
  const captionBoxHeight =
    44 + 38 + 36 + 36 + 36 + 18 + calculatedItemsHeight + 20 + 48 + 44;

  const canvasHeight = targetPhotoHeight + captionBoxHeight;

  // 3. Buat Canvas
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
    throw new Error("Gagal menginisialisasi 2D Canvas context.");
  }

  // --- BAGIAN 1: FOTO BUKTI TRANSFER DI ATAS ---
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, canvasWidth, targetPhotoHeight);

  // Gambar foto asli utuh secara proporsional
  ctx.drawImage(img, 0, 0, canvasWidth, targetPhotoHeight);

  // --- BAGIAN 2: KOTAK CAPTION DI BAWAH ---
  // Menggunakan warna khas bubble WhatsApp Dark Green: #025144
  const captionY = targetPhotoHeight;
  ctx.fillStyle = "#025144";
  ctx.fillRect(0, captionY, canvasWidth, captionBoxHeight);

  // Garis pemisah halus antara foto dan rincian
  ctx.strokeStyle = "#056152";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, captionY);
  ctx.lineTo(canvasWidth, captionY);
  ctx.stroke();

  let lineY = captionY + 44;

  // Header: Bukti Pembayaran
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText("Bukti Pembayaran", paddingX, lineY);

  // 1. No Invoice (Hijau terang WhatsApp, monospace tebal - TANPA LABEL)
  lineY += 38;
  ctx.fillStyle = "#25d366";
  ctx.font = "bold 20px monospace";
  ctx.fillText(invoiceNo || "-", paddingX, lineY);

  // 2. Tanggal Transaksi (Abu-abu terang - TANPA LABEL)
  lineY += 36;
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText(formatDate(transactionDate), paddingX, lineY);

  // 3. Kasir (Putih tebal - TANPA LABEL)
  lineY += 36;
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText(cashierName || "Staff Marketing (Kasir)", paddingX, lineY);

  // 4. Pelanggan (Putih tebal - TANPA LABEL)
  lineY += 36;
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText(customerName || "Pelanggan Umum", paddingX, lineY);

  // Spasi sebelum produk
  lineY += 18;

  // 5 & 6. Spesifikasi Produk (nama + kapasitas + warna) & IMEI (TANPA LABEL)
  if (itemList.length > 0) {
    itemList.forEach((it) => {
      lineY += 28;
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

      const prodName = String(it.productName || "Produk");
      const capStr = it.capacity ? String(it.capacity) : "";
      const colStr = it.color ? String(it.color) : "";

      const specs = [
        capStr && !prodName.toLowerCase().includes(capStr.toLowerCase()) ? capStr : null,
        colStr && !prodName.toLowerCase().includes(colStr.toLowerCase()) ? colStr : null,
      ]
        .filter(Boolean)
        .join(" ");
      let displayName = specs ? `• ${prodName} (${specs})` : `• ${prodName}`;

      if (ctx.measureText(displayName).width > contentWidth) {
        while (ctx.measureText(displayName + "...").width > contentWidth && displayName.length > 10) {
          displayName = displayName.slice(0, -1);
        }
        displayName += "...";
      }
      ctx.fillText(displayName, paddingX, lineY);

      if (it.productImei || it.productSku) {
        lineY += 24;
        ctx.fillStyle = "#25d366";
        ctx.font = "bold 16px monospace";
        // Langsung tampilkan nomor IMEI tanpa teks "IMEI:"
        const imeiVal = it.productImei || it.productSku;
        ctx.fillText(`  ${imeiVal}`, paddingX, lineY);
      }
    });
  } else {
    lineY += 28;
    ctx.fillStyle = "#94a3b8";
    ctx.font = "italic 16px sans-serif";
    ctx.fillText("• (Produk)", paddingX, lineY);
  }

  // Spasi sebelum total
  lineY += 22;

  // 7. Total Harga (Hijau besar mencolok)
  lineY += 32;
  ctx.fillStyle = "#25d366";
  ctx.font = "bold 26px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText(`Total: ${total ? formatRupiah(total) : "Rp 0"}`, paddingX, lineY);

  // Timestamp & Centang WhatsApp di pojok kanan bawah
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")} ✓✓`;
  ctx.fillStyle = "#8696a0";
  ctx.font = "14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(timeStr, canvasWidth - paddingX, captionY + captionBoxHeight - 18);
  ctx.textAlign = "left";

  // 4. Ubah ke File Blob JPEG beresolusi tinggi
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.94);
  });

  if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);

  if (!blob) {
    throw new Error("Gagal mengonversi canvas bukti pembayaran.");
  }

  return new File([blob], `bukti-${invoiceNo}.jpg`, {
    type: "image/jpeg",
  });
}
