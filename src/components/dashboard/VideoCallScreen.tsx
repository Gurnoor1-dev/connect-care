import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DailyIframe, { type DailyCall } from "@daily-co/daily-js";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ClipboardList, FileText, Loader2, PhoneOff } from "lucide-react";
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
  const [prescription, setPrescription] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    if (!appointmentId || !user) return;
    (async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, specialist:specialist_profiles!appointments_specialist_id_fkey(display_name)")
        .eq("id", appointmentId)
        .single();

      if (error) toast.error(error.message);
      setAppointment(data);
      if (role === "specialist") {
        setNotes(data?.session_notes ?? "");
        setPrescription(data?.prescription ?? "");
      }
    })();
    return () => { callRef.current?.destroy(); callRef.current = null; };
  }, [appointmentId, user, role]);

  const join = async () => {
    if (!appointmentId || !containerRef.current) return;
    setJoining(true);
    const { data, error } = await supabase.functions.invoke("smart-handler", {
      body: { appointment_id: appointmentId, role },
    });
    const roomUrl = data?.room_url ?? data?.roomUrl;
    if (error || !roomUrl || !data?.token) {
      setJoining(false);
      return toast.error(data?.error ?? error?.message ?? "Could not join the call");
    }
    const call = DailyIframe.createFrame(containerRef.current, {
      iframeStyle: { width: "100%", height: "100%", border: "0", borderRadius: "8px" },
      showLeaveButton: true,
    });
    callRef.current = call;
    call.on("left-meeting", () => { setJoined(false); });
    await call.join({ url: roomUrl, token: data.token });
    setJoined(true);
    setJoining(false);
  };

  const leave = async () => { await callRef.current?.leave(); };

  const saveSessionText = async () => {
    if (!appointmentId) return;
    setSavingNotes(true);
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("appointments")
      .update({
        session_notes: notes,
        notes_updated_at: now,
        prescription,
        prescription_updated_at: now,
      })
      .eq("id", appointmentId);
    setSavingNotes(false);
    if (error) toast.error(error.message);
    else {
      setAppointment((current: any) => ({ ...current, session_notes: notes, prescription, prescription_updated_at: now }));
      toast.success("Notes and prescription saved");
    }
  };

  if (!appointment) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className={`grid gap-6 ${role === "specialist" ? "xl:grid-cols-[minmax(0,1fr)_400px]" : ""}`}>
      <div className="space-y-4">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Video session</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {role === "customer" ? `With ${appointment.specialist?.display_name}` : `With ${appointment.customer_name ?? "patient"}`}
            </p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to={role === "customer" ? "/dashboard/customer" : "/dashboard/specialist"}>Back</Link>
          </Button>
        </header>
        <Card className="aspect-video overflow-hidden border-white/55 bg-black p-0 shadow-glow">
          <div ref={containerRef} className="h-full w-full">
            {!joined && (
              <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 text-primary-foreground">
                <p className="mb-4 text-sm opacity-80">Ready when you are.</p>
                <Button onClick={join} disabled={joining} size="lg" className="bg-gradient-brand shadow-brand">
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

        {role === "customer" && appointment.prescription && (
          <Card className="border-white/55 bg-card/90 p-5 shadow-brand backdrop-blur">
            <div className="flex items-center gap-2 font-semibold">
              <FileText className="h-4 w-4 text-teal" /> Prescription
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/90">{appointment.prescription}</p>
          </Card>
        )}
      </div>

      {role === "specialist" && (
        <aside className="space-y-3">
          <Card className="border-white/55 bg-card/90 p-4 shadow-brand backdrop-blur">
            <h2 className="text-sm font-semibold">Patient</h2>
            <div className="mt-2 text-sm">
              <div className="font-medium">{appointment.customer_name ?? "-"}</div>
              <div className="text-xs text-muted-foreground">{new Date(appointment.scheduled_at).toLocaleString()}</div>
            </div>
          </Card>
          <Card className="border-white/55 bg-card/90 p-4 shadow-brand backdrop-blur">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ClipboardList className="h-4 w-4 text-teal" /> Private notes
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Private observations, symptoms, follow-up thoughts..."
              className="mt-3 min-h-[220px] w-full resize-y rounded-lg border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </Card>
          <Card className="border-white/55 bg-card/90 p-4 shadow-brand backdrop-blur">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <FileText className="h-4 w-4 text-teal" /> Prescription
            </div>
            <textarea
              value={prescription}
              onChange={(e) => setPrescription(e.target.value)}
              placeholder="Customer-facing prescription, care plan, exercises, medication notes..."
              className="mt-3 min-h-[220px] w-full resize-y rounded-lg border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <Button onClick={saveSessionText} disabled={savingNotes} className="mt-3 w-full bg-gradient-brand text-primary-foreground shadow-brand">
              {savingNotes && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save notes & prescription
            </Button>
          </Card>
        </aside>
      )}
    </div>
  );
}
