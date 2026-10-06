import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

type Appointment = {
  id: string;
  amount_cents: number;
  currency: string;
  scheduled_at: string;
  status: string;
  razorpay_payment_status: string | null;
  payment_method: string | null;
  specialist_attendance_seconds: number | null;
};

export default function AdminPayments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("appointments")
      .select("id,amount_cents,currency,scheduled_at,status,razorpay_payment_status,payment_method,specialist_attendance_seconds")
      .order("scheduled_at", { ascending: true })
      .limit(5000);

    if (error) console.error("Admin appointment/payment summary load failed", error);
    setAppointments((data ?? []) as Appointment[]);
    setNow(new Date());
    setLoading(false);
  };

  useEffect(() => {
    void load();

    const timer = window.setInterval(() => {
      void load();
    }, 10000);

    const clock = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);

    const channel = supabase
      .channel("admin-payment-session-summary")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => void load(),
      )
      .subscribe();

    return () => {
      window.clearInterval(timer);
      window.clearInterval(clock);
      window.removeEventListener("focus", onFocus);
      void supabase.removeChannel(channel);
    };
  }, []);

  const capturedPayments = useMemo(
    () => appointments.filter((a) => a.razorpay_payment_status === "captured"),
    [appointments],
  );

  const capturedTotal = useMemo(
    () => capturedPayments.reduce((sum, a) => sum + a.amount_cents, 0),
    [capturedPayments],
  );

  const upcomingSessions = useMemo(
    () =>
      appointments.filter(
        (a) =>
          a.status === "confirmed" &&
          new Date(a.scheduled_at).getTime() > now.getTime(),
      ).length,
    [appointments, now],
  );

  const completedSessions = useMemo(
    () => appointments.filter((a) => a.status === "completed").length,
    [appointments],
  );

  const missedSessions = useMemo(
    () =>
      appointments.filter((a) => {
        const scheduled = new Date(a.scheduled_at).getTime();
        const sessionWindowEnded = scheduled + 60 * 60 * 1000 <= now.getTime();
        const specialistAttendance = a.specialist_attendance_seconds ?? 0;
        return (
          sessionWindowEnded &&
          a.status !== "completed" &&
          specialistAttendance < 50 * 60
        );
      }).length,
    [appointments, now],
  );

  const currency = capturedPayments[0]?.currency || "USD";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Payments & sessions</h1>
        <p className="mt-1 text-muted-foreground">
          Live payment and session status from the appointment records.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SimpleStat
          value={money(capturedTotal, currency)}
          label="All payments captured"
          loading={loading}
        />
        <SimpleStat
          value={String(upcomingSessions)}
          label="Sessions appointed / pending"
          loading={loading}
        />
        <SimpleStat
          value={String(completedSessions)}
          label="Sessions completed"
          loading={loading}
        />
        <SimpleStat
          value={String(missedSessions)}
          label="Sessions not attended / not completed"
          loading={loading}
        />
      </div>

      <Card className="p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-semibold">Live status</div>
            <div className="text-sm text-muted-foreground">
              Captured payments are counted immediately, whether or not the session has happened yet.
            </div>
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </Card>
    </div>
  );
}

function money(c: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(c / 100);
}

function SimpleStat({ value, label, loading }: { value: string; label: string; loading: boolean }) {
  return (
    <Card className="p-5">
      <div className="text-2xl font-bold">{loading ? "…" : value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </Card>
  );
}
