import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateTimeInTimeZone, zonedTimeToUtc } from "@/lib/timezone";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ClipboardList, DollarSign, Video } from "lucide-react";
import { AppointmentRow } from "../customer/Overview";

interface Earning {
  id: string;
  appointment_id: string;
  amount_cents: number;
  currency: string;
  earned_at: string;
}

export default function SpecialistOverview() {
  const { user } = useAuth();
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [stats, setStats] = useState({ patients: 0, sessions: 0, monthlyIncome: 0, currency: "USD" });
  const [specialistTimezone, setSpecialistTimezone] = useState("UTC");

  const loadDashboard = async () => {
    if (!user) return;

    const now = new Date();
    const nowIso = now.toISOString();

    const { data: profile } = await supabase
      .from("specialist_profiles")
      .select("timezone")
      .eq("id", user.id)
      .maybeSingle();

    const timezone = profile?.timezone || "UTC";
    setSpecialistTimezone(timezone);

    const monthParts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
    }).formatToParts(now).reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});

    const monthStart = zonedTimeToUtc(`${monthParts.year}-${monthParts.month}-01`, "00:00", timezone).toISOString();

    const { data: up } = await supabase
      .from("appointments")
      .select("*, specialist:specialist_profiles!appointments_specialist_id_fkey(timezone)")
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

    const { data: monthEarnings } = await supabase
      .from("specialist_session_earnings")
      .select("id, appointment_id, amount_cents, currency, earned_at")
      .eq("specialist_id", user.id)
      .gte("earned_at", monthStart)
      .order("earned_at", { ascending: false });

    const { data: recentEarnings } = await supabase
      .from("specialist_session_earnings")
      .select("id, appointment_id, amount_cents, currency, earned_at")
      .eq("specialist_id", user.id)
      .order("earned_at", { ascending: false })
      .limit(5);

    const patients = new Set((patientsRaw ?? []).map((r: any) => r.customer_id)).size;
    const monthlyIncome = (monthEarnings ?? []).reduce((sum, row: Earning) => sum + row.amount_cents, 0);
    const currency = monthEarnings?.[0]?.currency ?? recentEarnings?.[0]?.currency ?? "USD";

    setUpcoming(up ?? []);
    setEarnings((recentEarnings ?? []) as Earning[]);
    setStats({ patients, sessions: sessions ?? 0, monthlyIncome, currency });
  };

  useEffect(() => {
    if (!user) return;
    void loadDashboard();

    const interval = window.setInterval(() => void loadDashboard(), 60_000);
    const refresh = () => void loadDashboard();
    window.addEventListener("focus", refresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
    };
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
        <Stat
          icon={DollarSign}
          value={formatMoney(stats.monthlyIncome, stats.currency)}
          label="Earnings (mo)"
        />
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Session earnings</h2>
          <span className="text-xs text-muted-foreground">Only fully attended sessions are recorded.</span>
        </div>
        {earnings.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">No session earnings yet.</Card>
        ) : (
          <div className="space-y-3">
            {earnings.map((earning) => (
              <Card key={earning.id} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <div className="font-medium">Completed session</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDateTimeInTimeZone(earning.earned_at, specialistTimezone)}
                  </div>
                </div>
                <div className="font-semibold">{formatMoney(earning.amount_cents, earning.currency)}</div>
              </Card>
            ))}
          </div>
        )}
      </section>

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

function formatMoney(amountCents: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amountCents / 100);
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
