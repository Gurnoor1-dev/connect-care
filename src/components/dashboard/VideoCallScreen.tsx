import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ClipboardList,
  FileText,
  Loader2,
  Mic,
  MicOff,
  PhoneOff,
  Video,
  VideoOff,
} from "lucide-react";
import { toast } from "sonner";

/* ─── Daily.co types (loaded via CDN script tag) ─── */
declare global {
  interface Window {
    DailyIframe: {
      createFrame: (
        el: HTMLElement,
        options?: Record<string, unknown>,
      ) => DailyCallFrame;
    };
  }
}
interface DailyCallFrame {
  join: (opts: { url: string; token?: string }) => Promise<void>;
  leave: () => Promise<void>;
  destroy: () => void;
  on: (event: string, handler: (e: unknown) => void) => DailyCallFrame;
  setLocalAudio: (enabled: boolean) => void;
  setLocalVideo: (enabled: boolean) => void;
}

/* ─── Load Daily.co SDK from CDN once ─── */
function loadDailyScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.DailyIframe) return resolve();
    if (document.querySelector('script[data-daily]')) {
      // Script tag already injected — wait for it
      const interval = setInterval(() => {
        if (window.DailyIframe) { clearInterval(interval); resolve(); }
      }, 100);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/@daily-co/daily-js";
    script.setAttribute("data-daily", "true");
    script.crossOrigin = "anonymous";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Daily.co SDK"));
    document.head.appendChild(script);
  });
}

