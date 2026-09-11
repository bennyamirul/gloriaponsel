import { z } from "zod";

export const StockInItemSchema = z.object({
  productId: z.string().uuid("Pilih produk yang valid"),
  qty: z.coerce.number().int().min(1, "Jumlah minimal 1 unit"),
  unitCost: z.coerce.number().min(0, "Harga beli tidak boleh negatif"),
});

export const StockInSchema = z.object({
  supplierId: z.string().uuid("Pilih supplier"),
  invoiceNo: z.string().min(1, "Nomor surat jalan / faktur wajib diisi").trim(),
  purchaseDate: z.string().optional(),
  items: z.array(StockInItemSchema).min(1, "Minimal pilih 1 produk"),
});

export type StockInFormValues = z.infer<typeof StockInSchema>;

export const StockAdjustmentSchema = z.object({
  productId: z.string().uuid("Pilih produk"),
  type: z.enum(["increase", "decrease", "set"], {
    errorMap: () => ({ message: "Pilih jenis penyesuaian" }),
  }),
  quantity: z.coerce.number().int().min(1, "Jumlah minimal 1 unit"),
  note: z.string().min(5, "Alasan penyesuaian stok wajib diisi (minimal 5 karakter)").trim(),
});

export type StockAdjustmentFormValues = z.infer<typeof StockAdjustmentSchema>;
