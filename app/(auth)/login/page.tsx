"use client";

import { Suspense, useState, useEffect } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Lock,
  User,
  Loader2,
  Sparkles,
  Smartphone,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { LoginSchema, LoginFormValues } from "@/lib/validations/auth.schema";
import { loginAction } from "@/lib/actions/auth.actions";
import { LoginInteractiveBackground } from "@/components/auth/login-interactive-background";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await loginAction(values);
      if (res?.error) {
        setErrorMessage(res.error);
        toast.error(res.error);
      } else if (res?.success) {
        toast.success("Login berhasil! Mengalihkan ke dashboard...");
        router.replace(callbackUrl);
        window.location.href = callbackUrl;
      }
    } catch (err: any) {
      if (err?.message === "NEXT_REDIRECT" || err?.digest?.startsWith("NEXT_REDIRECT")) {
        return;
      }
      const errText = "Terjadi kesalahan sistem yang tidak terduga.";
      setErrorMessage(errText);
      toast.error(errText);
    } finally {
      setIsLoading(false);
    }
  };

  // Jika di HP terlanjur tersubmit via GET (query param di URL), tangani otomatis & bersihkan URL
  useEffect(() => {
    const urlUsername = searchParams.get("username");
    const urlPassword = searchParams.get("password");
    if (urlUsername && urlPassword) {
      window.history.replaceState({}, "", "/login");
      form.setValue("username", urlUsername);
      form.setValue("password", urlPassword);
      onSubmit({ username: urlUsername, password: urlPassword });
    }
  }, [searchParams]);

  const handleQuickFill = (u: string, p: string) => {
    form.setValue("username", u, { shouldValidate: true });
    form.setValue("password", p, { shouldValidate: true });
    toast.info(`Akun ${u.toUpperCase()} siap digunakan.`);
  };

  return (
    <div className="w-full max-w-md space-y-6 relative z-10">
      <Card className="border border-teal-500/25 bg-slate-950/75 text-white shadow-[0_0_60px_-15px_rgba(5,91,90,0.5)] backdrop-blur-2xl rounded-3xl relative overflow-hidden transition-all duration-300 hover:border-teal-500/40">
        {/* Subtle Top Glow Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-teal-400 to-transparent opacity-80" />

        <CardHeader className="space-y-3 text-center pb-5 pt-8">
          {/* Logo with Soft Glowing Ambient Halo */}
          <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-[#055B5A]/35 blur-xl animate-pulse pointer-events-none" />
            <Image
              src="/logoGP.png"
              alt="Gloria Ponsel Logo"
              width={76}
              height={76}
              className="relative h-full w-full object-contain drop-shadow-[0_4px_16px_rgba(5,91,90,0.5)]"
              priority
            />
          </div>

          <div>
            <CardTitle className="text-2xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
              <span>Gloria Ponsel</span>
            </CardTitle>
            <CardDescription className="text-xs text-teal-300/80 mt-1 font-medium">
              {/*Sistem Manajemen & Kasir POS Smartphone*/}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 px-6 sm:px-8 pb-7">
          {errorMessage && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300 font-medium animate-in fade-in">
              {errorMessage}
            </div>
          )}

          <Form {...form}>
            <form
              method="POST"
              action={async (formData: FormData) => {
                setIsLoading(true);
                setErrorMessage(null);
                try {
                  const res = await loginAction(formData);
                  if (res?.error) {
                    setErrorMessage(res.error);
                    toast.error(res.error);
                  }
                } catch (err: any) {
                  if (
                    err?.message === "NEXT_REDIRECT" ||
                    err?.digest?.startsWith("NEXT_REDIRECT")
                  ) {
                    return;
                  }
                  setErrorMessage("Terjadi kesalahan sistem.");
                } finally {
                  setIsLoading(false);
                }
              }}
              onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit(onSubmit)(e);
              }}
              className="space-y-4"
            >
              <input type="hidden" name="callbackUrl" value={callbackUrl} />
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-slate-300">
                      Username
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-500/70" />
                        <Input
                          placeholder="Masukkan username Anda"
                          type="text"
                          autoComplete="username"
                          className="border-slate-800/80 bg-slate-900/90 pl-10 text-white placeholder:text-slate-500 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 rounded-xl h-11 text-xs transition shadow-inner"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-rose-400 text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-slate-300">
                      Kata Sandi
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-500/70" />
                        <Input
                          placeholder="••••••••"
                          type="password"
                          autoComplete="current-password"
                          className="border-slate-800/80 bg-slate-900/90 pl-10 text-white placeholder:text-slate-500 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 rounded-xl h-11 text-xs transition shadow-inner"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-rose-400 text-xs" />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 rounded-xl bg-[#055B5A] hover:bg-[#044a49] active:scale-[0.99] font-bold text-white shadow-lg shadow-teal-950/60 border border-teal-400/20 transition-all duration-200 mt-2 text-xs cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memverifikasi Akun...
                  </>
                ) : (
                  "Masuk ke Dashboard"
                )}
              </Button>
            </form>
          </Form>

          {/* Quick Login Role Shortcuts */}
          {/* <div className="pt-2 border-t border-slate-800/60 space-y-2">
            <p className="text-[11px] text-slate-400 text-center font-medium flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>Pilihan Akses Cepat (Demo):</span>
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill("owner", "Password123!")}
                className="px-2 py-1.5 rounded-lg border border-teal-500/20 bg-teal-950/20 hover:bg-teal-900/30 text-teal-300 hover:text-white text-[11px] font-semibold transition flex flex-col items-center justify-center cursor-pointer"
              >
                <span>Owner</span>
                <span className="text-[9px] text-teal-400/60">Semua Akses</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill("kasir", "Password123!")}
                className="px-2 py-1.5 rounded-lg border border-teal-500/20 bg-teal-950/20 hover:bg-teal-900/30 text-teal-300 hover:text-white text-[11px] font-semibold transition flex flex-col items-center justify-center cursor-pointer"
              >
                <span>Kasir</span>
                <span className="text-[9px] text-teal-400/60">POS Penjualan</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill("gudang", "Password123!")}
                className="px-2 py-1.5 rounded-lg border border-teal-500/20 bg-teal-950/20 hover:bg-teal-900/30 text-teal-300 hover:text-white text-[11px] font-semibold transition flex flex-col items-center justify-center cursor-pointer"
              >
                <span>Gudang</span>
                <span className="text-[9px] text-teal-400/60">Unit & Barcode</span>
              </button>
            </div>
          </div> */}
        </CardContent>
      </Card>

      <p className="text-[11px] text-teal-400/40 text-center font-mono">
        Gloria Ponsel Backoffice Management System
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 relative overflow-hidden bg-[#011414]">
      {/* Interactive Thematic Phone Store Background */}
      <LoginInteractiveBackground />

      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-teal-400 text-sm z-10">
            <Loader2 className="h-5 w-5 animate-spin text-teal-400" />
            <span>Memuat sistem...</span>
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