export function VideoCallScreen({ role }: { role: "customer" | "specialist" }) {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const { user } = useAuth();

  const [appointment, setAppointment] = useState<any>(null);
  const [joining, setJoining] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [audioOn, setAudioOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [notes, setNotes] = useState("");
  const [prescription, setPrescription] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const callFrameRef = useRef<DailyCallFrame | null>(null);
  const callContainerRef = useRef<HTMLDivElement>(null);

  /* ── Load appointment ── */
  useEffect(() => {
    if (!appointmentId || !user) return;
    (async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select(
          "*, specialist:specialist_profiles!appointments_specialist_id_fkey(display_name)",
        )
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

  /* ── Clean up call frame on unmount ── */
  useEffect(() => {
    return () => {
      callFrameRef.current?.destroy();
    };
  }, []);

  /* ── Join call ── */
  const join = async () => {
    if (!appointmentId || !callContainerRef.current) return;
    setJoining(true);

    try {
      await loadDailyScript();
    } catch {
      toast.error("Could not load video SDK. Check your connection.");
      setJoining(false);
      return;
    }

    // Invoking your updated 'daily-token' edge function
    const { data, error } = await supabase.functions.invoke("daily-token", {
      body: { appointment_id: appointmentId, role },
    });

    if (error || !data?.room_url) {
      toast.error(data?.error ?? error?.message ?? "Could not start video call");
      setJoining(false);
      return;
    }

    try {
      const frame = window.DailyIframe.createFrame(callContainerRef.current, {
        iframeStyle: {
          width: "100%",
          height: "100%",
          border: "none",
          borderRadius: "0.5rem",
        },
        showLeaveButton: false,    // Custom UI controls are rendered below instead
        showFullscreenButton: true,
      });

      frame.on("left-meeting", () => {
        setInCall(false);
        callFrameRef.current?.destroy();
        callFrameRef.current = null;
      });

      frame.on("error", (e) => {
        toast.error("Video call error — please try rejoining.");
        console.error("[Daily]", e);
      });

      // Secure payload construction preventing TypeScript parameter validations from throwing errors
      const joinOptions: { url: string; token?: string } = {
        url: data.room_url,
      };

      if (data.token && typeof data.token === "string") {
        joinOptions.token = data.token;
      }

      await frame.join(joinOptions);

      callFrameRef.current = frame;
      setInCall(true);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to join the call");
    }

    setJoining(false);
  };

  /* ── Leave call ── */
  const leave = async () => {
    await callFrameRef.current?.leave();
    callFrameRef.current?.destroy();
    callFrameRef.current = null;
    setInCall(false);
  };

  /* ── Toggle audio / video ── */
  const toggleAudio = () => {
    const next = !audioOn;
    callFrameRef.current?.setLocalAudio(next);
    setAudioOn(next);
  };

  const toggleVideo = () => {
    const next = !videoOn;
    callFrameRef.current?.setLocalVideo(next);
    setVideoOn(next);
  };

  /* ── Save session notes (specialist only) ── */
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
      setAppointment((cur: any) => ({
        ...cur,
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
    <div
      className={`grid gap-6 ${
        role === "specialist" ? "xl:grid-cols-[minmax(0,1fr)_400px]" : ""
      }`}
    >
      {/* ── Main call area ── */}
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
            <Link
              to={
                role === "customer"
                  ? "/dashboard/customer"
                  : "/dashboard/specialist"
              }
            >
              Back
            </Link>
          </Button>
        </header>

        {/* ── Video card ── */}
        <Card
          className="overflow-hidden border-white/55 shadow-glow"
          style={{ minHeight: "420px" }}
        >
          {/* Pre-join screen */}
          {!inCall && (
            <div className="flex h-full min-h-[420px] w-full flex-col items-center justify-center gap-6 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-10 text-primary-foreground">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 ring-2 ring-white/20">
                <Video className="h-10 w-10 opacity-80" />
              </div>
              <div className="text-center">
                <h2 className="text-xl font-semibold">Ready to join?</h2>
                <p className="mt-2 max-w-sm text-sm opacity-70">
                  Your session room is secure and end-to-end encrypted via
                  Daily.co. Camera and microphone access will be requested on
                  join.
                </p>
              </div>
              <Button
                onClick={join}
                disabled={joining}
                size="lg"
                className="bg-gradient-brand px-8 shadow-brand"
              >
                {joining ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Video className="mr-2 h-4 w-4" />
                )}
                {joining ? "Connecting…" : "Join call"}
              </Button>
            </div>
          )}

          {/* Daily.co iframe container — always mounted, hidden pre-join */}
          <div
            ref={callContainerRef}
            className={`w-full transition-all duration-300 ${
              inCall ? "h-[480px] opacity-100 lg:h-[560px]" : "h-0 opacity-0 pointer-events-none"
            }`}
          />
        </Card>

        {/* ── In-call controls ── */}
        {inCall && (
          <div className="flex items-center justify-center gap-3">
            <ControlButton
              active={audioOn}
              activeIcon={<Mic className="h-4 w-4" />}
              inactiveIcon={<MicOff className="h-4 w-4" />}
              activeLabel="Mute"
              inactiveLabel="Unmute"
              onClick={toggleAudio}
              variant="secondary"
            />
            <ControlButton
              active={videoOn}
              activeIcon={<Video className="h-4 w-4" />}
              inactiveIcon={<VideoOff className="h-4 w-4" />}
              activeLabel="Stop video"
              inactiveLabel="Start video"
              onClick={toggleVideo}
              variant="secondary"
            />
            <Button
              onClick={leave}
              size="sm"
              className="gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <PhoneOff className="h-4 w-4" />
              Leave call
            </Button>
          </div>
        )}

        {/* ── Customer: show prescription if available ── */}
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

      {/* ── Specialist sidebar ── */}
      {role === "specialist" && (
        <aside className="space-y-3">
          <Card className="border-white/55 bg-card/90 p-4 shadow-brand backdrop-blur">
            <h2 className="text-sm font-semibold">Patient</h2>
            <div className="mt-2 text-sm">
              <div className="font-medium">{appointment.customer_name ?? "—"}</div>
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
              placeholder="Private observations, symptoms, follow-up thoughts…"
              className="mt-3 min-h-[160px] w-full resize-y rounded-lg border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </Card>

          <Card className="border-white/55 bg-card/90 p-4 shadow-brand backdrop-blur">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <FileText className="h-4 w-4 text-teal" /> Prescription
            </div>
            <textarea
              value={prescription}
              onChange={(e) => setPrescription(e.target.value)}
              placeholder="Customer-facing prescription, care plan, exercises…"
              className="mt-3 min-h-[160px] w-full resize-y rounded-lg border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <Button
              onClick={saveSessionText}
              disabled={savingNotes}
              className="mt-3 w-full bg-gradient-brand text-primary-foreground shadow-brand"
            >
              {savingNotes && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save notes & prescription
            </Button>
          </Card>
        </aside>
      )}
    </div>
  );
}

/* ─── Small reusable control button ─── */
function ControlButton({
  active,
  activeIcon,
  inactiveIcon,
  activeLabel,
  inactiveLabel,
  onClick,
  variant = "secondary",
}: {
  active: boolean;
  activeIcon: React.ReactNode;
  inactiveIcon: React.ReactNode;
  activeLabel: string;
  inactiveLabel: string;
  onClick: () => void;
  variant?: "secondary" | "outline";
}) {
  return (
    <Button
      onClick={onClick}
      size="sm"
      variant={active ? variant : "outline"}
      className={`gap-2 ${!active ? "border-destructive/40 text-destructive hover:bg-destructive/10" : ""}`}
    >
      {active ? activeIcon : inactiveIcon}
      {active ? activeLabel : inactiveLabel}
    </Button>
  );
}
