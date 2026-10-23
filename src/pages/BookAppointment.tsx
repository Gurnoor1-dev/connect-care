import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { addDays, format, startOfDay } from "date-fns";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CalendarClock, CheckCircle2, Clock3, Coins, Loader2, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { getDeviceTimeZone, getTimeZoneLabel, formatInTimeZone, zonedTimeToUtc, getZonedDateKey } from "@/lib/timezone";

type RazorpayInstance = { open: () => void };
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

interface Tier { id: string; label: string; duration_minutes: number; price_cents: number; currency: string; tier_type?: string | null; }
interface Specialist { id: string; display_name: string; headline: string | null; country: string | null; country_flag: string | null; timezone: string | null; avatar_url: string | null; immediate_sessions: boolean; }
interface Availability { available_date: string; day_of_week: number; start_time: string; end_time: string; }
interface BookedAppointment { scheduled_at: string; duration_minutes: number; status: string; }
interface SlotOption { value: string; booked: boolean; }

const FUTURE_BOOKING_DAYS = 7;
const SLOT_MINUTES = 15;

function bookingDays(from = new Date()) {
  const result: Date[] = [];
  let date = startOfDay(from);
  while (result.length < FUTURE_BOOKING_DAYS + 1) {
    result.push(date);
    date = addDays(date, 1);
  }
  return result;
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

function firstConsultationPrice(priceCents: number, tierType?: string | null) {
  if (tierType === "bundle") return null;
  const discounts: Record<number, number> = { 9900: 6900, 12900: 9100, 18900: 13300 };
  return discounts[priceCents] ?? null;
}


function hasAvailableSlotOnDate(
  date: Date,
  tier: Tier | undefined,
  specialist: Specialist | undefined,
  availability: Availability[],
  booked: BookedAppointment[],
) {
  if (!tier || !specialist) return false;
  const viewerTimeZone = getDeviceTimeZone();
  const viewerDateKey = format(date, "yyyy-MM-dd");
  const todayKey = getZonedDateKey(new Date(), viewerTimeZone);
  const minimum = sameDayMinimum(!!specialist.immediate_sessions);

  for (const range of availability) {
    const rangeStart = timeToMinutes(range.start_time);
    const rawRangeEnd = timeToMinutes(range.end_time);
    const rangeEnd = rawRangeEnd <= rangeStart ? rawRangeEnd + 24 * 60 : rawRangeEnd;
    for (let minutes = rangeStart; minutes + tier.duration_minutes <= rangeEnd; minutes += SLOT_MINUTES) {
      const startDayOffset = Math.floor(minutes / (24 * 60));
      const endDayOffset = Math.floor((minutes + tier.duration_minutes) / (24 * 60));
      const startMinuteOfDay = minutes % (24 * 60);
      const endMinuteOfDay = (minutes + tier.duration_minutes) % (24 * 60);
      const startDate = new Date(`${range.available_date}T00:00:00Z`);
      startDate.setUTCDate(startDate.getUTCDate() + startDayOffset);
      const endDate = new Date(`${range.available_date}T00:00:00Z`);
      endDate.setUTCDate(endDate.getUTCDate() + endDayOffset);
      const startTime = `${String(Math.floor(startMinuteOfDay / 60)).padStart(2, "0")}:${String(startMinuteOfDay % 60).padStart(2, "0")}`;
      const endTime = `${String(Math.floor(endMinuteOfDay / 60)).padStart(2, "0")}:${String(endMinuteOfDay % 60).padStart(2, "0")}`;
      const start = zonedTimeToUtc(startDate.toISOString().slice(0, 10), startTime, specialist.timezone ?? "UTC");
      const end = zonedTimeToUtc(endDate.toISOString().slice(0, 10), endTime, specialist.timezone ?? "UTC");
      if (getZonedDateKey(start, viewerTimeZone) !== viewerDateKey) continue;
      if (viewerDateKey === todayKey ? start.getTime() < minimum.getTime() : start.getTime() <= Date.now() + 300000) continue;
      const overlapsBooked = booked.some((appointment) => {
        const bookedStart = new Date(appointment.scheduled_at).getTime();
        const bookedEnd = bookedStart + Math.max(Number(appointment.duration_minutes) || 0, 60) * 60000;
        return start.getTime() < bookedEnd && end.getTime() > bookedStart;
      });
      if (!overlapsBooked) return true;
    }
  }
  return false;
}

function priceForConsultation(priceCents: number, tierType: string | null | undefined, hasPreviousConsultation: boolean | null) {
  const discount = firstConsultationPrice(priceCents, tierType);
  return hasPreviousConsultation === true || discount === null ? priceCents : discount;
}

function sameDayMinimum(immediateSessions: boolean, now = new Date()) {
  if (immediateSessions) return new Date(now.getTime() + 5 * 60 * 1000);
  const rounded = new Date(now);
  rounded.setMinutes(Math.floor(now.getMinutes() / 15) * 15, 0, 0);
  return new Date(rounded.getTime() + 5 * 60 * 60 * 1000);
}

async function notifyBookingConfirmation(appointmentId: string) {
  const { data, error } = await supabase.functions.invoke("appointment-notifications", {
    body: { action: "booking", appointment_id: appointmentId },
  });

  if (error || !data?.ok) {
    console.error("[BookAppointment] booking confirmation email trigger failed:", error ?? data?.error);
  }
}

interface BookAppointmentProps { initialSpecialistId?: string; initialTierId?: string; embedded?: boolean; onClose?: () => void; }

export default function BookAppointment({ initialSpecialistId, initialTierId, embedded = false, onClose }: BookAppointmentProps = {}) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [specialistId, setSpecialistId] = useState(initialSpecialistId ?? params.get("specialist") ?? "");
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [hasPreviousConsultation, setHasPreviousConsultation] = useState<boolean | null>(null);
  const [tierId, setTierId] = useState(initialTierId ?? params.get("tier") ?? "");
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [booked, setBooked] = useState<BookedAppointment[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [scheduledAt, setScheduledAt] = useState("");
  const [credits, setCredits] = useState(0);
  const [useCredits, setUseCredits] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshingBookings, setRefreshingBookings] = useState(false);
  const [bookingStep, setBookingStep] = useState<1 | 2>(1);
  const [accountMode, setAccountMode] = useState<"signup" | "signin">("signup");

  const [acceptPolicies, setAcceptPolicies] = useState(false);
  const submitLock = useRef(false);

  const allowedDays = useMemo(() => bookingDays(), []);
  const allowedSet = useMemo(() => new Set(allowedDays.map((date) => format(date, "yyyy-MM-dd"))), [allowedDays]);
  const availableDateSet = useMemo(() => new Set(
    allowedDays
      .filter((date) => hasAvailableSlotOnDate(date, tier, specialist, availability, booked))
      .map((date) => format(date, "yyyy-MM-dd")),
  ), [allowedDays, tier, specialist, availability, booked]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("specialist_profiles")
        .select("id, display_name, headline, country, country_flag, timezone, avatar_url, immediate_sessions")
        .eq("is_published", true).order("display_name");
      if (error) { toast.error(error.message); return; }
      const availableSpecialists = (data ?? []) as Specialist[];
      setSpecialists(availableSpecialists);
      if (specialistId && !availableSpecialists.some((item) => item.id === specialistId)) {
        setSpecialistId(""); setTierId(""); setScheduledAt("");
        toast.error("That specialist is no longer available.");
      }
    })();
  }, [specialistId]);

  useEffect(() => {
    if (!specialistId) {
      setTiers([]); setAvailability([]); setCredits(0); setUseCredits(false); setBooked([]); return;
    }
    (async () => {
      const [{ data: tierData, error: tierError }, { data: availabilityData, error: availabilityError }, { data: creditData }] =
        await Promise.all([
          supabase.from("specialist_tiers").select("id,label,duration_minutes,price_cents,currency,tier_type").eq("specialist_id", specialistId).eq("is_active", true).eq("currency", "USD").order("price_cents"),
          supabase.from("specialist_availability").select("available_date,day_of_week,start_time,end_time").eq("specialist_id", specialistId).eq("is_active", true),
          user ? supabase.from("customer_specialist_credits").select("credit_points").eq("customer_id", user.id).eq("specialist_id", specialistId).maybeSingle() : Promise.resolve({ data: null } as any),
        ]);
      if (tierError) toast.error(tierError.message);
      if (availabilityError) toast.error(availabilityError.message);
      setTiers(tierData ?? []); setAvailability(availabilityData ?? []);
      const balance = Number((creditData as any)?.credit_points ?? 0);
      setCredits(balance); setUseCredits(balance > 0);
      if (!(tierData ?? []).some((tier: Tier) => tier.id === tierId)) setTierId("");
      setScheduledAt("");
    })();
  }, [specialistId, user]);

  useEffect(() => {
    if (!user) {
      setHasPreviousConsultation(null);
      return;
    }

    let cancelled = false;
    const refreshPaidConsultation = async () => {
      const { data, error } = await supabase.from("appointments")
        .select("id")
        .eq("customer_id", user.id)
        .or("payment_captured_at.not.is.null,razorpay_payment_status.eq.captured,payu_mihpayid.not.is.null")
        .limit(1);
      if (cancelled) return;
      if (error) {
        console.error("[BookAppointment] paid consultation lookup failed:", error);
        setHasPreviousConsultation(true);
      } else {
        setHasPreviousConsultation((data ?? []).length > 0);
      }
    };

    setHasPreviousConsultation(true);
    void refreshPaidConsultation();
    const channel = supabase.channel(`booking-first-consultation-offer-${user.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "appointments",
        filter: `customer_id=eq.${user.id}`,
      }, () => { void refreshPaidConsultation(); })
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (!specialistId) return;

    let cancelled = false;
    const loadBookings = async (showLoader = false) => {
      if (showLoader) setRefreshingBookings(true);
      const { data, error } = await supabase.rpc("get_specialist_booked_slots", {
        p_specialist_id: specialistId,
        p_from: new Date().toISOString(),
      });
      if (!cancelled) {
        if (error) toast.error(error.message);
        setBooked((data ?? []) as BookedAppointment[]);
        setRefreshingBookings(false);
      }
    };

    void loadBookings(true);
    const interval = window.setInterval(() => void loadBookings(), 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [specialistId]);

  const specialist = specialists.find((item) => item.id === specialistId);
  const tier = tiers.find((item) => item.id === tierId);
  const displayedTierPrice = tier ? priceForConsultation(tier.price_cents, tier.tier_type, hasPreviousConsultation) : 0;

  const slotOptions = useMemo<SlotOption[]>(() => {
    if (!selectedDate || !tier || !specialist) return [];

    const viewerTimeZone = getDeviceTimeZone();
    const viewerDateKey = format(selectedDate, "yyyy-MM-dd");
    const todayKey = getZonedDateKey(new Date(), viewerTimeZone);
    const minimum = sameDayMinimum(!!specialist.immediate_sessions);
    const output: SlotOption[] = [];

    for (const range of availability) {
      const rangeStart = timeToMinutes(range.start_time);
      const rawRangeEnd = timeToMinutes(range.end_time);
      const rangeEnd = rawRangeEnd <= rangeStart ? rawRangeEnd + 24 * 60 : rawRangeEnd;

      for (let minutes = rangeStart; minutes + tier.duration_minutes <= rangeEnd; minutes += SLOT_MINUTES) {
        const startDayOffset = Math.floor(minutes / (24 * 60));
        const endMinutes = minutes + tier.duration_minutes;
        const endDayOffset = Math.floor(endMinutes / (24 * 60));
        const startMinuteOfDay = minutes % (24 * 60);
        const endMinuteOfDay = endMinutes % (24 * 60);
        const startDate = new Date(`${range.available_date}T00:00:00Z`);
        startDate.setUTCDate(startDate.getUTCDate() + startDayOffset);
        const endDate = new Date(`${range.available_date}T00:00:00Z`);
        endDate.setUTCDate(endDate.getUTCDate() + endDayOffset);
        const startDateKey = startDate.toISOString().slice(0, 10);
        const endDateKey = endDate.toISOString().slice(0, 10);
        const startTime = `${String(Math.floor(startMinuteOfDay / 60)).padStart(2, "0")}:${String(startMinuteOfDay % 60).padStart(2, "0")}`;
        const endTime = `${String(Math.floor(endMinuteOfDay / 60)).padStart(2, "0")}:${String(endMinuteOfDay % 60).padStart(2, "0")}`;

        const value = zonedTimeToUtc(startDateKey, startTime, specialist.timezone ?? "UTC");
        const endValue = zonedTimeToUtc(endDateKey, endTime, specialist.timezone ?? "UTC");
        const startMs = value.getTime();
        const endMs = endValue.getTime();

        if (getZonedDateKey(value, viewerTimeZone) !== viewerDateKey) continue;
        if (viewerDateKey === todayKey ? startMs < minimum.getTime() : startMs <= Date.now() + 300000) continue;

        const isBooked = booked.some((appointment) => {
          const bookedStart = new Date(appointment.scheduled_at).getTime();
          const bookedEnd = bookedStart + Math.max(Number(appointment.duration_minutes) || 0, 60) * 60000;
          return startMs < bookedEnd && endMs > bookedStart;
        });

        output.push({ value: value.toISOString(), booked: isBooked });
      }
    }

    const unique = new Map<string, SlotOption>();
    output.forEach((slot) => unique.set(slot.value, slot));
    return [...unique.values()].sort((a, b) => a.value.localeCompare(b.value));
  }, [selectedDate, tier, specialist, availability, booked]);

  const availableSlotCount = slotOptions.filter((slot) => !slot.booked).length;

  const loadRazorpay = () => new Promise<boolean>((resolve, reject) => {
    if (window.Razorpay) return resolve(true);
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", () => reject(new Error("Could not load Razorpay Checkout")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error("Could not load Razorpay Checkout"));
    document.body.appendChild(script);
  });

  const openRazorpay = async (appointmentId: string) => {
    await loadRazorpay();
    const { data, error } = await supabase.functions.invoke("razorpay-create-order", {
      body: { appointment_id: appointmentId },
    });
    if (error || !data?.order_id) {
      throw new Error(data?.error ?? error?.message ?? "Payment initialisation failed");
    }

    if (!String(data.key_id).startsWith("rzp_live_")) {
      throw new Error("Razorpay is not using Live Mode. Configure the live Razorpay key in Supabase before accepting payments.");
    }

    const razorpay = new (window.Razorpay!)({
      key: data.key_id,
      amount: data.amount,
      currency: data.currency,
      name: data.name,
      description: data.description,
      order_id: data.order_id,
      checkout_config_id: data.checkout_config_id,
      prefill: data.prefill,
      theme: { color: "#14b8a6" },
      modal: {
        ondismiss: () => {
          setSubmitting(false);
          submitLock.current = false;
        },
      },
      handler: async (response: unknown) => {
        const payment = response as {
          razorpay_payment_id?: string;
          razorpay_order_id?: string;
          razorpay_signature?: string;
        };
        const { data: verified, error: verifyError } = await supabase.functions.invoke("razorpay-verify-payment", {
          body: payment,
        });
        if (verifyError || !verified?.success) {
          toast.error(verified?.error ?? verifyError?.message ?? "Payment was received but could not be verified yet.");
          navigate(`/payment/success?appointment=${encodeURIComponent(appointmentId)}&verification=pending`);
          return;
        }
        navigate(`/payment/success?appointment=${encodeURIComponent(appointmentId)}`);
      },
    });
    razorpay.open();
  };

  const book = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitLock.current) return;
    if (!embedded && bookingStep === 1) {
      if (!specialistId || !tier || !scheduledAt) { toast.error("Choose a specialist, session plan, date, and available time first."); return; }
      setBookingStep(2);
      return;
    }
    if (!specialistId || !tier || !scheduledAt) return;
    if (!user && accountMode === "signup" && (!fullName.trim() || !accountEmail.trim() || accountPassword.length < 8)) { toast.error("Enter your full name, a valid email, and a password of at least 8 characters."); return; }
    if (!user && accountMode === "signin" && (!accountEmail.trim() || !accountPassword)) { toast.error("Enter your email and password to sign in."); return; }
    if (!acceptPolicies) {
      toast.error("Please accept the Terms, Privacy Policy, Trust & Safety Policy, and Cancellation & Refund Policy before booking.");
      return;
    }
    submitLock.current = true;
    setSubmitting(true);

    try {
      let bookingUser = user;
      if (!bookingUser && accountMode === "signin") {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email: accountEmail.trim(), password: accountPassword });
        if (signInError || !signInData.user) throw new Error(signInError?.message ?? "Could not sign in. Please check your details.");
        bookingUser = signInData.user;
      }

      if (!bookingUser && accountMode === "signup") {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: accountEmail.trim(),
          password: accountPassword,
          options: {
            data: {
              full_name: fullName.trim(),
              notifications_opt_in: true,
              policies_accepted: true,
              policies_accepted_at: new Date().toISOString(),
            },
          },
        });
        if (signUpError) {
          if (/already registered|already exists|user already/i.test(signUpError.message)) {
            throw new Error("An account with this email may already exist. Please sign in with that email and password, then return to booking.");
          }
          throw new Error(signUpError.message);
        }
        if (!signUpData.user || !signUpData.session) {
          throw new Error("We could not start your account session. Please try again or sign in if you already have an account.");
        }
        bookingUser = signUpData.user;
      }

      const { data: priorAppointments, error: priorAppointmentsError } = await supabase.from("appointments")
        .select("id")
        .eq("customer_id", bookingUser.id)
        .or("payment_captured_at.not.is.null,razorpay_payment_status.eq.captured,payu_mihpayid.not.is.null")
        .limit(1);
      if (priorAppointmentsError) throw new Error("We couldn't verify first-consultation eligibility. Please try again.");
      const isFirstConsultation = (priorAppointments ?? []).length === 0;
      const discountedPrice = isFirstConsultation ? firstConsultationPrice(tier.price_cents, tier.tier_type) : null;
      const amountToCharge = discountedPrice ?? tier.price_cents;

      if (useCredits && credits >= 2 && bookingUser) {
        const { error } = await supabase.from("customer_specialist_credits").update({ credit_points: credits - 2, updated_at: new Date().toISOString() })
          .eq("customer_id", bookingUser.id).eq("specialist_id", specialistId).gte("credit_points", 2);
        if (error) throw new Error(error.message);

        const { data: creditAppointment, error: appointmentError } = await supabase.from("appointments").insert({
          customer_id: bookingUser.id, specialist_id: specialistId, tier_id: tier.id,
          scheduled_at: scheduledAt, duration_minutes: tier.duration_minutes,
          amount_cents: 0, currency: tier.currency, status: "confirmed",
          customer_name: bookingUser.user_metadata?.full_name ?? bookingUser.email ?? (fullName.trim() || "Customer"), payment_method: "credits",
        }).select("id").single();
        if (appointmentError || !creditAppointment) {
          await supabase.from("customer_specialist_credits").update({ credit_points: credits })
            .eq("customer_id", bookingUser.id).eq("specialist_id", specialistId);
          throw new Error(appointmentError?.message ?? "Could not create the credit booking.");
        }
        await notifyBookingConfirmation(creditAppointment.id);
        toast.success("Session booked using 2 credits");
        navigate("/dashboard/customer/appointments");
        return;
      }

      const { data: appointment, error: appointmentError } = await supabase.from("appointments").insert({
        customer_id: bookingUser.id, specialist_id: specialistId, tier_id: tier.id,
        scheduled_at: scheduledAt, duration_minutes: tier.duration_minutes,
        amount_cents: amountToCharge, currency: tier.currency, status: "pending_payment",
        customer_name: bookingUser.user_metadata?.full_name ?? bookingUser.email ?? (fullName.trim() || "Customer"),
      }).select().single();

      if (appointmentError || !appointment) throw new Error(appointmentError?.message ?? "Could not create appointment");

      const { error: appointmentUpdateError } = await supabase
        .from("appointments")
        .update({ currency: "USD", payment_method: "razorpay" })
        .eq("id", appointment.id);
      if (appointmentUpdateError) throw new Error(appointmentUpdateError.message);

      await openRazorpay(appointment.id);
    } catch (error) {
      setSubmitting(false);
      submitLock.current = false;
      toast.error(error instanceof Error ? error.message : "Could not complete booking");
    }
  };

  const todaySelected = selectedDate && format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

  return <section className={embedded ? "relative bg-gradient-page p-0" : "relative overflow-hidden bg-gradient-page px-4 py-8 sm:py-12 lg:py-16"}>
    <div className={embedded ? "mx-auto grid min-w-0 gap-4" : "container mx-auto grid min-w-0 gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-8"}>
      {!embedded && <div className="min-w-0 space-y-5 lg:sticky lg:top-24 lg:self-start">
        <div className="inline-flex max-w-full items-center gap-2 rounded-full border bg-card/85 px-3 py-2 text-xs font-semibold text-primary shadow-brand"><Sparkles className="h-3.5 w-3.5 shrink-0" />Protected booking & secure checkout</div>
        <div><h1 className="text-3xl font-semibold leading-tight sm:text-5xl lg:text-6xl">Book a specialist session</h1><p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">Choose a specialist, plan, today or one of the next seven days, and an available time.</p></div>
        <div className="grid gap-3 sm:grid-cols-3">{[[ShieldCheck, "Protected", "Auth required"], [CalendarClock, "Today + 5", "workdays"], [CheckCircle2, "Razorpay", "Secure payment"]].map(([Icon, value, label]) => <Card key={String(label)} className="min-w-0 border-white/55 bg-card/85 p-3 shadow-brand sm:p-4"><Icon className="h-5 w-5 text-teal" /><div className="mt-2 text-sm font-semibold">{String(value)}</div><div className="text-xs text-muted-foreground">{String(label)}</div></Card>)}</div>
        {specialist && <Card className="flex min-w-0 items-center gap-3 border-white/60 bg-card/90 p-4 shadow-brand"><div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gradient-brand">{specialist.avatar_url ? <img src={specialist.avatar_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xl font-bold text-white">{specialist.display_name[0]}</div>}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><div className="truncate font-semibold">{specialist.display_name}</div>{specialist.immediate_sessions && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary"><Zap className="h-3 w-3" />Immediate</span>}</div><div className="truncate text-sm text-muted-foreground">{specialist.country_flag} {specialist.country} · {specialist.timezone}</div><div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{specialist.headline}</div></div></Card>}
        {credits > 0 && <Card className="border-teal/30 bg-teal/5 p-4 shadow-brand"><div className="flex items-center gap-2 font-semibold text-teal"><Coins className="h-4 w-4" />{credits} specialist credit{credits === 1 ? "" : "s"} available</div></Card>}
      </div>}

      <Card className={`min-w-0 overflow-hidden rounded-[1.75rem] border-primary/15 bg-card/95 p-0 shadow-brand ${embedded ? "border-0 shadow-none" : "sm:sticky sm:top-24 sm:self-start"}`}>
        <div className="border-b border-primary/10 bg-gradient-to-r from-primary/[0.10] via-accent/20 to-transparent p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Your booking</p><h2 className="mt-1 text-xl font-bold">{embedded || bookingStep === 1 ? "Choose your session" : "Review & checkout"}</h2></div>{!embedded && <span className="rounded-full border border-primary/20 bg-background/80 px-3 py-1.5 text-xs font-semibold text-primary">Step {bookingStep} of 2</span>}</div>{!embedded && <><div className="mt-5 grid grid-cols-2 gap-2"><div className={`h-1.5 rounded-full transition-colors ${bookingStep >= 1 ? "bg-primary" : "bg-muted"}`} /><div className={`h-1.5 rounded-full transition-colors ${bookingStep >= 2 ? "bg-primary" : "bg-muted"}`} /></div><div className="mt-2 flex justify-between text-[11px] font-medium"><span className={bookingStep === 1 ? "text-primary" : "text-muted-foreground"}>Date & time</span><span className={bookingStep === 2 ? "text-primary" : "text-muted-foreground"}>Account & payment</span></div></>}</div>
        <form onSubmit={book} className="min-w-0 space-y-5 p-4 sm:p-6">
          {(embedded || bookingStep === 1) && <>
          <div><Label>Specialist</Label><Select value={specialistId} onValueChange={(value) => { setSpecialistId(value); setBookingStep(1); }}><SelectTrigger className="mt-2 w-full"><SelectValue placeholder="Select a specialist" /></SelectTrigger><SelectContent>{specialists.map((item) => <SelectItem key={item.id} value={item.id}>{item.country_flag} {item.display_name}{item.immediate_sessions ? " · Immediate" : ""}</SelectItem>)}</SelectContent></Select></div>

          {specialistId && <div><Label>Payment method</Label><div className="mt-2 grid gap-2 sm:grid-cols-2">
            <button type="button" disabled={credits < 2} onClick={() => setUseCredits(true)} className={`min-w-0 rounded-2xl border p-3 text-left transition-colors ${useCredits && credits >= 2 ? "border-teal bg-teal/10" : "bg-background hover:bg-accent/40"}`}><Coins className="h-4 w-4 text-teal" /><div className="mt-1 text-sm font-medium">Use credits</div><div className="text-xs text-muted-foreground">{credits} available · 2 required</div></button>
            <button type="button" onClick={() => setUseCredits(false)} className={`min-w-0 rounded-2xl border p-3 text-left transition-colors ${!useCredits || !credits ? "border-primary bg-primary/5" : "bg-background hover:bg-accent/40"}`}><ShieldCheck className="h-4 w-4 text-primary" /><div className="mt-1 text-sm font-medium">Pay via Razorpay</div><div className="text-xs text-muted-foreground">Secure USD payment</div></button>
          </div></div>}

          <div><Label>Session plan</Label><Select value={tierId} onValueChange={setTierId} disabled={!specialistId || !tiers.length}><SelectTrigger className="mt-2 w-full"><SelectValue placeholder={!specialistId ? "Pick a specialist first" : !tiers.length ? "No active plans" : "Select a plan"} /></SelectTrigger><SelectContent>{tiers.map((item) => <SelectItem key={item.id} value={item.id}>{item.label} · {item.currency} {(priceForConsultation(item.price_cents, item.tier_type, hasPreviousConsultation) / 100).toFixed(2)} / {item.duration_minutes} min</SelectItem>)}</SelectContent></Select></div>

          <div className="overflow-hidden rounded-3xl border bg-gradient-soft p-3 sm:p-4"><div className="mb-3 rounded-xl border bg-accent/40 px-3 py-2 text-xs leading-5 text-muted-foreground"><span className="font-semibold text-foreground">Timezone notice:</span> your device timezone ({getTimeZoneLabel(getDeviceTimeZone())}) is being used. Booking times are converted from the specialist&#39;s timezone.</div><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2 font-semibold"><CalendarClock className="h-4 w-4 text-teal" />Choose your date</div><span className="text-[11px] text-muted-foreground">Today + 7 days</span></div><DayPicker mode="single" selected={selectedDate} onSelect={(date) => { try { setSelectedDate(date); setScheduledAt(""); } catch (error) { console.error("[BookAppointment] date selection failed:", error); toast.error("Could not select that date. Please try again."); } }} disabled={(date) => !allowedSet.has(format(date, "yyyy-MM-dd")) || !availableDateSet.has(format(date, "yyyy-MM-dd"))} startMonth={allowedDays[0]} endMonth={allowedDays[allowedDays.length - 1]} showOutsideDays={false} className="booking-calendar mx-auto" /></div>

          <div><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><Label>Available time</Label>{specialist?.timezone && <span className="text-xs text-muted-foreground">Your device timezone: {getTimeZoneLabel(getDeviceTimeZone())}</span>}</div>
            {todaySelected && specialist && <p className="mb-3 rounded-xl bg-accent/45 px-3 py-2 text-xs leading-5 text-muted-foreground">{specialist.immediate_sessions ? <><span className="font-semibold text-foreground">Immediate Sessions are enabled.</span> Same-day booking can start 5 minutes after the current time.</> : <>For today, booking opens <span className="font-semibold text-foreground">5 hours after the current time</span>, rounded down to the nearest 15 minutes.</>}</p>}
            {selectedDate && tier && <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-primary" />Available</span><span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/50" />Booked</span>{refreshingBookings && <span>Refreshing live availability…</span>}</div>}
            {!selectedDate || !tier ? <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">Select a plan and date to see available times.</div> : !slotOptions.length ? <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">No slots are available for this date.</div> : <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">{slotOptions.map((slot) => <button key={slot.value} type="button" disabled={slot.booked} onClick={() => !slot.booked && setScheduledAt(slot.value)} aria-label={slot.booked ? `Booked at ${formatInTimeZone(slot.value, getDeviceTimeZone(), { hour: "numeric", minute: "2-digit" })}` : `Book at ${formatInTimeZone(slot.value, getDeviceTimeZone(), { hour: "numeric", minute: "2-digit" })}`} className={`rounded-2xl border px-3 py-2.5 text-sm font-medium transition-colors ${slot.booked ? "cursor-not-allowed border-muted bg-muted/60 text-muted-foreground line-through opacity-80" : scheduledAt === slot.value ? "border-teal bg-teal/10" : "bg-background hover:border-teal/50"}`}><Clock3 className="mr-1 inline h-3.5 w-3.5" />{formatInTimeZone(slot.value, getDeviceTimeZone(), { hour: "numeric", minute: "2-digit" })}{slot.booked && <span className="ml-1 text-[10px] font-semibold no-underline">Booked</span>}</button>)}</div>}
            {selectedDate && tier && slotOptions.length > 0 && availableSlotCount === 0 && <p className="mt-3 rounded-xl border border-dashed p-3 text-xs text-muted-foreground">All session times in this availability window are currently booked. Please choose another date.</p>}
          </div>

          {scheduledAt && <div className="rounded-2xl border bg-background p-4 text-sm"><div className="font-semibold">Selected appointment</div><div className="mt-1 break-words text-muted-foreground">{formatInTimeZone(scheduledAt, getDeviceTimeZone(), { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} · {tier?.duration_minutes} minutes</div></div>}
          {tier && <div className="rounded-2xl border bg-accent/40 p-4 text-sm">
            <div className="flex flex-wrap justify-between gap-2"><span className="text-muted-foreground">Session total</span><span className="font-semibold">{useCredits && credits >= 2 ? "2 credits" : "$" + (displayedTierPrice / 100).toFixed(2)}</span></div>
            {!useCredits && displayedTierPrice < tier.price_cents && <><div className="mt-2 flex flex-wrap justify-between gap-2 text-xs"><span className="text-muted-foreground">Regular price</span><span className="text-muted-foreground line-through">${(tier.price_cents / 100).toFixed(2)}</span></div><p className="mt-2 text-xs leading-5 text-primary">First consultation offer only. Your regular per-session price applies from your next booking.</p></>}
          </div>}
          </>}

          {(embedded || bookingStep === 2) && <div className="space-y-4">
            <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.08] via-background to-accent/20 p-4 sm:p-5"><div className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className="h-4 w-4 text-primary" />Booking summary</div><div className="mt-4 flex items-start gap-3">{specialist?.avatar_url ? <img src={specialist.avatar_url} alt="" className="h-14 w-14 rounded-2xl object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-lg font-bold text-primary">{specialist?.display_name?.[0] ?? "B"}</div>}<div className="min-w-0 flex-1"><div className="font-semibold">{specialist?.display_name ?? "Your specialist"}</div><div className="mt-1 text-sm text-muted-foreground">{tier?.label} · {tier?.duration_minutes} minutes</div><div className="mt-2 text-sm text-muted-foreground">{scheduledAt ? formatInTimeZone(scheduledAt, getDeviceTimeZone(), { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Choose a time"}</div></div></div><div className="mt-4 flex items-center justify-between border-t pt-4"><span className="text-sm text-muted-foreground">{useCredits && credits >= 2 ? "Credit payment" : "Total due"}</span><span className="text-2xl font-bold tracking-tight">{useCredits && credits >= 2 ? "2 credits" : "$" + (tier ? (priceForConsultation(tier.price_cents, tier.tier_type, hasPreviousConsultation) / 100).toFixed(2) : "0.00")}</span></div>
            {!useCredits && tier && priceForConsultation(tier.price_cents, tier.tier_type, hasPreviousConsultation) < tier.price_cents && <><div className="mt-2 flex justify-between text-xs"><span className="text-muted-foreground">Regular price</span><span className="text-muted-foreground line-through">${(tier.price_cents / 100).toFixed(2)}</span></div><p className="mt-2 text-xs leading-5 text-primary">Discounted for your first consultation only.</p></>}<p className="mt-2 text-xs leading-5 text-muted-foreground">Your appointment is confirmed after successful payment verification. Your time is shown in {getTimeZoneLabel(getDeviceTimeZone())}.</p></div>
          {!user && <div className="space-y-4 rounded-2xl border border-primary/15 bg-background p-4">
            <div><h2 className="font-semibold">{accountMode === "signup" ? "Create your BreatheRise account" : "Welcome back"}</h2><p className="mt-1 text-sm text-muted-foreground">{accountMode === "signup" ? "Create an account to keep your bookings and care journey together." : "Sign in to continue to secure checkout."}</p></div>
            <div className="grid grid-cols-2 rounded-xl bg-muted/60 p-1"><button type="button" onClick={() => setAccountMode("signup")} className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${accountMode === "signup" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>Create account</button><button type="button" onClick={() => setAccountMode("signin")} className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${accountMode === "signin" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>Sign in</button></div>
            {accountMode === "signup" && <div><Label htmlFor="booking-full-name">Full name</Label><Input id="booking-full-name" autoComplete="name" required value={fullName} onChange={(event) => setFullName(event.target.value)} className="mt-2" /></div>}
            <div>
              <Label htmlFor="booking-email">Email</Label>
              <Input id="booking-email" type="email" autoComplete="email" required value={accountEmail} onChange={(event) => setAccountEmail(event.target.value)} className="mt-2" />
            </div>
            <div>
              <Label htmlFor="booking-password">Password</Label>
              <Input id="booking-password" type="password" autoComplete="new-password" minLength={accountMode === "signup" ? 8 : undefined} required value={accountPassword} onChange={(event) => setAccountPassword(event.target.value)} className="mt-2" />
              {accountMode === "signup" && <p className="mt-1 text-xs text-muted-foreground">At least 8 characters.</p>}
            </div>
          </div>}
          </div>}

          {(embedded || bookingStep === 2) && <label className="flex items-start gap-3 rounded-2xl border bg-background p-4 text-sm"><Checkbox checked={acceptPolicies} onCheckedChange={(value) => setAcceptPolicies(!!value)} className="mt-0.5 shrink-0" /><span className="leading-6 text-muted-foreground">I have read and agree to the <Link to="/terms" target="_blank" className="font-medium text-foreground underline underline-offset-4">Terms & Conditions</Link>, <Link to="/privacy" target="_blank" className="font-medium text-foreground underline underline-offset-4">Privacy Policy</Link>, <Link to="/trust" target="_blank" className="font-medium text-foreground underline underline-offset-4">Trust & Safety Policy</Link>, and <Link to="/cancellation" target="_blank" className="font-medium text-foreground underline underline-offset-4">Cancellation & Refund Policy</Link>.</span></label>}

          <div className="flex flex-col-reverse gap-2 sm:flex-row">{!embedded && bookingStep === 2 && <Button type="button" variant="outline" onClick={() => setBookingStep(1)} disabled={submitting} className="sm:w-auto">Back to times</Button>}{(embedded || bookingStep === 1) && <Button type="button" variant="outline" onClick={() => embedded ? onClose?.() : navigate(-1)} disabled={submitting} className="sm:w-auto">Cancel</Button>}<Button type="submit" disabled={submitting || (embedded ? (!specialistId || !tierId || !scheduledAt || !acceptPolicies || (!user && (!accountEmail.trim() || !accountPassword || (accountMode === "signup" && !fullName.trim())))) : bookingStep === 1 ? (!specialistId || !tierId || !scheduledAt) : (!acceptPolicies || (!user && (!accountEmail.trim() || !accountPassword || (accountMode === "signup" && !fullName.trim())))))} className="min-w-0 flex-1 rounded-full bg-gradient-brand text-primary-foreground shadow-brand">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : embedded ? (useCredits && credits >= 2 ? <><Zap className="mr-2 h-4 w-4" />Book with 2 credits</> : "Pay $" + (tier ? (priceForConsultation(tier.price_cents, tier.tier_type, hasPreviousConsultation) / 100).toFixed(2) : "0.00")) : bookingStep === 1 ? "Continue to review" : useCredits && credits >= 2 ? <><Zap className="mr-2 h-4 w-4" />Book with 2 credits</> : "Pay $" + (tier ? (priceForConsultation(tier.price_cents, tier.tier_type, hasPreviousConsultation) / 100).toFixed(2) : "0.00")}</Button></div>
        </form>
        {!embedded && bookingStep === 2 && !user && <p className="px-5 pb-5 text-center text-xs leading-5 text-muted-foreground">Your account details stay secure. Payment is processed by Razorpay.</p>}
      </Card>
    </div>
  </section>;
}
