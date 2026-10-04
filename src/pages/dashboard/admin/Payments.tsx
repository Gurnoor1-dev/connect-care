import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, CreditCard, DollarSign, RefreshCw } from "lucide-react";

type Tier = {
  label: string | null;
  session_count: number | null;
  credit_points: number | null;
  price_cents: number | null;
  currency: string | null;
  tier_type: string | null;
};

type Payment = {
  id: string;
  amount_cents: number;
  currency: string;
  scheduled_at: string;
  created_at: string;
  status: string;
  razorpay_payment_status: string | null;
  razorpay_payment_id: string | null;
  razorpay_order_id: string | null;
  razorpay_fee: number | null;
  razorpay_tax: number | null;
  payment_method: string | null;
  customer_id: string;
  specialist_id: string;
  customer?: { full_name: string | null; email: string | null };
  specialist?: { display_name: string | null };
  tier?: Tier | null;
};

type Earning = {
  id: string;
  appointment_id: string;
  specialist_id: string;
  amount_cents: number;
  currency: string;
  earned_at: string;
};

export default function AdminPayments() {
  const [tab, setTab] = useState<"payments" | "specialists">("payments");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: p, error: paymentError }, { data: e, error: earningError }, { data: s, error: specialistError }] = await Promise.all([
      supabase
        .from("appointments")
        .select(
          "id,amount_cents,currency,scheduled_at,created_at,status,razorpay_payment_status,razorpay_payment_id,razorpay_order_id,razorpay_fee,razorpay_tax,payment_method,customer_id,specialist_id,customer:profiles!appointments_customer_id_fkey(full_name,email),specialist:specialist_profiles!appointments_specialist_id_fkey(display_name),tier:specialist_tiers!appointments_tier_id_fkey(label,session_count,credit_points,price_cents,currency,tier_type)",
        )
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase
        .from("specialist_session_earnings")
        .select("id,appointment_id,specialist_id,amount_cents,currency,earned_at")
        .order("earned_at", { ascending: false })
        .limit(1000),
      supabase.from("specialist_profiles").select("id,display_name"),
    ]);

    if (paymentError) console.error("Admin payment records load failed", paymentError);
    if (earningError) console.error("Admin specialist earnings load failed", earningError);
    if (specialistError) console.error("Admin specialist list load failed", specialistError);

    setPayments((p ?? []) as Payment[]);
    setEarnings((e ?? []) as Earning[]);
    setProfiles(Object.fromEntries((s ?? []).map((x: any) => [x.id, x.display_name || "Unnamed specialist"])));
    setLoading(false);
  };

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 15000);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const monthEarnings = useMemo(
    () => earnings.filter((e) => e.earned_at.slice(0, 7) === month),
    [earnings, month],
  );

  const capturedPayments = useMemo(
    () => payments.filter((p) => p.razorpay_payment_status === "captured"),
    [payments],
  );

  const monthCapturedPayments = useMemo(
    () => capturedPayments.filter((p) => p.created_at.slice(0, 7) === month),
    [capturedPayments, month],
  );

  const totalPayments = capturedPayments.reduce((sum, p) => sum + p.amount_cents, 0);
  const totalIncome = earnings.reduce((sum, e) => sum + e.amount_cents, 0);
  const monthIncome = monthEarnings.reduce((sum, e) => sum + e.amount_cents, 0);
  const monthRevenue = monthCapturedPayments.reduce((sum, p) => sum + p.amount_cents, 0);

  const filtered = payments.filter((p) => {
    const x = q.toLowerCase();
    return (
      !x ||
      [
        p.customer?.full_name,
        p.customer?.email,
        p.specialist?.display_name,
        p.razorpay_payment_id,
        p.razorpay_order_id,
        p.payment_method,
        p.status,
      ].some((v) => (v || "").toLowerCase().includes(x))
    );
  });

  const specialistRows = useMemo(
    () =>
      Object.entries(profiles)
        .map(([id, name]) => {
          const es = monthEarnings.filter((e) => e.specialist_id === id);
          return {
            id,
            name,
            count: es.length,
            total: es.reduce((sum, e) => sum + e.amount_cents, 0),
            currency: es[0]?.currency || "USD",
          };
        })
        .filter((x) => x.count > 0)
        .sort((a, b) => b.total - a.total),
    [profiles, monthEarnings],
  );

  return (
    <div className="space-y-6">
      <header>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Payments & specialist income</h1>
            <p className="mt-1 text-muted-foreground">
              Every captured payment, credit-funded booking, and attendance-qualified earning.
            </p>
          </div>
          <Button variant="outline" onClick={() => void load()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={CreditCard} value={money(totalPayments, "USD")} label="All captured payments" />
        <Stat icon={DollarSign} value={money(totalIncome, "USD")} label="All specialist income" />
        <Stat icon={CreditCard} value={money(monthRevenue, "USD")} label={`${month} captured`} />
        <Stat icon={DollarSign} value={money(monthIncome, "USD")} label={`${month} specialist income`} />
      </div>

      <div className="flex gap-2">
        <Button variant={tab === "payments" ? "default" : "outline"} onClick={() => setTab("payments")}>
          Payments
        </Button>
        <Button variant={tab === "specialists" ? "default" : "outline"} onClick={() => setTab("specialists")}>
          Specialist income
        </Button>
      </div>

      {tab === "payments" ? (
        <Card>
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center">
            <div>
              <div className="font-semibold">Payment records</div>
              <div className="text-xs text-muted-foreground">
                Razorpay captures contribute to captured-payment totals. Credit bookings remain visible without being counted as a new cash payment.
              </div>
            </div>
            <Input
              className="sm:ml-auto sm:max-w-sm"
              placeholder="Search customer, email, specialist, payment ID..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading payments...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-3 text-left">Customer</th>
                    <th className="p-3 text-left">Specialist</th>
                    <th className="p-3 text-left">Session</th>
                    <th className="p-3 text-left">Payment</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-right">Fee</th>
                    <th className="p-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-muted-foreground">
                        No payment or credit booking records found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((p) => {
                      const isCredits = p.payment_method === "credits";
                      const credits = p.tier?.credit_points ?? 2;
                      return (
                        <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="p-3">
                            <div className="font-medium">{p.customer?.full_name || "—"}</div>
                            <div className="text-xs text-muted-foreground">{p.customer?.email || "—"}</div>
                          </td>
                          <td className="p-3">{p.specialist?.display_name || "—"}</td>
                          <td className="whitespace-nowrap p-3">{new Date(p.scheduled_at).toLocaleString()}</td>
                          <td className="p-3">
                            <div className="font-medium">{isCredits ? "Credits" : "Razorpay"}</div>
                            <div className="text-xs text-muted-foreground">
                              {isCredits ? `${credits} credits` : p.razorpay_payment_id || p.razorpay_order_id || "—"}
                            </div>
                          </td>
                          <td className="p-3 text-right font-semibold">
                            {isCredits ? "—" : money(p.amount_cents, p.currency)}
                          </td>
                          <td className="p-3 text-right">
                            {isCredits ? "—" : money((p.razorpay_fee || 0) + (p.razorpay_tax || 0), p.currency)}
                          </td>
                          <td className="p-3 capitalize">{p.status.replace("_", " ")}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : (
        <Card>
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center">
            <div>
              <div className="font-semibold">Specialist income</div>
              <div className="text-xs text-muted-foreground">
                Only fully attended sessions that reached the 50-minute threshold are included.
              </div>
            </div>
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="sm:ml-auto sm:w-48" />
          </div>
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading income...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-3 text-left">Specialist</th>
                    <th className="p-3 text-right">Sessions earned</th>
                    <th className="p-3 text-right">Income</th>
                  </tr>
                </thead>
                <tbody>
                  {specialistRows.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-10 text-center text-muted-foreground">
                        No specialist income recorded for this month.
                      </td>
                    </tr>
                  ) : (
                    specialistRows.map((r) => (
                      <tr key={r.id} className="border-b last:border-0">
                        <td className="p-3 font-medium">{r.name}</td>
                        <td className="p-3 text-right">{r.count}</td>
                        <td className="p-3 text-right font-semibold">{money(r.total, r.currency)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function money(c: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(c / 100);
}

function Stat({ icon: Icon, value, label }: { icon: any; value: string; label: string }) {
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
