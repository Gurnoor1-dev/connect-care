import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

type Appointment = {
  id: string; amount_cents: number; currency: string; scheduled_at: string; duration_minutes: number | null; status: string;
  created_at: string; payment_captured_at: string | null;
  razorpay_payment_status: string | null; razorpay_payment_id: string | null; razorpay_fee: number | null;
  razorpay_tax: number | null; razorpay_base_currency: string | null;
  payment_method: string | null; customer_id: string; customer_name: string | null; specialist_id: string;
  tier_id: string | null; tier_label: string | null; tier_type: string | null; tier_session_count: number | null;
  specialist_attendance_seconds: number | null; customer_attendance_seconds: number | null;
};
type Profile = { id: string; full_name: string | null; email: string | null };
type Specialist = { id: string; display_name: string | null };
type SessionEarning = { id: string; appointment_id: string; specialist_id: string; amount_cents: number; currency: string; earned_at: string };
type Tab = "payments" | "income" | "sessions";

export default function AdminPayments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [specialists, setSpecialists] = useState<Record<string, Specialist>>({});
  const [earnings, setEarnings] = useState<SessionEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());
  const [tab, setTab] = useState<Tab>("payments");
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(() => monthKey(new Date()));

  const load = async () => {
    setLoading(true);
    const [apps, p, s, e] = await Promise.all([
      fetchAllAppointments(),
      supabase.from("profiles").select("id,full_name,email"),
      supabase.from("specialist_profiles").select("id,display_name"),
      supabase.from("specialist_session_earnings").select("id,appointment_id,specialist_id,amount_cents,currency,earned_at").order("earned_at", { ascending: false }).limit(10000),
    ]);
    setAppointments(apps);
    setProfiles(Object.fromEntries(((p.data ?? []) as Profile[]).map(x => [x.id, x])));
    setSpecialists(Object.fromEntries(((s.data ?? []) as Specialist[]).map(x => [x.id, x])));
    setEarnings((e.data ?? []) as SessionEarning[]);
    setNow(new Date());
    setLoading(false);
    if (p.error) console.error("Admin profile load failed", p.error);
    if (s.error) console.error("Admin specialist load failed", s.error);
    if (e.error) console.error("Admin income load failed", e.error);
  };

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 10000);
    const clock = window.setInterval(() => setNow(new Date()), 1000);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    const channel = supabase.channel("admin-payment-income-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "specialist_session_earnings" }, () => void load())
      .subscribe();
    return () => {
      window.clearInterval(timer); window.clearInterval(clock); window.removeEventListener("focus", onFocus);
      void supabase.removeChannel(channel);
    };
  }, []);

  const captured = useMemo(() => appointments.filter(a => a.razorpay_payment_status === "captured"), [appointments]);
  const monthOptions = useMemo(() => {
    const values = [
      ...captured.map(a => monthKey(new Date(a.payment_captured_at || a.created_at))),
      ...appointments.map(a => monthKey(new Date(a.scheduled_at))),
      ...earnings.map(e => monthKey(new Date(e.earned_at))),
      monthKey(now),
    ];
    return [...new Set(values.filter(Boolean))].sort((a, b) => b.localeCompare(a));
  }, [captured, appointments, earnings, now]);

  useEffect(() => {
    if (monthOptions.length && !monthOptions.includes(selectedMonth)) setSelectedMonth(monthOptions[0]);
  }, [monthOptions, selectedMonth]);

  const monthlyCaptured = useMemo(
    () => captured.filter(a => a.payment_captured_at && monthKey(new Date(a.payment_captured_at)) === selectedMonth),
    [captured, selectedMonth]
  );
  const capturedTotal = useMemo(() => monthlyCaptured.reduce((sum, a) => sum + a.amount_cents, 0), [monthlyCaptured]);

  const monthlySessions = useMemo(
    () => appointments.filter(a => monthKey(new Date(a.scheduled_at)) === selectedMonth),
    [appointments, selectedMonth]
  );
  const upcoming = useMemo(
    () => monthlySessions.filter(a => a.status === "confirmed" && new Date(a.scheduled_at).getTime() > now.getTime()).length,
    [monthlySessions, now]
  );
  const completed = useMemo(
    () => monthlySessions.filter(a => a.status === "completed").length,
    [monthlySessions]
  );
  const missed = useMemo(() => monthlySessions.filter(a => {
    const end = new Date(a.scheduled_at).getTime() + (a.duration_minutes || 60) * 60 * 1000;
    return end <= now.getTime() && a.status !== "completed" && a.status !== "cancelled";
  }).length, [monthlySessions, now]);

  const paymentRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return monthlyCaptured.filter(a => {
      if (!q) return true;
      const customer = (a.customer_name || "") + " " + (profiles[a.customer_id]?.full_name || "") + " " + (profiles[a.customer_id]?.email || "");
      const specialist = specialists[a.specialist_id]?.display_name || "";
      return (customer + " " + specialist + " " + (a.razorpay_payment_id || "") + " " + a.id).toLowerCase().includes(q);
    }).sort((a, b) => new Date(b.payment_captured_at || 0).getTime() - new Date(a.payment_captured_at || 0).getTime());
  }, [monthlyCaptured, search, profiles, specialists]);

  const incomeRows = useMemo(() => {
    const map = new Map<string, { sessions: number; amount: number; currency: string }>();
    earnings.filter(e => monthKey(new Date(e.earned_at)) === selectedMonth).forEach(e => {
      const old = map.get(e.specialist_id);
      map.set(e.specialist_id, { sessions: (old?.sessions ?? 0) + 1, amount: (old?.amount ?? 0) + e.amount_cents, currency: old?.currency ?? e.currency ?? "USD" });
    });
    return [...map.entries()].map(([id, v]) => ({ specialistId: id, specialist: specialists[id]?.display_name ?? "Unknown specialist", ...v })).sort((a, b) => b.amount - a.amount);
  }, [earnings, selectedMonth, specialists]);

  return <div className="space-y-6">
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div><h1 className="text-3xl font-bold">Payments & sessions</h1><p className="mt-1 text-muted-foreground">Live payment and session status from the appointment records.</p></div>
      <div className="w-full lg:w-72">
        <label className="mb-2 block text-sm font-medium">Month / year</label>
        <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="h-12 w-full rounded-xl border border-border bg-transparent px-3 text-base outline-none" aria-label="Admin dashboard month and year">
          {monthOptions.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}
        </select>
      </div>
    </header>

    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="p-5">
        <div className="text-2xl font-bold">{loading ? "…" : money(capturedTotal, monthlyCaptured[0]?.currency || "USD")}</div>
        <div className="mt-1 text-sm text-muted-foreground">All payments captured · {formatMonth(selectedMonth)}</div>
      </Card>
      <SimpleStat value={String(upcoming)} label="Sessions appointed / pending" loading={loading} />
      <SimpleStat value={String(completed)} label="Sessions completed" loading={loading} />
      <SimpleStat value={String(missed)} label="Sessions not attended / not completed" loading={loading} />
    </div>

    <div className="flex flex-wrap gap-3">
      <Button variant={tab === "payments" ? "default" : "outline"} onClick={() => setTab("payments")} className="min-w-36">Payments</Button>
      <Button variant={tab === "income" ? "default" : "outline"} onClick={() => setTab("income")} className="min-w-44">Specialist income</Button>
      <Button variant={tab === "sessions" ? "default" : "outline"} onClick={() => setTab("sessions")} className="min-w-40">Session records</Button>
      <Button variant="outline" onClick={() => void load()} disabled={loading} className="ml-auto"><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
    </div>

    {tab === "payments"
      ? <PaymentRecords rows={paymentRows} search={search} onSearch={setSearch} profiles={profiles} specialists={specialists} month={selectedMonth} />
      : tab === "income"
        ? <SpecialistIncome rows={incomeRows} month={selectedMonth} />
        : <SessionRecords rows={appointments} search={search} onSearch={setSearch} profiles={profiles} specialists={specialists} now={now} />}

    <Card className="p-5"><div className="font-semibold">Live status</div><div className="mt-1 text-sm text-muted-foreground">Payments, income and session records refresh automatically every 10 seconds, on page focus, and on appointment or income database changes.</div></Card>
  </div>;
}

