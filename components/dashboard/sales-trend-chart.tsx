"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { formatRupiah } from "@/lib/utils";

interface SalesTrendChartProps {
  data: {
    date: string;
    day: string;
    omzet: number;
    transactions: number;
  }[];
}

export function SalesTrendChart({ data }: SalesTrendChartProps) {
  const hasData = data && data.length > 0;

  if (!hasData) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Belum ada data penjualan 7 hari terakhir.
      </div>
    );
  }

  return (
    <div className="h-[280px] w-full pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="omzetGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563EB" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="date"
            stroke="#94a3b8"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            dy={8}
          />
          <YAxis
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => {
              if (val >= 1000000) {
                return `${(val / 1000000).toFixed(val % 1000000 === 0 ? 0 : 1)}jt`;
              }
              if (val >= 1000) {
                return `${(val / 1000).toFixed(0)}rb`;
              }
              return val.toString();
            }}
            dx={-4}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <div className="rounded-xl border border-border bg-white p-3 shadow-lg">
                    <p className="text-xs font-semibold text-muted-foreground">
                      {item.day}, {item.date}
                    </p>
                    <p className="text-sm font-bold text-primary mt-1">
                      {formatRupiah(item.omzet)}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {item.transactions} transaksi
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="omzet"
            stroke="#2563EB"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#omzetGradient)"
            activeDot={{ r: 6, fill: "#2563EB", stroke: "#ffffff", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
