import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { Loader2, Leaf, Sparkles, Wind, ArrowUpRight, Heart } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") || "/dashboard";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Welcome back");
      navigate(redirect);
    } catch (error) {
      console.error("[BreatheRise] Sign-in failed:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to sign in right now. Please check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const oauth = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}` },
      });
      if (error) toast.error(error.message);
    } catch (error) {
      console.error("[BreatheRise] Google sign-in failed:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to start Google sign-in. Please try again.",
      );
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your BreatheRise account">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2" />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">Forgot?</Link>
          </div>
          <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2" />
        </div>
        <Button type="submit" disabled={loading} className="h-12 w-full rounded-xl bg-[#204b3b] font-semibold text-[#f4f3e9] shadow-[0_12px_28px_-14px_rgba(32,75,59,.65)] transition hover:bg-[#163a2d] dark:bg-[#a5c4a4] dark:text-[#183e32] dark:hover:bg-[#c0d8bd]">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Sign in
        </Button>
      </form>
      <Divider />
      <div className="grid gap-2">
        <OAuthBrandButton provider="google" onClick={oauth} />
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        New here? <Link to="/signup" className="text-foreground underline-offset-4 hover:underline">Create an account</Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="relative grid min-h-screen overflow-hidden bg-[#f4f3e9] text-[#183e32] dark:bg-[#101f18] dark:text-[#edf3e8] lg:grid-cols-[1.05fr_.95fr]">
      <div className="relative hidden min-h-screen overflow-hidden bg-[#183e32] p-10 text-[#f4f3e9] lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div className="pointer-events-none absolute -left-32 -top-24 h-[34rem] w-[34rem] rounded-full border border-[#a5c4a4]/20" />
        <div className="pointer-events-none absolute -left-12 top-10 h-[27rem] w-[27rem] rounded-full border border-[#a5c4a4]/25" />
        <div className="pointer-events-none absolute left-14 top-28 h-[20rem] w-[20rem] rounded-full border border-[#a5c4a4]/30" />
        <div className="pointer-events-none absolute -bottom-32 right-[-5rem] h-[28rem] w-[28rem] rounded-full bg-[#8ca887]/20 blur-3xl" />
        <div className="relative z-10 flex items-center justify-between">
          <Logo className="h-9 brightness-0 invert" />
          <span className="rounded-full border border-white/20 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.2em] text-[#d0dfcf]">Your space to grow</span>
        </div>
        <div className="relative z-10 my-14 max-w-xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#a5c4a4]/30 bg-white/5 px-4 py-2 text-xs tracking-wide text-[#d0dfcf]"><Sparkles className="h-4 w-4 text-[#c6d8a9]" /> A gentler kind of care</div>
          <h2 className="font-display text-5xl font-medium leading-[1.02] tracking-[-.065em] xl:text-7xl">You deserve<br />room to <span className="font-serif italic text-[#b8d1ad]">breathe.</span></h2>
          <p className="mt-6 max-w-md text-base leading-7 text-[#d0dfcf]">A little more calm. A little more clarity. Support that meets you where you are, without asking you to have it all figured out.</p>
          <div className="mt-10 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#b8d1ad]/40 bg-[#b8d1ad]/10"><Wind className="h-6 w-6 text-[#c6d8a9]" /></div>
            <div><p className="font-serif text-lg italic">“Begin where you are.”</p><p className="mt-1 text-[10px] uppercase tracking-[.18em] text-[#a9c3a8]">One step at a time</p></div>
          </div>
        </div>
        <div className="relative z-10 flex items-center justify-between border-t border-white/15 pt-5 text-xs text-[#b9cfb5]"><span>© {new Date().getFullYear()} BreatheRise</span><span className="inline-flex items-center gap-2"><Heart className="h-3.5 w-3.5" /> Made for real life</span></div>
      </div>
      <div className="relative flex min-h-screen items-center justify-center px-5 py-10 sm:px-10 lg:px-12">
        <div className="pointer-events-none absolute right-[-6rem] top-[-5rem] h-64 w-64 rounded-full border border-[#8eaa93]/25" />
        <div className="pointer-events-none absolute bottom-[-7rem] left-[-5rem] h-72 w-72 rounded-full bg-[#dce7d6]/50 blur-3xl dark:bg-[#294432]/40" />
        <div className="relative w-full max-w-md rounded-[2rem] border border-[#d4ddcf] bg-[#fffdf5]/95 p-6 shadow-[0_30px_90px_-45px_rgba(24,62,50,.35)] backdrop-blur-xl dark:border-[#365341] dark:bg-[#172b21]/95 sm:p-9">
          <div className="mb-7 flex items-center justify-between lg:hidden"><Logo className="h-8" /><span className="rounded-full bg-[#e1eadc] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.16em] text-[#315b49] dark:bg-[#294432] dark:text-[#c6d8a9]">Breathe easy</span></div>
          <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e1eadc] text-[#315b49] dark:bg-[#294432] dark:text-[#c6d8a9]"><Leaf className="h-5 w-5" /></div>
          <h1 className="font-display text-3xl font-medium tracking-[-.045em] sm:text-4xl">{title}</h1>
          {subtitle && <p className="mt-2 text-sm leading-6 text-[#66796b] dark:text-[#b9cfb5]">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          <p className="mt-7 text-center text-[10px] leading-5 text-[#718273] dark:text-[#9fb5a0]">A private space for your next step. <ArrowUpRight className="ml-1 inline h-3 w-3" /></p>
        </div>
      </div>
    </div>
  );
}

export function Divider() {
  return (
    <div className="my-5 flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs text-muted-foreground">or</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

export function OAuthBrandButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="outline" onClick={onClick} className="w-full justify-center gap-2 bg-card/80">
      <GoogleLogo />
      Continue with Google
    </Button>
  );
}

function GoogleLogo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38z" />
    </svg>
  );
}
