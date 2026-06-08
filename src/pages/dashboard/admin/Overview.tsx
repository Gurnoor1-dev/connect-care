import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Users, UserPlus, ShieldCheck, Calendar } from "lucide-react";

export default function AdminOverview() {
  const [stats, setStats] = useState({ users: 0, specialists: 0, appts: 0, pending: 0 });
  useEffect(() => {
    (async () => {
      const [{ count: users }, { count: specialists }, { count: appts }, { count: pending }] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "specialist"),
        supabase.from("appointments").select("*", { count: "exact", head: true }),
        supabase.from("specialist_invitations").select("*", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      setStats({ users: users ?? 0, specialists: specialists ?? 0, appts: appts ?? 0, pending: pending ?? 0 });
    })();
  }, []);
  const items = [
    { i: Users, l: "Total users", v: stats.users },
    { i: ShieldCheck, l: "Specialists", v: stats.specialists },
    { i: Calendar, l: "Appointments", v: stats.appts },
    { i: UserPlus, l: "Pending invites", v: stats.pending },
  ];
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Admin console</h1>
        <p className="mt-1 text-muted-foreground">Platform overview.</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((s) => (
          <Card key={s.l} className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-brand text-primary-foreground"><s.i className="h-5 w-5" /></div>
              <div>
                <div className="text-2xl font-bold">{s.v}</div>
                <div className="text-xs text-muted-foreground">{s.l}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
