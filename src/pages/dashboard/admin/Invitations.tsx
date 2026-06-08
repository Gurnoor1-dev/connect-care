import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Copy, Mail } from "lucide-react";
import { format } from "date-fns";

export default function AdminInvitations() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [sending, setSending] = useState(false);
  const [rows, setRows] = useState<any[]>([]);

  const load = async () => {
    const { data } = await supabase
      .from("specialist_invitations")
      .select("*")
      .order("created_at", { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const send = async (e: React.FormEvent) => {
  e.preventDefault();
  setSending(true);

  try {
    // 1. Extract both data and invoke-level errors
    const { data, error: invokeError } = await supabase.functions.invoke("invite-specialist", { 
      body: { email, full_name: fullName } 
    });

    setSending(false);

    // 2. Handle network-level or baseline authorization failures
    if (invokeError) {
      return toast.error(invokeError.message || "Network invocation failed");
    }

    // 3. Handle application-level errors returned in your 500 JSON block
    if (data && data.error) {
      // If the link was made but SMTP failed, we inform the admin and still refresh the list
      toast.warning(`${data.error} Link generated anyway.`);
      setEmail(""); 
      setFullName(""); 
      load();
      return;
    }

    // 4. Absolute success path
    toast.success("Invitation sent successfully!");
    setEmail(""); 
    setFullName(""); 
    load();

  } catch (err: any) {
    setSending(false);
    toast.error(err.message || "An unexpected error occurred");
  }
};

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/invite/${token}`);
    toast.success("Invite link copied");
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Specialist invitations</h1>
        <p className="mt-1 text-muted-foreground">Specialists join only via invitation.</p>
      </header>
      <Card className="p-6">
        <form onSubmit={send} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
          <div><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2" /></div>
          <div><Label>Full name (optional)</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-2" /></div>
          <div className="flex items-end">
            <Button type="submit" disabled={sending} className="bg-gradient-brand text-primary-foreground">
              <Mail className="mr-2 h-4 w-4" /> Send invite
            </Button>
          </div>
        </form>
      </Card>

      <div className="space-y-2">
        {rows.length === 0 && <Card className="p-8 text-center text-muted-foreground">No invitations yet.</Card>}
        {rows.map((r) => (
          <Card key={r.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-medium">{r.email}</div>
              <div className="text-xs text-muted-foreground">
                {r.full_name ? `${r.full_name} · ` : ""}sent {format(new Date(r.created_at), "PP")} · expires {format(new Date(r.expires_at), "PP")}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                r.status === "pending" ? "bg-accent text-accent-foreground" :
                r.status === "accepted" ? "bg-teal/20 text-teal" :
                "bg-muted text-muted-foreground"}`}>{r.status}</span>
              {r.status === "pending" && (
                <Button size="sm" variant="outline" onClick={() => copyLink(r.token)}><Copy className="mr-1.5 h-3.5 w-3.5" /> Copy link</Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
