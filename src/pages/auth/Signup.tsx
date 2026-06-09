import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { AuthShell, Divider, OAuthBrandButton } from "./Login";

export default function Signup() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notify, setNotify] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      try { await Notification.requestPermission(); } catch { /* ignore */ }
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, notifications_opt_in: notify },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    if (notify) await requestNotificationPermission();
    toast.success("Check your email for a 6-digit verification code.");
    navigate(`/verify-otp?email=${encodeURIComponent(email)}`);
  };

  const oauth = async (provider: "google" | "facebook") => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) toast.error(error.message);
  };

  return (
    <AuthShell title="Create your account" subtitle="Start in under a minute">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Full name</Label>
          <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-2" />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2" />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2" />
          <p className="mt-1 text-xs text-muted-foreground">At least 8 characters.</p>
        </div>
        <label className="flex items-start gap-2 text-sm text-muted-foreground">
          <Checkbox checked={notify} onCheckedChange={(v) => setNotify(!!v)} className="mt-0.5" />
          <span>Send me reminders and notifications for upcoming appointments.</span>
        </label>
        <Button type="submit" disabled={loading} className="w-full bg-gradient-brand text-primary-foreground shadow-brand">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create account
        </Button>
      </form>
      <Divider />
      <div className="grid gap-2">
        <OAuthBrandButton provider="google" onClick={() => oauth("google")} />
        <OAuthBrandButton provider="facebook" onClick={() => oauth("facebook")} />
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account? <Link to="/login" className="text-foreground underline-offset-4 hover:underline">Sign in</Link>
      </p>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Specialists are invite-only. Got an invite? <Link to="/login" className="underline">Open the email link</Link>.
      </p>
    </AuthShell>
  );
}