async function fetchAllAppointments(): Promise<Appointment[]> {
  const rows: Appointment[] = [], size = 1000;
  for (let from = 0;; from += size) {
    const { data, error } = await supabase.from("appointments")
      .select("id,amount_cents,currency,scheduled_at,duration_minutes,status,created_at,payment_captured_at,razorpay_payment_status,razorpay_payment_id,razorpay_fee,razorpay_tax,razorpay_base_currency,payment_method,customer_id,customer_name,specialist_id,tier_id,specialist_attendance_seconds,customer_attendance_seconds")
      .order("scheduled_at", { ascending: true }).range(from, from + size - 1);
    if (error) { console.error("Admin appointment load failed", error); return rows; }
    const batch = (data ?? []) as Appointment[];
    const tierIds = [...new Set(batch.map(a => a.tier_id).filter((id): id is string => Boolean(id)))];
    let tierMap: Record<string, { label: string | null; tier_type: string | null; session_count: number | null }> = {};
    if (tierIds.length) {
      const { data: tiers, error: tierError } = await supabase.from("specialist_tiers").select("id,label,tier_type,session_count").in("id", tierIds);
      if (tierError) console.error("Admin tier load failed", tierError);
      tierMap = Object.fromEntries((tiers ?? []).map(t => [t.id, { label: t.label, tier_type: t.tier_type, session_count: t.session_count }]));
    }
    rows.push(...batch.map(a => ({ ...a, tier_label: a.tier_id ? tierMap[a.tier_id]?.label ?? null : null, tier_type: a.tier_id ? tierMap[a.tier_id]?.tier_type ?? null : null, tier_session_count: a.tier_id ? tierMap[a.tier_id]?.session_count ?? null : null })));
    if (batch.length < size) break;
  }
  return rows;
}

