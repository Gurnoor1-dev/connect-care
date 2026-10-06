import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ClipboardList, FileText, Loader2, Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";
import { toast } from "sonner";

declare global { interface Window { DailyIframe?: { createFrame: (el: HTMLElement, opts?: Record<string, unknown>) => DailyFrame; }; } }
type DailyFrame = { join: (o?: { url?: string; token?: string; userName?: string }) => Promise<void>; leave: () => Promise<void>; destroy: () => void; on: (e: string, h: (x?: unknown) => void) => DailyFrame; setLocalAudio: (v: boolean) => void; setLocalVideo: (v: boolean) => void; };

const JOIN_EARLY_MS = 2 * 60 * 1000;
const JOIN_WINDOW_MS = 60 * 60 * 1000;
const DAILY_JOIN_TIMEOUT_MS = 20000;

function loadDaily() {
  return new Promise<void>((resolve, reject) => {
    if (window.DailyIframe) return resolve();
    const existing = document.querySelector("script[data-daily]");
    if (existing) {
      const interval = window.setInterval(() => { if (window.DailyIframe) { clearInterval(interval); resolve(); } }, 100);
      window.setTimeout(() => { clearInterval(interval); reject(new Error("Daily video SDK timeout")); }, 10000);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/@daily-co/daily-js";
    script.crossOrigin = "anonymous";
    script.dataset.daily = "true";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load video SDK"));
    document.head.appendChild(script);
  });
}

const wait = (ms: number) => new Promise<void>(resolve => window.setTimeout(resolve, ms));

export function VideoCallScreen({ role }: { role: "customer" | "specialist" }) {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const { user } = useAuth();
  const [appointment, setAppointment] = useState<any>(null);
  const [loadingAppointment, setLoadingAppointment] = useState(true);
  const [joining, setJoining] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [audio, setAudio] = useState(true);
  const [video, setVideo] = useState(true);
  const [notes, setNotes] = useState("");
  const [prescription, setPrescription] = useState("");
  const [saving, setSaving] = useState(false);
  const frame = useRef<DailyFrame | null>(null);
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);

  useEffect(() => {
    if (!appointmentId || !user) return;
    let cancelled = false; setLoadingAppointment(true);
    (async () => {
      const { data, error } = await supabase.from("appointments").select("*, specialist:specialist_profiles!appointments_specialist_id_fkey(display_name)").eq("id", appointmentId).single();
      if (cancelled) return;
      if (error) { toast.error(error.message); setAppointment(null); }
      else { setAppointment(data); if (role === "specialist") { setNotes(data?.session_notes ?? ""); setPrescription(data?.prescription ?? ""); } }
      setLoadingAppointment(false);
    })();
    return () => { cancelled = true; };
  }, [appointmentId, user, role]);

  const start = appointment ? new Date(appointment.scheduled_at).getTime() : 0;
  const joinOpensAt = start - JOIN_EARLY_MS;
  const joinEndsAt = start + JOIN_WINDOW_MS;
  const open = !!appointment && appointment.status === "confirmed" && now >= joinOpensAt && now < joinEndsAt;
  const message = !appointment ? "" : appointment.status !== "confirmed" ? `Appointment is ${appointment.status}.` : now < joinOpensAt ? `Join opens ${new Date(start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} (2 minutes before the session).` : now < start ? `Session starts at ${new Date(start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.` : "The one-hour join window has ended.";

  const presenceQueueRef = useRef(Promise.resolve());

  const recordPresence = async (action: "heartbeat" | "leave" | "finalize") => {
    if (!appointmentId) return;
    const run = async () => {
      try {
      const { data, error } = await supabase.functions.invoke("session-presence", { body: { appointment_id: appointmentId, action } });
      if (error) throw error;
      if (data?.status && data.status !== appointment?.status) setAppointment((current: any) => ({ ...current, status: data.status }));
      } catch (error) {
        console.error("session presence update failed", error);
      }
    };
    const queued = presenceQueueRef.current.then(run, run);
    presenceQueueRef.current = queued.then(() => undefined, () => undefined);
    await queued;
  };

  useEffect(() => {
    if (!appointmentId || !appointment) return;
    const id = window.setInterval(() => {
      if (inCall) {
        void recordPresence("heartbeat");
      } else if (Date.now() >= joinEndsAt) {
        void recordPresence("finalize");
      }
    }, 10000);
    return () => clearInterval(id);
  }, [appointmentId, appointment?.status, joinEndsAt, inCall]);

  useEffect(() => () => {
    const current = frame.current;
    frame.current = null;
    if (current) { void current.leave().catch(() => undefined); current.destroy(); }
  }, []);

  const destroyFrame = () => {
    const current = frame.current;
    frame.current = null;
    if (current) { void current.leave().catch(() => undefined); current.destroy(); }
    if (host.current) host.current.innerHTML = "";
    setInCall(false);
  };

  const createAndJoin = async (roomUrl: string, token: string, displayName?: string) => {
    if (!host.current || !window.DailyIframe) throw new Error("Video service is unavailable. Please try again.");
    const callHost = host.current;
    callHost.innerHTML = "";

    // Pass URL/token at frame creation as well as join time. This avoids a race on
    // iOS Safari where the embedded Daily frame can remain on its loading spinner
    // after camera/microphone permission is granted.
    const dailyFrame = window.DailyIframe.createFrame(callHost, {
      url: roomUrl,
      token,
      userName: displayName,
      iframeStyle: { width: "100%", height: "100%", border: "0", borderRadius: "16px", backgroundColor: "#000" },
      showLeaveButton: false,
      showFullscreenButton: true,
      showParticipantsBar: true,
      showLocalVideo: true,
    });
    frame.current = dailyFrame;

    let joined = false;
    let joinStarted = false;
    const markJoining = () => { joinStarted = true; setInCall(true); };
    dailyFrame.on("loaded", () => console.info("Daily frame loaded"));
    dailyFrame.on("joining-meeting", markJoining);
    dailyFrame.on("joined-meeting", () => {
      joined = true;
      setInCall(true);
      void recordPresence("heartbeat");
    });
    dailyFrame.on("left-meeting", () => { setInCall(false); frame.current?.destroy(); frame.current = null; void recordPresence("leave"); });
    dailyFrame.on("camera-error", (event) => { console.error("Daily camera error", event); toast.error("Camera/microphone could not start. Please check browser permissions."); });
    dailyFrame.on("error", (event) => { console.error("Daily call error", event); });

    // Some mobile Safari versions need the frame to finish loading before join().
    // If it is already loaded, the event is immediate; otherwise give it a short
    // head start and then explicitly join with the same room/token.
    await wait(150);
    await dailyFrame.join({ url: roomUrl, token, userName: displayName });

    const deadline = Date.now() + DAILY_JOIN_TIMEOUT_MS;
    while (!joined && Date.now() < deadline) {
      await wait(250);
      if (!frame.current) throw new Error("The video call was closed before joining.");
    }
    if (!joined && !joinStarted) throw new Error("The video call did not finish connecting. Please tap Join call again.");
    setInCall(true);
  };

  const join = async () => {
    if (!appointmentId || !host.current || !open || joining) return;
    setJoining(true);
    try {
      await loadDaily();
      if (!window.DailyIframe) throw new Error("Video service is unavailable. Please try again.");
      const { data, error } = await supabase.functions.invoke("smart-handler", { body: { appointment_id: appointmentId } });
      if (error || !data?.room_url || !data?.token) throw new Error(data?.error ?? error?.message ?? "Could not start video call");

      try {
        await createAndJoin(data.room_url, data.token, data.display_name);
      } catch (firstError) {
        console.warn("Daily first join attempt failed; retrying once", firstError);
        destroyFrame();
        await wait(500);
        await createAndJoin(data.room_url, data.token, data.display_name);
      }

      setAppointment((current: any) => ({ ...current, ...(role === "specialist" ? { specialist_joined_at: new Date().toISOString() } : { customer_joined_at: new Date().toISOString() }) }));
    } catch (error) {
      setInCall(false); destroyFrame();
      toast.error(error instanceof Error ? error.message : "Could not join the call");
    } finally { setJoining(false); }
  };

  const leave = async () => {
    try { await frame.current?.leave(); }
    finally { frame.current?.destroy(); frame.current = null; setInCall(false); await recordPresence("leave"); }
  };

  const save = async () => {
    if (!appointmentId) return;
    setSaving(true); const stamp = new Date().toISOString();
    const { error } = await supabase.from("appointments").update({ session_notes: notes, notes_updated_at: stamp, prescription, prescription_updated_at: stamp }).eq("id", appointmentId);
    setSaving(false); if (error) toast.error(error.message); else toast.success("Notes and prescription saved");
  };

  if (loadingAppointment) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!appointment) return <div className="flex h-96 items-center justify-center text-sm text-muted-foreground">Appointment could not be loaded.</div>;

  return <div className={`grid gap-6 ${role === "specialist" ? "xl:grid-cols-[minmax(0,1fr)_400px]" : ""}`}>
    <div className="space-y-4">
      <header className="flex items-center justify-between"><div><h1 className="text-2xl font-semibold">Video session</h1><p className="mt-1 text-sm text-muted-foreground">{role === "customer" ? `With ${appointment.specialist?.display_name}` : `With ${appointment.customer_name ?? "patient"}`}</p></div><Button asChild variant="ghost"><Link to={role === "customer" ? "/dashboard/customer" : "/dashboard/specialist"}>Back</Link></Button></header>
      <Card className="overflow-hidden border-white/55 bg-black p-0 shadow-card"><div className="relative h-[560px] w-full bg-black"><div ref={host} className="h-full w-full" />{!inCall && !joining && <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-8 text-primary-foreground"><div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10"><Video className="h-10 w-10" /></div><div className="text-center"><h2 className="text-xl font-semibold">Ready to join?</h2><p className="mt-2 text-sm opacity-70">{open ? "Your secure session is ready now. You can leave and rejoin this same call at any time during the one-hour window." : message}</p></div>{open && <Button onClick={join} disabled={joining} size="lg" className="rounded-full bg-gradient-brand"><Video className="mr-2 h-4 w-4" />Join call</Button>}</div>}{joining && <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-primary-foreground"><div className="rounded-xl bg-black/70 px-5 py-4 text-center text-sm"><Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" />Connecting to your secure session…</div></div>}</div></Card>
      {inCall && <div className="flex justify-center gap-3"><Button size="sm" variant={audio ? "secondary" : "outline"} onClick={() => { const value = !audio; frame.current?.setLocalAudio(value); setAudio(value); }}>{audio ? <Mic /> : <MicOff />}{audio ? "Mute" : "Unmute"}</Button><Button size="sm" variant={video ? "secondary" : "outline"} onClick={() => { const value = !video; frame.current?.setLocalVideo(value); setVideo(value); }}>{video ? <Video /> : <VideoOff />}{video ? "Stop video" : "Start video"}</Button><Button size="sm" className="bg-destructive text-destructive-foreground" onClick={leave}><PhoneOff />Leave call</Button></div>}
      {role === "customer" && appointment.prescription && <Card className="p-5 shadow-card"><div className="font-semibold"><FileText className="mr-2 inline h-4 w-4 text-teal" />Prescription</div><p className="mt-3 whitespace-pre-wrap text-sm">{appointment.prescription}</p></Card>}
    </div>
    {role === "specialist" && <aside className="space-y-3"><Card className="p-4 shadow-card"><h2 className="text-sm font-semibold">Patient</h2><p className="mt-2 text-sm">{appointment.customer_name ?? "—"}</p><p className="text-xs text-muted-foreground">{new Date(appointment.scheduled_at).toLocaleString()}</p></Card><Card className="p-4 shadow-card"><div className="font-semibold"><ClipboardList className="mr-2 inline h-4 w-4 text-teal" />Private notes</div><textarea value={notes} onChange={e => setNotes(e.target.value)} className="mt-3 min-h-40 w-full rounded-lg border bg-background p-3 text-sm" /></Card><Card className="p-4 shadow-card"><div className="font-semibold"><FileText className="mr-2 inline h-4 w-4 text-teal" />Prescription</div><textarea value={prescription} onChange={e => setPrescription(e.target.value)} className="mt-3 min-h-40 w-full rounded-lg border bg-background p-3 text-sm" /><Button onClick={save} disabled={saving} className="mt-3 w-full bg-gradient-brand">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save notes & prescription</Button></Card></aside>}
  </div>;
}
