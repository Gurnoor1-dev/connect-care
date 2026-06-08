import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";

export default function SpecialistPatients() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("appointments")
        .select("id, customer_name, scheduled_at, duration_minutes, session_notes, status")
        .eq("specialist_id", user.id)
        .not("session_notes", "is", null)
        .order("scheduled_at", { ascending: false });
      setRows(data ?? []);
    })();
  }, [user]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Patient notes</h1>
        <p className="mt-1 text-muted-foreground">Every session you've written notes on.</p>
      </header>
      {rows.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">No notes saved yet.</Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{r.customer_name ?? "Patient"}</div>
                  <div className="text-xs text-muted-foreground">{format(new Date(r.scheduled_at), "PPP · p")} · {r.duration_minutes} min</div>
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{r.status}</span>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/90">{r.session_notes}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