function PaymentRecords({ rows, search, onSearch, profiles, specialists, month }: { rows: Appointment[]; search: string; onSearch: (v: string) => void; profiles: Record<string, Profile>; specialists: Record<string, Specialist>; month: string }) {
  return <Card className="overflow-hidden">
    <div className="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between">
      <div><h2 className="text-2xl font-semibold">Payment records</h2><p className="mt-1 text-sm text-muted-foreground">Captured payments for {formatMonth(month)}, including payments made before the session is attended.</p></div>
      <input value={search} onChange={e => onSearch(e.target.value)} placeholder="Search customer, email, specialist, payment ID..." className="h-12 w-full rounded-2xl border border-border bg-transparent px-4 text-base outline-none placeholder:text-muted-foreground lg:max-w-xl" />
    </div>
    <div className="overflow-x-auto"><table className="w-full min-w-[1650px] text-sm">
      <thead><tr className="border-b text-left text-muted-foreground">
        <th className="px-5 py-4">CUSTOMER</th><th className="px-5 py-4">SPECIALIST</th><th className="px-5 py-4">SESSION</th><th className="px-5 py-4">PAYMENT ID</th><th className="px-5 py-4">TRANSACTION TIME</th><th className="px-5 py-4">PURCHASE</th><th className="px-5 py-4">AMOUNT</th><th className="px-5 py-4">FEE</th><th className="px-5 py-4">ATTENDANCE</th><th className="px-5 py-4">STATUS</th>
      </tr></thead>
      <tbody>{rows.map(a => {
        const p = profiles[a.customer_id], customer = a.customer_name || p?.full_name || p?.email || "—";
        return <tr key={a.id} className="border-b last:border-0">
          <td className="px-5 py-4"><div className="font-medium">{customer}</div><div className="text-xs text-muted-foreground">{p?.email || "—"}</div></td>
          <td className="px-5 py-4">{specialists[a.specialist_id]?.display_name || "—"}</td>
          <td className="whitespace-nowrap px-5 py-4">{formatDateTime(a.scheduled_at)}</td>
          <td className="px-5 py-4 font-mono text-xs">{a.razorpay_payment_id || "—"}</td>
          <td className="whitespace-nowrap px-5 py-4 font-medium">{purchaseLabel(a)}</td>
          <td className="whitespace-nowrap px-5 py-4">{money(a.amount_cents, a.currency)}</td>
          <td className="whitespace-nowrap px-5 py-4">{a.razorpay_fee == null ? "—" : money(a.razorpay_fee, a.razorpay_base_currency || "INR")}</td>
          <td className="whitespace-nowrap px-5 py-4">Specialist {duration(a.specialist_attendance_seconds ?? 0)} · Client {duration(a.customer_attendance_seconds ?? 0)}</td>
          <td className="px-5 py-4"><div className="font-medium">Captured</div><div className="text-xs text-muted-foreground">{paymentMethodLabel(a.payment_method)}</div></td>
        </tr>;
      })}{!rows.length && <tr><td colSpan={10} className="px-5 py-16 text-center text-muted-foreground">No captured payment records found for this month.</td></tr>}</tbody>
    </table></div>
  </Card>;
}

