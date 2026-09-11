"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Smartphone, Lock, Mail, Loader2 } from "lucide-react";
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
import {
  LoginSchema,
  LoginFormValues,
  loginAction,
} from "@/lib/actions/auth.actions";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await loginAction(values);
      if (res.error) {
        setErrorMessage(res.error);
        toast.error(res.error);
      } else if (res.success) {
        toast.success("Login berhasil! Mengalihkan ke dashboard...");
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      const errText = "Terjadi kesalahan sistem yang tidak terduga.";
      setErrorMessage(errText);
      toast.error(errText);
    } finally {
      setIsLoading(false);
    }
  };

  // Quick fill helper for dev testing
  const handleQuickFill = (email: string) => {
    form.setValue("email", email);
    form.setValue("password", "Password123!");
  };

  return (
    <div className="w-full max-w-md space-y-6 relative z-10">
      <Card className="border-slate-800/80 bg-slate-900/90 text-white shadow-2xl backdrop-blur-md rounded-3xl">
        <CardHeader className="space-y-3 text-center pb-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/30">
            <Smartphone className="h-7 w-7" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold tracking-tight text-white">
              Toko Handphone
            </CardTitle>
            <CardDescription className="text-sm text-slate-400 mt-1">
              Sistem Manajemen & Admin Dashboard Internal
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {errorMessage && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300 font-medium animate-in fade-in">
              {errorMessage}
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-slate-300">
                      Alamat Email
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <Input
                          placeholder="nama@tokohp.com"
                          type="email"
                          autoComplete="email"
                          className="border-slate-800 bg-slate-950/80 pl-10 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl h-11"
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
                        <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <Input
                          placeholder="••••••••"
                          type="password"
                          autoComplete="current-password"
                          className="border-slate-800 bg-slate-950/80 pl-10 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl h-11"
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
                className="w-full h-11 rounded-xl bg-indigo-600 font-bold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500 active:scale-[0.99] mt-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memverifikasi...
                  </>
                ) : (
                  "Masuk ke Dashboard"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Development Quick-Login Helper */}
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-4 text-xs text-slate-400 backdrop-blur-sm">
        <p className="font-semibold text-slate-300 mb-2">
          Akun Default Development:
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleQuickFill("owner@tokohp.com")}
            className="flex flex-col items-start rounded-lg border border-slate-800 bg-slate-950/60 p-2 text-left hover:border-indigo-500/50 transition"
          >
            <span className="font-medium text-indigo-400">Super Admin</span>
            <span className="text-[11px] text-slate-400 truncate w-full">owner@tokohp.com</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill("kasir@tokohp.com")}
            className="flex flex-col items-start rounded-lg border border-slate-800 bg-slate-950/60 p-2 text-left hover:border-indigo-500/50 transition"
          >
            <span className="font-medium text-purple-400">Admin Kasir</span>
            <span className="text-[11px] text-slate-400 truncate w-full">kasir@tokohp.com</span>
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-2 text-center">
          Password: <code className="text-slate-200">Password123!</code> (Klik kartu untuk auto-fill)
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Background Decorative Blur */}
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-purple-600/20 blur-3xl" />

      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
            <span>Memuat formulir...</span>
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
