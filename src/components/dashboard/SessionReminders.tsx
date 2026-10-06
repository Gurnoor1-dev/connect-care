import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const REMINDERS = [
  { minutes: 30, label: "30 minutes" },
  { minutes: 10, label: "10 minutes" },
  { minutes: 1, label: "1 minute" },
] as const;

const POLL_MS = 15_000;
const ALERT_WINDOW_MS = 20_000;

export function SessionReminders({ userId, role }: { userId?: string; role: "customer" | "specialist" | "admin" | null }) {
  const [now, setNow] = useState(Date.now());
  const appointmentsRef = useRef<any[]>([]);
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!userId || (role !== "customer" && role !== "specialist")) {
      appointmentsRef.current = [];
      return;
    }

    let cancelled = false;

    const load = async () => {
      const from = new Date(Date.now() - 60_000).toISOString();
      const to = new Date(Date.now() + 31 * 60_000).toISOString();
      const column = role === "customer" ? "customer_id" : "specialist_id";
      const { data, error } = await supabase
        .from("appointments")
        .select("id, scheduled_at, status, customer_name, specialist:specialist_profiles!appointments_specialist_id_fkey(display_name)")
        .eq(column, userId)
        .eq("status", "confirmed")
        .gte("scheduled_at", from)
        .lte("scheduled_at", to);

      if (!cancelled) {
        if (error) console.error("session reminder load failed", error);
        appointmentsRef.current = data ?? [];
      }
    };

    void load();
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [userId, role]);

  useEffect(() => {
    if (role !== "customer" && role !== "specialist") return;

    for (const appointment of appointmentsRef.current) {
      const start = new Date(appointment.scheduled_at).getTime();
      const remaining = start - now;

      for (const reminder of REMINDERS) {
        const threshold = reminder.minutes * 60_000;
        if (remaining <= threshold && remaining > threshold - ALERT_WINDOW_MS) {
          const key = `${appointment.id}:${reminder.minutes}`;
          if (firedRef.current.has(key)) continue;
          firedRef.current.add(key);

          const title = reminder.minutes === 1
            ? "Session starts in 1 minute"
            : `Session starts in ${reminder.minutes} minutes`;
          const detail = role === "customer"
            ? `Your session with ${appointment.specialist?.display_name ?? "your specialist"} starts in ${reminder.label}.`
            : `Your session with ${appointment.customer_name ?? "your patient"} starts in ${reminder.label}.`;

          toast.info(title, { description: detail, duration: 10_000 });

          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(title, { body: detail });
          }
        }
      }
    }
  }, [now, role]);

  return null;
}