function SpecialistIncome({ rows, month }: { rows: Array<{ specialistId: string; specialist: string; sessions: number; amount: number; currency: string }>; month: string }) {
  return <Card className="overflow-hidden">
    <div className="p-5"><h2 className="text-2xl font-semibold">Specialist income</h2><p className="mt-1 text-sm text-muted-foreground">Only completed, captured sessions are included for {formatMonth(month)}.</p>
    </div>
    <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm">
      <thead><tr className="border-y text-left text-muted-foreground"><th className="px-5 py-4">SPECIALIST</th><th className="px-5 py-4">SESSIONS EARNED</th><th className="px-5 py-4">INCOME</th></tr></thead>
      <tbody>{rows.map(r => <tr key={r.specialistId} className="border-b last:border-0"><td className="px-5 py-4 font-medium">{r.specialist}</td><td className="px-5 py-4">{r.sessions}</td><td className="px-5 py-4 font-semibold">{money(r.amount, r.currency)}</td></tr>)}{!rows.length && <tr><td colSpan={3} className="px-5 py-16 text-center text-muted-foreground">No specialist income recorded for this month.</td></tr>}</tbody>
    </table></div>
  </Card>;
}

function SessionRecords({ rows, search, onSearch, profiles, specialists, now }: { rows: Appointment[]; search: string; onSearch: (v: string) => void; profiles: Record<string, Profile>; specialists: Record<string, Specialist>; now: Date }) {
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...rows].filter(a => {
      if (!q) return true;
      const customer = a.customer_name || profiles[a.customer_id]?.full_name || profiles[a.customer_id]?.email || "";
      const specialist = specialists[a.specialist_id]?.display_name || "";
      return (customer + " " + specialist + " " + a.id).toLowerCase().includes(q);
    }).sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());
  }, [rows, search, profiles, specialists]);

  return <Card className="overflow-hidden">
    <div className="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between">
      <div><h2 className="text-2xl font-semibold">Session records</h2><p className="mt-1 text-sm text-muted-foreground">The appointment record is the source of truth for client, scheduled time, attendance, payment mode and completion status.</p></div>
      <input value={search} onChange={e => onSearch(e.target.value)} placeholder="Search client, specialist or session ID..." className="h-12 w-full rounded-2xl border border-border bg-transparent px-4 text-base outline-none placeholder:text-muted-foreground lg:max-w-xl" />
    </div>
    <div className="overflow-x-auto"><table className="w-full min-w-[1500px] text-sm">
      <thead><tr className="border-b text-left text-muted-foreground">
        <th className="px-5 py-4">CLIENT</th><th className="px-5 py-4">SPECIALIST</th><th className="px-5 py-4">DATE</th><th className="px-5 py-4">SCHEDULED TIME</th><th className="px-5 py-4">CLIENT ATTENDANCE</th><th className="px-5 py-4">CONSULTANT ATTENDANCE</th><th className="px-5 py-4">PAYMENT MODE</th><th className="px-5 py-4">STATUS</th>
      </tr></thead>
      <tbody>{filtered.map(a => {
        const p = profiles[a.customer_id];
        const customer = a.customer_name || p?.full_name || p?.email || "—";
        return <tr key={a.id} className="border-b last:border-0">
          <td className="px-5 py-4"><div className="font-medium">{customer}</div><div className="text-xs text-muted-foreground">{p?.email || "—"}</div></td>
          <td className="px-5 py-4">{specialists[a.specialist_id]?.display_name || "—"}</td>
          <td className="whitespace-nowrap px-5 py-4">{formatDate(a.scheduled_at)}</td>
          <td className="whitespace-nowrap px-5 py-4">{formatTime(a.scheduled_at)} · {a.duration_minutes || 60} min</td>
          <td className="whitespace-nowrap px-5 py-4">{duration(a.customer_attendance_seconds ?? 0)}</td>
          <td className="whitespace-nowrap px-5 py-4">{duration(a.specialist_attendance_seconds ?? 0)}</td>
          <td className="px-5 py-4">{paymentMethodLabel(a.payment_method)}</td>
          <td className="px-5 py-4"><StatusLabel appointment={a} now={now} /></td>
        </tr>;
      })}{!filtered.length && <tr><td colSpan={8} className="px-5 py-16 text-center text-muted-foreground">No session records found.</td></tr>}</tbody>
    </table></div>
  </Card>;
}

