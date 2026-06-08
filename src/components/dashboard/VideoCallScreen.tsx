import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DailyIframe, { type DailyCall } from "@daily-co/daily-js";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, PhoneOff } from "lucide-react";
import { toast } from "sonner";

export function VideoCallScreen({ role }: { role: "customer" | "specialist" }) {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const callRef = useRef<DailyCall | null>(null);
  const [appointment, setAppointment] = useState<any>(null);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    if (!appointmentId || !user) return;
    (async () => {
      const { data } = await supabase
        .from("appointments")
        .select("*, specialist:specialist_profiles!appointments_specialist_id_fkey(display_name), customer_name, session_notes")
        .eq("id", appointmentId)
        .single();
      setAppointment(data);
      if (role === "specialist" && data?.session_notes) setNotes(data.session_notes);
    })();
    return () => { callRef.current?.destroy(); callRef.current = null; };
  }, [appointmentId, user, role]);

  const join = async () => {
    if (!appointmentId) return;
    setJoining(true);
    const { data, error } = await supabase.functions.invoke("daily-token", {
      body: { appointment_id: appointmentId, role },
    });
    if (error || !data?.room_url || !data?.token) {
      setJoining(false);
      return toast.error(error?.message ?? "Could not join the call");
    }
    const call = DailyIframe.createFrame(containerRef.current!, {
      iframeStyle: { width: "100%", height: "100%", border: "0", borderRadius: "16px" },
      showLeaveButton: true,
    });
    callRef.current = call;
    call.on("left-meeting", () => { setJoined(false); });
    await call.join({ url: data.room_url, token: data.token });
    setJoined(true);
    setJoining(false);
  };

  const leave = async () => { await callRef.current?.leave(); };

  const saveNotes = async () => {
    if (!appointmentId) return;
    setSavingNotes(true);
    const { error } = await supabase
      .from("appointments")
      .update({ session_notes: notes, notes_updated_at: new Date().toISOString() })
      .eq("id", appointmentId);
    setSavingNotes(false);
    if (error) toast.error(error.message);
    else toast.success("Notes saved");
  };

  if (!appointment) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className={`grid gap-6 ${role === "specialist" ? "lg:grid-cols-[1fr_360px]" : ""}`}>
      <div className="space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Video session</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {role === "customer" ? `With ${appointment.specialist?.display_name}` : `With ${appointment.customer_name ?? "patient"}`}
            </p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to={role === "customer" ? "/dashboard/customer" : "/dashboard/specialist"}>← Back</Link>
          </Button>
        </header>
        <Card className="aspect-video overflow-hidden bg-black p-0">
          <div ref={containerRef} className="h-full w-full">
            {!joined && (
              <div className="flex h-full w-full flex-col items-center justify-center text-primary-foreground">
                <p className="mb-4 text-sm opacity-80">Ready when you are.</p>
                <Button onClick={join} disabled={joining} size="lg" className="bg-gradient-brand">
                  {joining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Join call
                </Button>
              </div>
            )}
          </div>
        </Card>
        {joined && (
          <Button onClick={leave} variant="destructive" className="w-full sm:w-auto">
            <PhoneOff className="mr-2 h-4 w-4" /> End call
          </Button>
        )}
      </div>

      {role === "specialist" && (
        <aside className="space-y-3">
          <Card className="p-4">
            <h2 className="text-sm font-semibold">Patient</h2>
            <div className="mt-2 text-sm">
              <div className="font-medium">{appointment.customer_name ?? "—"}</div>
              <div className="text-xs text-muted-foreground">{new Date(appointment.scheduled_at).toLocaleString()}</div>
            </div>
          </Card>
          <Card className="p-4">
            <h2 className="text-sm font-semibold">Notepad · prescriptions & remarks</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Symptoms, prescriptions, follow-up plan…"
              className="mt-2 min-h-[280px] w-full resize-y rounded-md border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <Button onClick={saveNotes} disabled={savingNotes} className="mt-3 w-full bg-gradient-brand text-primary-foreground">
              {savingNotes && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save notes
            </Button>
          </Card>
        </aside>
      )}
    </div>
  );
}
