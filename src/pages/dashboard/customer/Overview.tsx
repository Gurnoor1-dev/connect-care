import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Video, Bell } from "lucide-react";
import { format } from "date-fns";

export default function CustomerOverview() {
  const { user } = useAuth();
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  useEffect(() => {
    if (!user) return;
    (async () => {
      const nowIso = new Date().toISOString();
      const { data: up } = await supabase
        .from("appointments")
        .select("*, specialist:specialist_profiles!appointments_specialist_id_fkey(display_name, country_flag)")
        .eq("customer_id", user.id)
        .gte("scheduled_at", nowIso)
        .order("scheduled_at", { ascending: true })
        .limit(5);
      const { data: hist } = await supabase
        .from("appointments")
        .select("*, specialist:specialist_profiles!appointments_specialist_id_fkey(display_name)")
        .eq("customer_id", user.id)
        .lt("scheduled_at", nowIso)
        .order("scheduled_at", { ascending: false })
        .limit(5);
      setUpcoming(up ?? []);
      setHistory(hist ?? []);
    })();
  }, [user]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Welcome back</h1>
        <p className="mt-1 text-muted-foreground">Here's your wellness overview.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Calendar} label="Upcoming" value={upcoming.length} />
        <StatCard icon={Video} label="Completed" value={history.length} />
        <StatCard icon={Bell} label="Reminders" value={"On"} />
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Upcoming appointments</h2>
          <Button asChild variant="ghost" size="sm"><Link to="/dashboard/customer/appointments">View all</Link></Button>
        </div>
        {upcoming.length === 0 ? (
          <Card className="p-10 text-center">
            <p className="text-muted-foreground">No upcoming sessions yet.</p>
            <Button asChild className="mt-4 bg-gradient-brand text-primary-foreground">
              <Link to="/dashboard/customer/book">Book your first session</Link>
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {upcoming.map((a) => <AppointmentRow key={a.id} a={a} role="customer" />)}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Recent history</h2>
        {history.length === 0 ? (
          <Card className="p-6 text-sm text-muted-foreground">No past sessions.</Card>
        ) : (
          <div className="space-y-3">
            {history.map((a) => <AppointmentRow key={a.id} a={a} role="customer" past />)}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-brand text-primary-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </div>
    </Card>
  );
}

export function AppointmentRow({ a, role, past }: { a: any; role: "customer" | "specialist"; past?: boolean }) {
  const dt = new Date(a.scheduled_at);
  const now = new Date();
  const minsToStart = (dt.getTime() - now.getTime()) / 60000;
  const callOpen = minsToStart <= 5 && minsToStart >= -Math.max(15, a.duration_minutes ?? 30);
  const callPath = role === "customer" ? `/dashboard/customer/call/${a.id}` : `/dashboard/specialist/call/${a.id}`;
  return (
    <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="font-medium">
          {role === "customer" ? a.specialist?.display_name ?? "Specialist" : a.customer_name ?? "Patient"}
          {a.specialist?.country_flag ? <span className="ml-2">{a.specialist.country_flag}</span> : null}
        </div>
        <div className="mt-0.5 text-sm text-muted-foreground">
          {format(dt, "EEE, MMM d · h:mm a")} · {a.duration_minutes} min
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
          a.status === "confirmed" ? "bg-teal/15 text-teal" :
          a.status === "completed" ? "bg-muted text-muted-foreground" :
          a.status === "cancelled" ? "bg-destructive/15 text-destructive" :
          "bg-accent text-accent-foreground"
        }`}>{a.status}</span>
        {!past && callOpen && a.status === "confirmed" && (
          <Button asChild size="sm" className="bg-gradient-brand text-primary-foreground">
            <Link to={callPath}><Video className="mr-1.5 h-3.5 w-3.5" /> Join call</Link>
          </Button>
        )}
      </div>
    </Card>
  );
}
