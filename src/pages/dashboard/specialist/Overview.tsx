import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateTimeInTimeZone, zonedTimeToUtc } from "@/lib/timezone";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ClipboardList, DollarSign, Video } from "lucide-react";
import { LiveAppointmentRow } from "@/components/dashboard/LiveAppointmentRow";

interface Earning {
  id: string;
  appointment_id: string;
  amount_cents: number;
  currency: string;
  earned_at: string;
  customer_name: string;
  payment_method: string;
  pending_sessions: number;
}

interface PendingSession {
  customer_id: string;
  customer_name: string;
  credit_points: number;
  sessions_remaining: number;
}

export default function SpecialistOverview() {
  const { user } = useAuth();
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [pendingSessions, setPendingSessions] = useState<PendingSession[]>([]);
  const [stats, setStats] = useState({ patients: 0, sessions: 0, monthlyIncome: 0, currency: "USD" });
  const [specialistTimezone, setSpecialistTimezone] = useState("Asia/Calcutta");

  const loadDashboard = async () => {
    if (!user) return;
    const now = new Date();
    const historyCutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: profile } = await supabase.from("specialist_profiles").select("timezone").eq("id", user.id).maybeSingle();
    const timezone = profile?.timezone || "Asia/Calcutta";
    setSpecialistTimezone(timezone);
    const monthParts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, year: "numeric", month: "2-digit" }).formatToParts(now).reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});
    const monthStart = zonedTimeToUtc(`${monthParts.year}-${monthParts.month}-01`, "00:00", timezone).toISOString();
    const appointmentSelect = "*, specialist:specialist_profiles!appointments_specialist_id_fkey(timezone)";
    const { data: up } = await supabase.from("appointments").select(appointmentSelect).eq("specialist_id", user.id).eq("status", "confirmed").gte("scheduled_at", historyCutoff).order("scheduled_at", { ascending: true }).limit(10);
    const { data: completed } = await supabase.from("appointments").select(appointmentSelect).eq("specialist_id", user.id).in("status", ["completed", "partially_completed"]).order("scheduled_at", { ascending: false }).limit(10);
    const { count: sessions } = await supabase.from("appointments").select("*", { count: "exact", head: true }).eq("specialist_id", user.id).eq("status", "completed");
    const { data: patientsRaw } = await supabase.from("appointments").select("customer_id").eq("specialist_id", user.id);
    const { data: monthEarnings } = await supabase.from("specialist_session_earnings").select("id, appointment_id, amount_cents, currency, earned_at").eq("specialist_id", user.id).gte("earned_at", monthStart).order("earned_at", { ascending: false });
    const { data: recentEarnings } = await supabase.from("specialist_session_earnings").select("id, appointment_id, amount_cents, currency, earned_at").eq("specialist_id", user.id).order("earned_at", { ascending: false }).limit(5);
    const { data: pendingRaw } = await (supabase as any).rpc("get_specialist_pending_sessions");

    const earningBase = (recentEarnings ?? []) as Array<{ id: string; appointment_id: string; amount_cents: number; currency: string; earned_at: string }>;
    const earningIds = earningBase.map((e) => e.appointment_id);
    const { data: earningAppointments } = earningIds.length
      ? await supabase.from("appointments").select("id, customer_name, payment_method, customer_id").in("id", earningIds)
      : { data: [] as any[] };
    const appointmentById = new Map((earningAppointments ?? []).map((a: any) => [a.id, a]));
    const pendingRows = ((pendingRaw ?? []) as PendingSession[]).filter((row) => row.sessions_remaining > 0);
    const pendingByCustomer = new Map(pendingRows.map((row) => [row.customer_id, row.sessions_remaining]));
    const enrichedEarnings: Earning[] = earningBase.map((earning) => {
      const appointment = appointmentById.get(earning.appointment_id) as any;
      return {
        ...earning,
        customer_name: appointment?.customer_name ?? "Patient",
        payment_method: appointment?.payment_method ?? "Not recorded",
        pending_sessions: appointment?.customer_id ? pendingByCustomer.get(appointment.customer_id) ?? 0 : 0,
      };
    });

    const patients = new Set((patientsRaw ?? []).map((r: any) => r.customer_id)).size;
    const monthlyIncome = (monthEarnings ?? []).reduce((sum, row: any) => sum + Number(row.amount_cents ?? 0), 0);
    const currency = monthEarnings?.[0]?.currency ?? recentEarnings?.[0]?.currency ?? "USD";
    setUpcoming(up ?? []);
    setHistory(completed ?? []);
    setEarnings(enrichedEarnings);
    setPendingSessions(pendingRows);
    setStats({ patients, sessions: sessions ?? 0, monthlyIncome, currency });
  };

  useEffect(() => {
    if (!user) return;
    void loadDashboard();
    const interval = window.setInterval(() => void loadDashboard(), 15_000);
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
        <Stat icon={DollarSign} value={formatMoney(stats.monthlyIncome, stats.currency)} label="Earnings (mo)" />
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Next sessions</h2>
          <Button asChild variant="ghost" size="sm"><Link to="/dashboard/specialist/patients">All patient notes</Link></Button>
        </div>
        {upcoming.length === 0 ? <Card className="p-8 text-center text-muted-foreground">No upcoming sessions.</Card> : <div className="space-y-3">{upcoming.map((a) => <LiveAppointmentRow key={a.id} a={a} role="specialist" />)}</div>}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Session history</h2>
          <span className="text-xs text-muted-foreground">Sessions completed after the full attendance threshold.</span>
        </div>
        {history.length === 0 ? <Card className="p-8 text-center text-muted-foreground">No completed sessions yet.</Card> : <div className="space-y-3">{history.map((a) => <HistoryRow key={a.id} a={a} timezone={specialistTimezone} />)}</div>}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Session earnings</h2>
          <span className="text-xs text-muted-foreground">One session price is added only after full attendance.</span>
        </div>
        {earnings.length === 0 ? <Card className="p-8 text-center text-muted-foreground">No session earnings yet.</Card> : <div className="space-y-3">{earnings.map((earning) => <EarningRow key={earning.id} earning={earning} currency={earning.currency} />)}</div>}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Pending sessions by client</h2>
          <span className="text-xs text-muted-foreground">Bundle credits are counted as future sessions, not earnings.</span>
        </div>
        {pendingSessions.length === 0 ? <Card className="p-8 text-center text-muted-foreground">No unused sessions remaining.</Card> : <div className="space-y-3">{pendingSessions.map((row) => <Card key={row.customer_id} className="flex items-center justify-between gap-4 p-4"><div><div className="font-medium">{row.customer_name}</div><div className="text-xs text-muted-foreground">{row.credit_points} credits remaining</div></div><div className="text-right"><div className="font-semibold">{row.sessions_remaining} {row.sessions_remaining === 1 ? "session" : "sessions"}</div><div className="text-xs text-muted-foreground">remaining</div></div></Card>)}</div>}
      </section>
    </div>
  );
}