function StatusLabel({ appointment: a, now }: { appointment: Appointment; now: Date }) {
  if (a.status === "completed") return <span className="font-semibold">Completed</span>;
  if (a.status === "cancelled") return <span>Cancelled</span>;
  const end = new Date(a.scheduled_at).getTime() + (a.duration_minutes || 60) * 60 * 1000;
  if (end > now.getTime()) return <span>Pending / upcoming</span>;
  return <span>Not completed</span>;
}

function purchaseLabel(a: Appointment) {
  if (a.tier_type === "bundle") {
    const count = a.tier_session_count;
    return count ? `${count}-session bundle` : (a.tier_label || "Bundle");
  }
  if (a.tier_type === "single") return "Single session";
  return a.tier_label || "—";
}

function paymentMethodLabel(method: string | null) {
  if (!method) return "—";
  if (method === "credits") return "Bundle credits";
  if (method === "razorpay") return "Razorpay";
  return method.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function duration(seconds: number) { if (seconds <= 0) return "0m"; const m = Math.floor(seconds / 60), h = Math.floor(m / 60); return h ? h + "h " + (m % 60) + "m" : m + "m"; }
function validDate(v: string | null | undefined) { const d = v ? new Date(v) : new Date(NaN); return Number.isFinite(d.getTime()) ? d : null; }
function formatDateTime(v: string) { const d = validDate(v); return d ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(d) : "—"; }
function formatTransactionTime(v: string | null) { const d = validDate(v); return d ? new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZoneName: "short" }).format(d) : "—"; }
function formatDate(v: string) { const d = validDate(v); return d ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(d) : "—"; }
function formatTime(v: string) { const d = validDate(v); return d ? new Intl.DateTimeFormat(undefined, { timeStyle: "short" }).format(d) : "—"; }
function monthKey(d: Date) { return Number.isFinite(d.getTime()) ? d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") : ""; }
function formatMonth(k: string) { const p = k.split("-").map(Number); const d = p.length === 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]) ? new Date(p[0], p[1] - 1, 1) : null; return d ? new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(d) : "—"; }
function safeCurrency(currency: string | null | undefined) { const code = String(currency || "").trim().toUpperCase(); return /^[A-Z]{3}$/.test(code) ? code : "USD"; }
function money(c: number | null | undefined, currency: string | null | undefined) { const amount = Number.isFinite(Number(c)) ? Number(c) / 100 : 0; return new Intl.NumberFormat(undefined, { style: "currency", currency: safeCurrency(currency), maximumFractionDigits: 2 }).format(amount); }
function SimpleStat({ value, label, loading }: { value: string; label: string; loading: boolean }) { return <Card className="p-5"><div className="text-2xl font-bold">{loading ? "…" : value}</div><div className="mt-1 text-sm text-muted-foreground">{label}</div></Card>; }
