import { z } from "zod";

export const SaleItemSchema = z.object({
  productId: z.string().uuid("Pilih produk yang valid"),
  qty: z.coerce.number().int().min(1, "Jumlah minimal 1 unit"),
  unitPrice: z.coerce.number().min(0, "Harga jual tidak boleh negatif"),
});

export const CreateSaleSchema = z.object({
  customerId: z.string().uuid("ID Pelanggan tidak valid").optional().nullable(),
  customerName: z.string().optional().nullable(),
  customerPhone: z.string().optional().nullable(),
  paymentMethod: z.enum(["cash", "transfer", "edc", "qris"], {
    errorMap: () => ({ message: "Pilih metode pembayaran yang valid" }),
  }),
  discount: z.coerce.number().min(0, "Diskon tidak boleh negatif").default(0),
  additionalFee: z.coerce.number().min(0, "Biaya tambahan tidak boleh negatif").default(0),
  additionalFeeNote: z.string().optional().nullable(),
  warrantyDays: z.coerce.number().int().min(0, "Masa garansi tidak boleh negatif").default(0),
  items: z.array(SaleItemSchema).min(1, "Keranjang transaksi minimal berisi 1 barang"),
});

export type CreateSaleFormValues = z.infer<typeof CreateSaleSchema>;