function EarningRow({ earning, currency }: { earning: Earning; currency: string }) {
  const payment = earning.payment_method === "credits" ? "Credits" : earning.payment_method === "razorpay" ? "Razorpay" : earning.payment_method || "Not recorded";
  return <Card className="p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-medium">{earning.customer_name}</div><div className="text-xs text-muted-foreground">{formatDateTimeInTimeZone(earning.earned_at, "Asia/Calcutta")} · {payment} · 1 completed session</div>{earning.pending_sessions > 0 && <div className="mt-1 text-xs text-muted-foreground">{earning.pending_sessions} {earning.pending_sessions === 1 ? "session" : "sessions"} still pending for this client</div>}</div><div className="text-right"><div className="font-semibold">{formatMoney(earning.amount_cents, currency)}</div><div className="text-xs text-muted-foreground">earned for this session</div></div></div></Card>;
}

function HistoryRow({ a, timezone }: { a: any; timezone: string }) {
  const payment = a.payment_method === "credits" ? "Credits" : a.payment_method === "razorpay" ? "Razorpay" : a.payment_method || "Not recorded";
  const started = a.specialist_joined_at ? formatDateTimeInTimeZone(a.specialist_joined_at, timezone) : "Not recorded";
  const ended = a.specialist_left_at ? formatDateTimeInTimeZone(a.specialist_left_at, timezone) : (a.specialist_joined_at ? "Still in session" : "Not recorded");
  const attendanceSeconds = Number(a.specialist_attendance_seconds ?? 0);
  const attendance = Number.isFinite(attendanceSeconds) && attendanceSeconds > 0 ? Math.round(attendanceSeconds / 60) : null;
  return <Card className="p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="font-medium">{a.customer_name ?? "Patient"}</div><div className="mt-1 text-sm text-muted-foreground">Scheduled: {formatDateTimeInTimeZone(a.scheduled_at, timezone)} · {a.duration_minutes} min</div><div className="mt-1 text-xs text-muted-foreground">Started: {started} · Ended: {ended}</div>{attendance !== null && <div className="mt-1 text-xs text-muted-foreground">Consultant attendance: {attendance} min</div>}</div><div className="text-right"><div className="rounded-lg bg-teal/15 px-2.5 py-1 text-xs font-medium text-teal">{a.status}</div><div className="mt-2 text-xs text-muted-foreground">Payment: {payment}</div></div></div></Card>;
}

function formatMoney(amountCents: number, currency: string) { return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(amountCents / 100); }
function Stat({ icon: Icon, value, label }: { icon: any; value: any; label: string }) { return <Card className="p-5"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-brand text-primary-foreground"><Icon className="h-5 w-5" /></div><div><div className="text-2xl font-bold">{value}</div><div className="text-xs text-muted-foreground">{label}</div></div></div></Card>; }
