import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegister } from "@/components/notifications/service-worker-register";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Gloria Ponsel — Admin Dashboard",
  description: "Sistem Manajemen Internal Gloria Ponsel",
  manifest: "/manifest.json",
  icons: {
    icon: "/logoGP.png",
    apple: "/logoGP.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Gloria Ponsel",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${inter.variable} font-sans antialiased`}>
        <ServiceWorkerRegister />
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
