import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Video } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatInTimeZone, getDeviceTimeZone } from "@/lib/timezone";

const JOIN_EARLY_MS = 2 * 60 * 1000;
const JOIN_WINDOW_MS = 60 * 60 * 1000;

export function LiveAppointmentRow({ a, role, past }: { a: any; role: "customer" | "specialist"; past?: boolean }) {
  const [now, setNow] = useState(Date.now());
  const dt = new Date(a.scheduled_at);
  const timeZone = role === "customer" ? getDeviceTimeZone() : (a.specialist?.timezone ?? getDeviceTimeZone());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const start = dt.getTime();
  const joinOpen = !past && a.status === "confirmed" && now >= start - JOIN_EARLY_MS && now < start + JOIN_WINDOW_MS;
  const callPath = role === "customer" ? `/dashboard/customer/call/${a.id}` : `/dashboard/specialist/call/${a.id}`;
  const paymentMethod = a.payment_method === "credits" ? "Credits" : a.payment_method === "razorpay" ? "Razorpay" : a.payment_method ? String(a.payment_method) : "—";

  return <Card className="border-white/55 bg-card/90 p-4 shadow-brand backdrop-blur">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="font-medium">{role === "customer" ? a.specialist?.display_name ?? "Specialist" : a.customer_name ?? "Patient"}</div>
        <div className="mt-0.5 text-sm text-muted-foreground">{formatInTimeZone(dt, timeZone, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} · {a.duration_minutes} min</div>
        {past && <div className="mt-1 text-xs text-muted-foreground">Payment: {paymentMethod} · Status: {a.status}</div>}
      </div>
      <div className="flex items-center gap-2">
        <span className={`rounded-lg px-2.5 py-1 text-xs font-medium ${a.status === "confirmed" ? "bg-teal/15 text-teal" : a.status === "completed" ? "bg-muted text-muted-foreground" : a.status === "partially_completed" ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300" : a.status === "cancelled" ? "bg-destructive/15 text-destructive" : "bg-accent text-accent-foreground"}`}>{a.status}</span>
        {joinOpen && <Button asChild size="sm" className="bg-gradient-brand text-primary-foreground shadow-brand"><Link to={callPath}><Video className="mr-1.5 h-3.5 w-3.5" />Join call</Link></Button>}
      </div>
    </div>
    {role === "customer" && a.prescription && <div className="mt-3 rounded-lg border bg-accent/45 p-3 text-sm"><div className="mb-1 flex items-center gap-2 font-medium">Prescription</div><p className="whitespace-pre-wrap text-muted-foreground">{a.prescription}</p></div>}
  </Card>;
}
