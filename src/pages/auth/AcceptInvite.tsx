import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { AuthShell } from "./Login";

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<{ email: string; full_name?: string } | null>(null);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fullName, setFullName] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("specialist_invitations")
        .select("email, full_name, status, expires_at")
        .eq("token", token)
        .maybeSingle();
      if (data && data.status === "pending" && new Date(data.expires_at) > new Date()) {
        setInvite({ email: data.email, full_name: data.full_name });
        setFullName(data.full_name ?? "");
      }
      setLoading(false);
    })();
  }, [token]);

  const onAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite) return;
    setSubmitting(true);
    // Call edge function to create the specialist account + assign role atomically
    const { error } = await supabase.functions.invoke("accept-specialist-invite", {
      body: { token, password, full_name: fullName },
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Account created. Signing you in…");
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: invite.email, password });
    if (signInError) return toast.error(signInError.message);
    navigate("/dashboard/specialist");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!invite) {
    return (
      <AuthShell title="Invitation invalid">
        <p className="text-sm text-muted-foreground">This invite link is expired or already used.</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Accept your specialist invite" subtitle={`Invited as ${invite.email}`}>
      <form onSubmit={onAccept} className="space-y-4">
        <div>
          <Label>Full name</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required className="mt-2" />
        </div>
        <div>
          <Label>Create a password</Label>
          <Input type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2" />
        </div>
        <Button type="submit" disabled={submitting} className="w-full bg-gradient-brand text-primary-foreground">
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Accept invitation
        </Button>
      </form>
    </AuthShell>
  );
}
