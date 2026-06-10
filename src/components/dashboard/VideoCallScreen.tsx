import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ClipboardList, FileText, Loader2, ExternalLink, Video } from "lucide-react";
import { toast } from "sonner";

export function VideoCallScreen({ role }: { role: "customer" | "specialist" }) {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const { user } = useAuth();

  const [appointment, setAppointment] = useState<any>(null);
  const [joining, setJoining] = useState(false);
  const [notes, setNotes] = useState("");
  const [prescription, setPrescription] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [roomUrl, setRoomUrl] = useState<string | null>(null);

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
  }, [appointmentId, user, role]);

  const join = async () => {
    if (!appointmentId) return;
    setJoining(true);

    const { data, error } = await supabase.functions.invoke("jitsi-token", {
      body: { appointment_id: appointmentId, role },
    });

    setJoining(false);

    if (error || !data?.room_name) {
      toast.error(data?.error ?? error?.message ?? "Could not get call details");
      return;
    }

    // Build the Jitsi URL with display name and open in new tab
    const displayName = encodeURIComponent(data.display_name ?? (role === "specialist" ? "Specialist" : "Customer"));
    const jitsiUrl = `https://meet.jit.si/${data.room_name}#userInfo.displayName="${displayName}"`;

    setRoomUrl(jitsiUrl);
    window.open(jitsiUrl, "_blank", "noopener,noreferrer");
  };

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
      setAppointment((current: any) => ({
        ...current,
        session_notes: notes,
        prescription,
        prescription_updated_at: now,
      }));
      toast.success("Notes and prescription saved");
    }
  };

  if (!appointment) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className={`grid gap-6 ${role === "specialist" ? "xl:grid-cols-[minmax(0,1fr)_400px]" : ""}`}>
      <div className="space-y-4">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Video session</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {role === "customer"
                ? `With ${appointment.specialist?.display_name}`
                : `With ${appointment.customer_name ?? "patient"}`}
            </p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to={role === "customer" ? "/dashboard/customer" : "/dashboard/specialist"}>
              Back
            </Link>
          </Button>
        </header>

        {/* Call launch area */}
        <Card className="overflow-hidden border-white/55 shadow-glow" style={{ minHeight: "320px" }}>
          <div className="flex h-full min-h-[320px] w-full flex-col items-center justify-center gap-6 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-10 text-primary-foreground">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 ring-2 ring-white/20">
              <Video className="h-10 w-10 opacity-80" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-semibold">Your session room is ready</h2>
              <p className="mt-2 max-w-sm text-sm opacity-70">
                The call opens in a new browser tab. Keep this page open to save notes and prescriptions.
              </p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <Button
                onClick={join}
                disabled={joining}
                size="lg"
                className="bg-gradient-brand px-8 shadow-brand"
              >
                {joining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <ExternalLink className="mr-2 h-4 w-4" />
                Join call
              </Button>
              {roomUrl && (
                <a
                  href={roomUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-white/50 underline-offset-4 hover:text-white/80 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Re-open call link
                </a>
              )}
            </div>
          </div>
        </Card>

        {role === "customer" && appointment.prescription && (
          <Card className="border-white/55 bg-card/90 p-5 shadow-brand backdrop-blur">
            <div className="flex items-center gap-2 font-semibold">
              <FileText className="h-4 w-4 text-teal" /> Prescription
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/90">
              {appointment.prescription}
            </p>
          </Card>
        )}
      </div>

      {role === "specialist" && (
        <aside className="space-y-3">
          <Card className="border-white/55 bg-card/90 p-4 shadow-brand backdrop-blur">
            <h2 className="text-sm font-semibold">Patient</h2>
            <div className="mt-2 text-sm">
              <div className="font-medium">{appointment.customer_name ?? "-"}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(appointment.scheduled_at).toLocaleString()}
              </div>
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
              className="mt-3 min-h-[180px] w-full resize-y rounded-lg border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </Card>

          <Card className="border-white/55 bg-card/90 p-4 shadow-brand backdrop-blur">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <FileText className="h-4 w-4 text-teal" /> Prescription
            </div>
            <textarea
              value={prescription}
              onChange={(e) => setPrescription(e.target.value)}
              placeholder="Customer-facing prescription, care plan, exercises..."
              className="mt-3 min-h-[180px] w-full resize-y rounded-lg border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <Button
              onClick={saveSessionText}
              disabled={savingNotes}
              className="mt-3 w-full bg-gradient-brand text-primary-foreground shadow-brand"
            >
              {savingNotes && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save notes & prescription
            </Button>
          </Card>
        </aside>
      )}
    </div>
  );
}
