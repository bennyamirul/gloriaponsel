"use client";

import { useState } from "react";
import { ExternalLink, ShoppingBag, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export interface ShopeeTrendingItem {
  id: string;
  rank: number;
  name: string;
  brand: string;
  category: "all" | "iphone" | "android" | "accessories";
  categoryLabel: string;
  priceRange: string;
  monthlySold: string;
  trendRating: string;
  statusHighlight?: string;
  shopeeSearchQuery: string;
}

const DEFAULT_SHOPEE_TRENDS: ShopeeTrendingItem[] = [
  {
    id: "shopee-1",
    rank: 1,
    name: "Apple iPhone 13 128GB",
    brand: "Apple",
    category: "iphone",
    categoryLabel: "iPhone",
    priceRange: "Rp 8.950.000 - Rp 9.499.000",
    monthlySold: "2.8k+ unit / bln",
    trendRating: "Paling Dicari",
    statusHighlight: "Best Seller iOS",
    shopeeSearchQuery: "iPhone 13 128GB garansi resmi",
  },
  {
    id: "shopee-2",
    rank: 2,
    name: "Samsung Galaxy A55 5G (8/256GB)",
    brand: "Samsung",
    category: "android",
    categoryLabel: "Android",
    priceRange: "Rp 5.499.000 - Rp 5.899.000",
    monthlySold: "3.5k+ unit / bln",
    trendRating: "Best Midrange",
    statusHighlight: "Laris Manis",
    shopeeSearchQuery: "Samsung Galaxy A55 5G 8 256GB",
  },
  {
    id: "shopee-3",
    rank: 3,
    name: "Xiaomi Redmi Note 13 (8/256GB)",
    brand: "Xiaomi",
    category: "android",
    categoryLabel: "Android",
    priceRange: "Rp 2.199.000 - Rp 2.499.000",
    monthlySold: "5.1k+ unit / bln",
    trendRating: "Volume Tertinggi",
    statusHighlight: "Entry-Level Favorit",
    shopeeSearchQuery: "Redmi Note 13 8 256GB",
  },
  {
    id: "shopee-4",
    rank: 4,
    name: "Infinix Note 40 4G (8/256GB)",
    brand: "Infinix",
    category: "android",
    categoryLabel: "Android",
    priceRange: "Rp 2.350.000 - Rp 2.599.000",
    monthlySold: "2.1k+ unit / bln",
    trendRating: "Naik Daun",
    statusHighlight: "Gaming Murah",
    shopeeSearchQuery: "Infinix Note 40 8 256GB",
  },
  {
    id: "shopee-5",
    rank: 5,
    name: "Apple iPhone 15 128GB",
    brand: "Apple",
    category: "iphone",
    categoryLabel: "iPhone",
    priceRange: "Rp 12.899.000 - Rp 13.499.000",
    monthlySold: "1.9k+ unit / bln",
    trendRating: "Flagship Populer",
    statusHighlight: "High Demand",
    shopeeSearchQuery: "iPhone 15 128GB garansi resmi iBox",
  },
  {
    id: "shopee-6",
    rank: 6,
    name: "Adapter Charger 20W Fast Charging",
    brand: "Aksesoris",
    category: "accessories",
    categoryLabel: "Aksesoris",
    priceRange: "Rp 85.000 - Rp 149.000",
    monthlySold: "8.4k+ unit / bln",
    trendRating: "Aksesoris Terlaris",
    statusHighlight: "Margin Tinggi",
    shopeeSearchQuery: "charger 20W type C fast charging",
  },
];

export function ShopeeMarketTrendsCard() {
  const [selectedCategory, setSelectedCategory] = useState<
    "all" | "iphone" | "android" | "accessories"
  >("all");

  const filteredTrends = DEFAULT_SHOPEE_TRENDS.filter((item) => {
    if (selectedCategory === "all") return true;
    return item.category === selectedCategory;
  });

  return (
    <Card className="shadow-xs border border-border/70 rounded-xl h-full flex flex-col bg-card">
      <CardContent className="p-5 flex flex-col flex-1">
        {/* Header Widget */}
        <div className="flex flex-col gap-2.5 pb-3 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-[#EE4D2D]/15 text-[#EE4D2D] flex items-center justify-center shrink-0">
                <ShoppingBag className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-foreground">
                Tren Pasar Shopee
              </h3>
            </div>
            <span className="text-[11px] font-medium text-muted-foreground">
              Market Insight
            </span>
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1 p-0.5 bg-muted/60 rounded-lg border border-border/50 text-[10px] overflow-x-auto">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`px-2 py-0.5 rounded-md font-medium whitespace-nowrap transition ${
                selectedCategory === "all"
                  ? "bg-background text-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory("iphone")}
              className={`px-2 py-0.5 rounded-md font-medium whitespace-nowrap transition ${
                selectedCategory === "iphone"
                  ? "bg-background text-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              iPhone
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory("android")}
              className={`px-2 py-0.5 rounded-md font-medium whitespace-nowrap transition ${
                selectedCategory === "android"
                  ? "bg-background text-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Android
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory("accessories")}
              className={`px-2 py-0.5 rounded-md font-medium whitespace-nowrap transition ${
                selectedCategory === "accessories"
                  ? "bg-background text-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Aksesoris
            </button>
          </div>
        </div>

        {/* Item List */}
        <div className="mt-3.5 space-y-2 flex-1">
          {filteredTrends.slice(0, 5).map((item, idx) => {
            const shopeeSearchUrl =
              "https://shopee.co.id/search?keyword=" +
              encodeURIComponent(item.shopeeSearchQuery);

            return (
              <div
                key={item.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-muted/20 hover:bg-muted/40 transition border border-border/40 gap-2"
              >
                {/* Ranking & Info */}
                <div className="flex items-center gap-2 min-w-0 pr-1 flex-1">
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
                      idx === 0
                        ? "bg-[#EE4D2D] text-white"
                        : idx === 1
                        ? "bg-amber-500 text-white"
                        : idx === 2
                        ? "bg-orange-400 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    #{idx + 1}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {item.name}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold truncate">
                        {item.priceRange}
                      </span>
                      <span>•</span>
                      <span className="shrink-0">{item.monthlySold}</span>
                    </div>
                  </div>
                </div>

                {/* Direct Action Button: Cek di Shopee */}
                <div className="shrink-0">
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-[10px] rounded-md border-[#EE4D2D]/30 text-[#EE4D2D] hover:bg-[#EE4D2D]/10 hover:text-[#EE4D2D] font-semibold gap-1 transition"
                  >
                    <a
                      href={shopeeSearchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={"Buka pencarian " + item.name + " di Shopee"}
                    >
                      <span>Cek</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Insight */}
        <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1 min-w-0">
            <Info className="h-3 w-3 text-[#EE4D2D] shrink-0" />
            <span className="truncate">Patokan harga pasar & restock.</span>
          </div>
          <a
            href="https://shopee.co.id"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#EE4D2D] hover:underline font-semibold shrink-0 ml-1"
          >
            shopee.co.id &rarr;
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
