import { z } from "zod";

export const DateRangeQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const SalesReportQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  paymentMethod: z.string().optional(),
});

export type SalesReportQuery = z.infer<typeof SalesReportQuerySchema>;

export const StockReportQuerySchema = z.object({
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  stockStatus: z.enum(["all", "safe", "low", "out"]).default("all"),
});

export type StockReportQuery = z.infer<typeof StockReportQuerySchema>;

export const BestSellerQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.number().int().positive().default(10),
  sortBy: z.enum(["qty", "revenue"]).default("qty"),
});

export type BestSellerQuery = z.infer<typeof BestSellerQuerySchema>;
