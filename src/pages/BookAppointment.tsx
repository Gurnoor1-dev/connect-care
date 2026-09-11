import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { addDays, format, getDay, startOfDay } from "date-fns";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CalendarClock, CheckCircle2, Clock3, Coins, Loader2, ShieldCheck, Sparkles, Zap } from "lucide-react";

interface Tier { id: string; label: string; duration_minutes: number; price_cents: number; currency: string; }
interface Specialist { id: string; display_name: string; headline: string | null; country: string | null; country_flag: string | null; timezone: string | null; avatar_url: string | null; availability_status: "online" | "offline" | null; immediate_sessions: boolean; }
interface Availability { day_of_week: number; start_time: string; end_time: string; }
interface OfflinePeriod { id: string; start_time: string; end_time: string; is_active: boolean; }

const FUTURE_WORKING_DAYS = 5;
const SLOT_MINUTES = 15;

function bookingDays(from = new Date()) {
  const result: Date[] = [];
  let date = startOfDay(from);
  while (result.length < FUTURE_WORKING_DAYS + 1) {
    if (getDay(date) !== 0 && getDay(date) !== 6) result.push(date);
    date = addDays(date, 1);
  }
  return result;
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

function localDateTime(date: Date, minutes: number) {
  return `${format(date, "yyyy-MM-dd")}T${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function sameDayMinimum(immediateSessions: boolean, now = new Date()) {
  if (immediateSessions) return new Date(now.getTime() + 5 * 60 * 1000);
  const rounded = new Date(now);
  rounded.setMinutes(Math.floor(now.getMinutes() / 15) * 15, 0, 0);
  return new Date(rounded.getTime() + 5 * 60 * 60 * 1000);
}

function overlapsOfflinePeriod(slotStart: number, slotEnd: number, period: OfflinePeriod) {
  const start = timeToMinutes(period.start_time);
  const end = timeToMinutes(period.end_time);
  if (start < end) return slotStart < end && slotEnd > start;
  return (slotStart < 1440 && slotEnd > start) || (slotStart < end && slotEnd > 0);
}

export default function BookAppointment() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [specialistId, setSpecialistId] = useState(params.get("specialist") ?? "");
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [tierId, setTierId] = useState(params.get("tier") ?? "");
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [offlinePeriods, setOfflinePeriods] = useState<OfflinePeriod[]>([]);
  const [booked, setBooked] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [scheduledAt, setScheduledAt] = useState("");
  const [credits, setCredits] = useState(0);
  const [useCredits, setUseCredits] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [acceptPolicies, setAcceptPolicies] = useState(false);
  const submitLock = useRef(false);

  const allowedDays = useMemo(() => bookingDays(), []);
  const allowedSet = useMemo(() => new Set(allowedDays.map((date) => format(date, "yyyy-MM-dd"))), [allowedDays]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("specialist_profiles")
        .select("id, display_name, headline, country, country_flag, timezone, avatar_url, availability_status, immediate_sessions")
        .eq("is_published", true).eq("availability_status", "online").order("display_name");
      if (error) { toast.error(error.message); return; }
      const online = (data ?? []) as Specialist[];
      setSpecialists(online);
      if (specialistId && !online.some((item) => item.id === specialistId)) {
        setSpecialistId(""); setTierId(""); setScheduledAt("");
        toast.error("That specialist is currently unavailable for booking.");
      }
    })();
  }, [specialistId]);

  useEffect(() => {
    if (!specialistId) {
      setTiers([]); setAvailability([]); setOfflinePeriods([]); setCredits(0); setUseCredits(false); return;
    }
    (async () => {
      const [{ data: tierData, error: tierError }, { data: availabilityData, error: availabilityError }, { data: creditData }, { data: offlineData, error: offlineError }] =
        await Promise.all([
          supabase.from("specialist_tiers").select("id,label,duration_minutes,price_cents,currency").eq("specialist_id", specialistId).eq("is_active", true).order("price_cents"),
          supabase.from("specialist_availability").select("day_of_week,start_time,end_time").eq("specialist_id", specialistId).eq("is_active", true),
          user ? supabase.from("customer_specialist_credits").select("credit_points").eq("customer_id", user.id).eq("specialist_id", specialistId).maybeSingle() : Promise.resolve({ data: null } as any),
          supabase.from("specialist_offline_periods").select("id,start_time,end_time,is_active").eq("specialist_id", specialistId).eq("is_active", true).order("start_time"),
        ]);
      if (tierError) toast.error(tierError.message);
      if (availabilityError) toast.error(availabilityError.message);
      if (offlineError) toast.error(offlineError.message);
      setTiers(tierData ?? []); setAvailability(availabilityData ?? []); setOfflinePeriods((offlineData ?? []) as OfflinePeriod[]);
      const balance = Number((creditData as any)?.credit_points ?? 0);
      setCredits(balance); setUseCredits(balance > 0);
      if (!(tierData ?? []).some((tier: Tier) => tier.id === tierId)) setTierId("");
      setScheduledAt("");
    })();
  }, [specialistId, user]);

  useEffect(() => {
    if (!specialistId) return;
    (async () => {
      const { data, error } = await supabase.from("appointments").select("scheduled_at,duration_minutes,status")
        .eq("specialist_id", specialistId).in("status", ["pending_payment", "confirmed"]).gte("scheduled_at", new Date().toISOString());
      if (error) toast.error(error.message);
      setBooked(data ?? []);
    })();
  }, [specialistId, tierId]);

  const specialist = specialists.find((item) => item.id === specialistId);
  const tier = tiers.find((item) => item.id === tierId);

  const slots = useMemo(() => {
    if (!selectedDate || !tier || !specialist) return [];
    const day = getDay(selectedDate);
    const rules = availability.filter((item) => item.day_of_week === day);
    const ranges = rules.length ? rules : [{ day_of_week: day, start_time: "09:00", end_time: "17:00" }];
    const todayKey = format(new Date(), "yyyy-MM-dd");
    const selectedKey = format(selectedDate, "yyyy-MM-dd");
    const minimum = sameDayMinimum(!!specialist.immediate_sessions);
    const output: string[] = [];

    for (const range of ranges) {
      const rangeStart = timeToMinutes(range.start_time);
      const rangeEnd = timeToMinutes(range.end_time);
      for (let minutes = rangeStart; minutes + tier.duration_minutes <= rangeEnd; minutes += SLOT_MINUTES) {
        const value = localDateTime(selectedDate, minutes);
        const startMs = new Date(value).getTime();
        const endMs = startMs + tier.duration_minutes * 60000;
        const slotEnd = minutes + tier.duration_minutes;

        if (selectedKey === todayKey ? startMs < minimum.getTime() : startMs <= Date.now() + 300000) continue;
        if (offlinePeriods.some((period) => overlapsOfflinePeriod(minutes, slotEnd, period))) continue;
        if (booked.some((appointment) => {
          const bookedStart = new Date(appointment.scheduled_at).getTime();
          const bookedEnd = bookedStart + Number(appointment.duration_minutes) * 60000;
          return startMs < bookedEnd && endMs > bookedStart;
        })) continue;

        output.push(value);
      }
    }
    return [...new Set(output)];
  }, [selectedDate, tier, specialist, availability, offlinePeriods, booked]);

  const submitPayu = (html: string) => {
    const element = document.createElement("div");
    element.innerHTML = html;
    const form = element.querySelector<HTMLFormElement>("form");
    if (!form) throw new Error("PayU form was not returned");
    form.style.display = "none";
    document.body.appendChild(form);
    form.submit();
  };

  const book = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitLock.current) return;
    if (!user || !specialistId || !tier || !scheduledAt) return;
    if (!acceptPolicies) {
      toast.error("Please accept the Terms, Privacy Policy, Trust & Safety Policy, and Cancellation & Refund Policy before booking.");
      return;
    }
    submitLock.current = true;
    setSubmitting(true);

    try {
      if (useCredits && credits > 0) {
        const { error } = await supabase.from("customer_specialist_credits").update({ credit_points: credits - 1, updated_at: new Date().toISOString() })
          .eq("customer_id", user.id).eq("specialist_id", specialistId).gte("credit_points", 1);
        if (error) throw new Error(error.message);

        const { error: appointmentError } = await supabase.from("appointments").insert({
          customer_id: user.id, specialist_id: specialistId, tier_id: tier.id,
          scheduled_at: new Date(scheduledAt).toISOString(), duration_minutes: tier.duration_minutes,
          amount_cents: 0, currency: tier.currency, status: "confirmed",
          customer_name: user.user_metadata?.full_name ?? user.email ?? "Customer", payment_method: "credits",
        });
        if (appointmentError) {
          await supabase.from("customer_specialist_credits").update({ credit_points: credits })
            .eq("customer_id", user.id).eq("specialist_id", specialistId);
          throw new Error(appointmentError.message);
        }
        toast.success("Session booked using 1 credit");
        navigate("/dashboard/customer/appointments");
        return;
      }

      const { data: appointment, error: appointmentError } = await supabase.from("appointments").insert({
        customer_id: user.id, specialist_id: specialistId, tier_id: tier.id,
        scheduled_at: new Date(scheduledAt).toISOString(), duration_minutes: tier.duration_minutes,
        amount_cents: tier.price_cents, currency: tier.currency, status: "pending_payment",
        customer_name: user.user_metadata?.full_name ?? user.email ?? "Customer",
      }).select().single();

      if (appointmentError || !appointment) throw new Error(appointmentError?.message ?? "Could not create appointment");

      const { data, error } = await supabase.functions.invoke("payu-initiate", { body: { appointment_id: appointment.id } });
      if (error || (!data?.formHtml && !data?.redirect_url)) throw new Error(data?.error ?? error?.message ?? "Payment initialisation failed");
      if (data.formHtml) submitPayu(data.formHtml); else window.location.href = data.redirect_url;
    } catch (error) {
      setSubmitting(false);
      submitLock.current = false;
      toast.error(error instanceof Error ? error.message : "Could not complete booking");
    }
  };

  const todaySelected = selectedDate && format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

  return <section className="relative overflow-hidden bg-gradient-page px-4 py-8 sm:py-12 lg:py-16">
    <div className="container mx-auto grid min-w-0 gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-8">
      <div className="min-w-0 space-y-5 lg:sticky lg:top-24 lg:self-start">
        <div className="inline-flex max-w-full items-center gap-2 rounded-full border bg-card/85 px-3 py-2 text-xs font-semibold text-primary shadow-brand"><Sparkles className="h-3.5 w-3.5 shrink-0" />Protected booking & secure checkout</div>
        <div><h1 className="text-3xl font-semibold leading-tight sm:text-5xl lg:text-6xl">Book a specialist session</h1><p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">Choose a specialist, plan, today or one of the next five working days, and an available time.</p></div>
        <div className="grid gap-3 sm:grid-cols-3">{[[ShieldCheck, "Protected", "Auth required"], [CalendarClock, "Today + 5", "workdays"], [CheckCircle2, "PayU verified", "Payment"]].map(([Icon, value, label]) => <Card key={String(label)} className="min-w-0 border-white/55 bg-card/85 p-3 shadow-brand sm:p-4"><Icon className="h-5 w-5 text-teal" /><div className="mt-2 text-sm font-semibold">{String(value)}</div><div className="text-xs text-muted-foreground">{String(label)}</div></Card>)}</div>
        {specialist && <Card className="flex min-w-0 items-center gap-3 border-white/60 bg-card/90 p-4 shadow-brand"><div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gradient-brand">{specialist.avatar_url ? <img src={specialist.avatar_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xl font-bold text-white">{specialist.display_name[0]}</div>}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><div className="truncate font-semibold">{specialist.display_name}</div>{specialist.immediate_sessions && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary"><Zap className="h-3 w-3" />Immediate</span>}</div><div className="truncate text-sm text-muted-foreground">{specialist.country_flag} {specialist.country} · {specialist.timezone}</div><div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{specialist.headline}</div></div></Card>}
        {credits > 0 && <Card className="border-teal/30 bg-teal/5 p-4 shadow-brand"><div className="flex items-center gap-2 font-semibold text-teal"><Coins className="h-4 w-4" />{credits} specialist credit{credits === 1 ? "" : "s"} available</div></Card>}
      </div>

      <Card className="min-w-0 overflow-hidden border-white/60 bg-card/90 p-4 shadow-card sm:p-6">
        <form onSubmit={book} className="min-w-0 space-y-5">
          <div><Label>Specialist</Label><Select value={specialistId} onValueChange={setSpecialistId}><SelectTrigger className="mt-2 w-full"><SelectValue placeholder="Select a specialist" /></SelectTrigger><SelectContent>{specialists.map((item) => <SelectItem key={item.id} value={item.id}>{item.country_flag} {item.display_name}{item.immediate_sessions ? " · Immediate" : ""}</SelectItem>)}</SelectContent></Select></div>

          {specialistId && <div><Label>Payment method</Label><div className="mt-2 grid gap-2 sm:grid-cols-2">
            <button type="button" disabled={!credits} onClick={() => setUseCredits(true)} className={`min-w-0 rounded-2xl border p-3 text-left transition-colors ${useCredits && credits ? "border-teal bg-teal/10" : "bg-background hover:bg-accent/40"}`}><Coins className="h-4 w-4 text-teal" /><div className="mt-1 text-sm font-medium">Use credits</div><div className="text-xs text-muted-foreground">{credits} available</div></button>
            <button type="button" onClick={() => setUseCredits(false)} className={`min-w-0 rounded-2xl border p-3 text-left transition-colors ${!useCredits || !credits ? "border-primary bg-primary/5" : "bg-background hover:bg-accent/40"}`}><ShieldCheck className="h-4 w-4 text-primary" /><div className="mt-1 text-sm font-medium">Pay via PayU</div><div className="text-xs text-muted-foreground">Secure online payment</div></button>
          </div></div>}

          <div><Label>Session plan</Label><Select value={tierId} onValueChange={setTierId} disabled={!specialistId || !tiers.length}><SelectTrigger className="mt-2 w-full"><SelectValue placeholder={!specialistId ? "Pick a specialist first" : !tiers.length ? "No active plans" : "Select a plan"} /></SelectTrigger><SelectContent>{tiers.map((item) => <SelectItem key={item.id} value={item.id}>{item.label} · {item.currency} {(item.price_cents / 100).toFixed(2)} / {item.duration_minutes} min</SelectItem>)}</SelectContent></Select></div>

          <div className="overflow-hidden rounded-3xl border bg-gradient-soft p-3 sm:p-4"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2 font-semibold"><CalendarClock className="h-4 w-4 text-teal" />Choose your date</div><span className="text-[11px] text-muted-foreground">Today + 5 working days</span></div><DayPicker mode="single" selected={selectedDate} onSelect={(date) => { setSelectedDate(date); setScheduledAt(""); }} disabled={(date) => !allowedSet.has(format(date, "yyyy-MM-dd"))} startMonth={allowedDays[0]} endMonth={allowedDays[allowedDays.length - 1]} showOutsideDays={false} className="booking-calendar mx-auto" /></div>

          <div><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><Label>Available time</Label>{specialist?.timezone && <span className="text-xs text-muted-foreground">{specialist.timezone}</span>}</div>
            {todaySelected && specialist && <p className="mb-3 rounded-xl bg-accent/45 px-3 py-2 text-xs leading-5 text-muted-foreground">{specialist.immediate_sessions ? <><span className="font-semibold text-foreground">Immediate Sessions are enabled.</span> Same-day booking can start 5 minutes after the current time.</> : <>For today, booking opens <span className="font-semibold text-foreground">5 hours after the current time</span>, rounded down to the nearest 15 minutes.</>}</p>}
            {offlinePeriods.length > 0 && <p className="mb-3 rounded-xl border bg-background px-3 py-2 text-xs leading-5 text-muted-foreground">Some times may be unavailable because this specialist has scheduled offline periods.</p>}
            {!selectedDate || !tier ? <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">Select a plan and date to see available times.</div> : !slots.length ? <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">No slots are available for this date.</div> : <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">{slots.map((slot) => <button key={slot} type="button" onClick={() => setScheduledAt(slot)} className={`rounded-2xl border px-3 py-2.5 text-sm font-medium transition-colors ${scheduledAt === slot ? "border-teal bg-teal/10" : "bg-background hover:border-teal/50"}`}><Clock3 className="mr-1 inline h-3.5 w-3.5" />{format(new Date(slot), "h:mm a")}</button>)}</div>}
          </div>

          {scheduledAt && <div className="rounded-2xl border bg-background p-4 text-sm"><div className="font-semibold">Selected appointment</div><div className="mt-1 break-words text-muted-foreground">{format(new Date(scheduledAt), "EEEE, MMM d · h:mm a")} · {tier?.duration_minutes} minutes</div></div>}
          {tier && <div className="rounded-2xl border bg-accent/40 p-4 text-sm"><div className="flex flex-wrap justify-between gap-2"><span className="text-muted-foreground">Total</span><span className="font-semibold">{useCredits && credits > 0 ? "1 credit" : `${tier.currency} ${(tier.price_cents / 100).toFixed(2)}`}</span></div></div>}

          <label className="flex items-start gap-3 rounded-2xl border bg-background p-4 text-sm"><Checkbox checked={acceptPolicies} onCheckedChange={(value) => setAcceptPolicies(!!value)} className="mt-0.5 shrink-0" /><span className="leading-6 text-muted-foreground">I have read and agree to the <Link to="/terms" target="_blank" className="font-medium text-foreground underline underline-offset-4">Terms & Conditions</Link>, <Link to="/privacy" target="_blank" className="font-medium text-foreground underline underline-offset-4">Privacy Policy</Link>, <Link to="/trust" target="_blank" className="font-medium text-foreground underline underline-offset-4">Trust & Safety Policy</Link>, and <Link to="/cancellation" target="_blank" className="font-medium text-foreground underline underline-offset-4">Cancellation & Refund Policy</Link>.</span></label>

          <div className="flex flex-col-reverse gap-2 sm:flex-row"><Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={submitting} className="sm:w-auto">Cancel</Button><Button type="submit" disabled={submitting || !specialistId || !tierId || !scheduledAt || !acceptPolicies} className="min-w-0 flex-1 rounded-full bg-primary text-primary-foreground shadow-brand">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : useCredits && credits > 0 ? <><Zap className="mr-2 h-4 w-4" />Book with 1 credit</> : "Continue to payment"}</Button></div>
        </form>
        <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">New here? <Link to="/signup" className="underline">Create an account</Link> before booking.</p>
      </Card>
    </div>
  </section>;
}
