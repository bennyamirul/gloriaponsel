import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Smartphone } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <Card className="w-full max-w-md border-slate-800 bg-slate-950 text-white shadow-2xl">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/30">
            <Smartphone className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight text-white">
            Toko Handphone
          </CardTitle>
          <CardDescription className="text-slate-400">
            Masuk ke panel dashboard internal toko
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="space-y-4">
            <div className="space-y-2 text-left">
              <Label htmlFor="email" className="text-xs text-slate-300">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@tokohp.com"
                className="border-slate-800 bg-slate-900 text-white placeholder:text-slate-500 focus:border-indigo-500"
              />
            </div>
            <div className="space-y-2 text-left">
              <Label htmlFor="password" className="text-xs text-slate-300">
                Kata Sandi
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className="border-slate-800 bg-slate-900 text-white placeholder:text-slate-500 focus:border-indigo-500"
              />
            </div>
            <Button
              type="button"
              className="w-full bg-indigo-600 font-semibold hover:bg-indigo-500"
            >
              Masuk (Phase 1)
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
