import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") || "/dashboard";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    navigate(redirect);
  };

  const oauth = async (provider: "google" | "facebook") => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}` },
    });
    if (error) toast.error(error.message);
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
        <Button type="submit" disabled={loading} className="w-full bg-gradient-brand text-primary-foreground shadow-brand">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Sign in
        </Button>
      </form>
      <Divider />
      <div className="grid gap-2">
        <OAuthBrandButton provider="google" onClick={() => oauth("google")} />
        <OAuthBrandButton provider="facebook" onClick={() => oauth("facebook")} />
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        New here? <Link to="/signup" className="text-foreground underline-offset-4 hover:underline">Create an account</Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen bg-gradient-page lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-gradient-vivid p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <Logo className="h-9 brightness-0 invert" />
        <div>
          <h2 className="text-4xl font-bold leading-tight">Breathe deeply. Rise higher.</h2>
          <p className="mt-4 max-w-md opacity-90">
            Vetted specialists. Discreet sessions. Measurable results.
          </p>
        </div>
        <div className="text-sm opacity-75">© {new Date().getFullYear()} BreatheRise</div>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm rounded-lg border bg-card/90 p-5 shadow-glow backdrop-blur sm:p-7 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
          <div className="mb-8 lg:hidden"><Logo className="h-8" /></div>
          <h1 className="text-3xl font-bold">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
          <div className="mt-8">{children}</div>
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

export function OAuthBrandButton({ provider, onClick }: { provider: "google" | "facebook"; onClick: () => void }) {
  const isGoogle = provider === "google";
  return (
    <Button variant="outline" onClick={onClick} className="w-full justify-center gap-2 bg-card/80">
      {isGoogle ? <GoogleLogo /> : <FacebookLogo />}
      Continue with {isGoogle ? "Google" : "Facebook"}
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

function FacebookLogo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <path fill="#1877F2" d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.03 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.09 24 18.1 24 12.07z" />
      <path fill="#fff" d="m16.67 15.56.53-3.49h-3.33V9.81c0-.96.47-1.89 1.96-1.89h1.51V4.95s-1.37-.24-2.68-.24c-2.74 0-4.53 1.67-4.53 4.7v2.66H7.08v3.49h3.05V24a12.4 12.4 0 0 0 3.74 0v-8.44h2.8z" />
    </svg>
  );
}
