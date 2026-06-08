import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ClipboardList, DollarSign, Video } from "lucide-react";
import { AppointmentRow } from "../customer/Overview";

export default function SpecialistOverview() {
  const { user } = useAuth();
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [stats, setStats] = useState({ patients: 0, sessions: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const nowIso = new Date().toISOString();
      const { data: up } = await supabase
        .from("appointments")
        .select("*")
        .eq("specialist_id", user.id)
        .gte("scheduled_at", nowIso)
        .order("scheduled_at", { ascending: true })
        .limit(5);
      const { count: sessions } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("specialist_id", user.id)
        .eq("status", "completed");
      const { data: patientsRaw } = await supabase
        .from("appointments")
        .select("customer_id")
        .eq("specialist_id", user.id);
      const patients = new Set((patientsRaw ?? []).map((r: any) => r.customer_id)).size;
      setUpcoming(up ?? []);
      setStats({ patients, sessions: sessions ?? 0 });
    })();
  }, [user]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Specialist console</h1>
        <p className="mt-1 text-muted-foreground">Your upcoming sessions and patients.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat icon={Calendar} value={upcoming.length} label="Upcoming" />
        <Stat icon={Video} value={stats.sessions} label="Completed" />
        <Stat icon={ClipboardList} value={stats.patients} label="Patients" />
        <Stat icon={DollarSign} value="—" label="Earnings (mo)" />
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Next sessions</h2>
          <Button asChild variant="ghost" size="sm"><Link to="/dashboard/specialist/patients">All patient notes</Link></Button>
        </div>
        {upcoming.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">No upcoming sessions.</Card>
        ) : (
          <div className="space-y-3">{upcoming.map((a) => <AppointmentRow key={a.id} a={a} role="specialist" />)}</div>
        )}
      </section>
    </div>
  );
}

function Stat({ icon: Icon, value, label }: { icon: any; value: any; label: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-brand text-primary-foreground"><Icon className="h-5 w-5" /></div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </div>
    </Card>
  );
}
