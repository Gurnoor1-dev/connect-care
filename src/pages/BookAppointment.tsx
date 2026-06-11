import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  CalendarClock, CheckCircle2, Coins, Loader2, ShieldCheck,
  Sparkles, Zap,
} from "lucide-react";

interface Tier {
  id: string;
  label: string;
  duration_minutes: number;
  price_cents: number;
  currency: string;
}
interface Specialist {
  id: string;
  display_name: string;
  headline: string | null;
  country: string | null;
  country_flag: string | null;
  timezone: string | null;
  avatar_url: string | null;
  availability_status: "online" | "offline" | null;
}

export default function BookAppointment() {
  const [params] = useSearchParams();
  const preselect = params.get("specialist") ?? "";
  const navigate = useNavigate();
  const { user } = useAuth();

  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [specialistId, setSpecialistId] = useState(preselect);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [tierId, setTierId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Credits the customer holds for the currently selected specialist
  const [availableCredits, setAvailableCredits] = useState(0);
  const [useCredits, setUseCredits] = useState(false);

  /* ── Load specialists ── */
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("specialist_profiles")
        .select(
          "id, display_name, headline, country, country_flag, timezone, avatar_url, availability_status",
        )
        .eq("is_published", true)
        .order("availability_status", { ascending: false })
        .order("display_name", { ascending: true });
      if (error) toast.error(error.message);
      setSpecialists(data ?? []);
    })();
  }, []);

  /* ── Load tiers when specialist changes ── */
  useEffect(() => {
    if (!specialistId) {
      setTiers([]);
      setTierId("");
      setAvailableCredits(0);
      setUseCredits(false);
      return;
    }
    (async () => {
      const [tiersRes, creditsRes] = await Promise.all([
        supabase
          .from("specialist_tiers")
          .select("id, label, duration_minutes, price_cents, currency")
          .eq("specialist_id", specialistId)
          .eq("is_active", true)
          .order("price_cents", { ascending: true }),
        user
          ? supabase
              .from("customer_specialist_credits")
              .select("credit_points")
              .eq("customer_id", user.id)
              .eq("specialist_id", specialistId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      if (tiersRes.error) toast.error(tiersRes.error.message);
      setTiers(tiersRes.data ?? []);
      setTierId("");

      const credits = Number((creditsRes as any).data?.credit_points ?? 0);
      setAvailableCredits(credits);
      // Auto-enable credits toggle if user has any
      setUseCredits(credits > 0);
    })();
  }, [specialistId, user]);

  const selectedSpecialist = specialists.find((s) => s.id === specialistId);
  const selectedTier = tiers.find((t) => t.id === tierId);
  const minDateTime = useMemo(
    () => new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16),
    [],
  );

  /* ── Helpers ── */
  const submitPayuForm = (formHtml: string) => {
    const container = document.createElement("div");
    container.innerHTML = formHtml;
    const form = container.querySelector<HTMLFormElement>("form");
    if (!form) throw new Error("PayU form was not returned by the server");
    form.style.display = "none";
    document.body.appendChild(form);
    form.submit();
  };

  /* ── Book with credits (no PayU) ── */
  const bookWithCredits = async () => {
    if (!user || !specialistId || !selectedTier || !scheduledAt) return;
    setSubmitting(true);

    // 1. Deduct 1 credit from the customer_specialist_credits row
    const newCredits = availableCredits - 1;
    const { error: deductErr } = await supabase
      .from("customer_specialist_credits")
      .update({ credit_points: newCredits, updated_at: new Date().toISOString() })
      .eq("customer_id", user.id)
      .eq("specialist_id", specialistId);

    if (deductErr) {
      setSubmitting(false);
      toast.error(deductErr.message);
      return;
    }

    // 2. Create the appointment as confirmed (no payment needed)
    const { error: apptErr } = await supabase
      .from("appointments")
      .insert({
        customer_id: user.id,
        specialist_id: specialistId,
        tier_id: selectedTier.id,
        scheduled_at: new Date(scheduledAt).toISOString(),
        duration_minutes: selectedTier.duration_minutes,
        amount_cents: 0,           // paid via credits
        currency: selectedTier.currency,
        status: "confirmed",       // skip payment flow
        customer_name:
          user.user_metadata?.full_name ?? user.email ?? "Customer",
        payment_method: "credits",
      });

    setSubmitting(false);

    if (apptErr) {
      // Roll back the credit deduction
      await supabase
        .from("customer_specialist_credits")
        .update({ credit_points: availableCredits })
        .eq("customer_id", user.id)
        .eq("specialist_id", specialistId);
      toast.error(apptErr.message);
      return;
    }

    setAvailableCredits(newCredits);
    toast.success("Session booked using 1 credit!");
    navigate("/dashboard/customer/appointments");
  };

  /* ── Book via PayU ── */
  const bookWithPayment = async () => {
    if (!user || !specialistId || !selectedTier || !scheduledAt) return;
    setSubmitting(true);

    const { data: appt, error: apptErr } = await supabase
      .from("appointments")
      .insert({
        customer_id: user.id,
        specialist_id: specialistId,
        tier_id: selectedTier.id,
        scheduled_at: new Date(scheduledAt).toISOString(),
        duration_minutes: selectedTier.duration_minutes,
        amount_cents: selectedTier.price_cents,
        currency: selectedTier.currency,
        status: "pending_payment",
        customer_name:
          user.user_metadata?.full_name ?? user.email ?? "Customer",
      })
      .select()
      .single();

    if (apptErr || !appt) {
      setSubmitting(false);
      toast.error(apptErr?.message ?? "Could not create appointment");
      return;
    }

    const { data: payu, error: payuErr } = await supabase.functions.invoke(
      "payu-initiate",
      { body: { appointment_id: appt.id } },
    );

    if (payuErr || (!payu?.formHtml && !payu?.redirect_url)) {
      setSubmitting(false);
      toast.error(
        payu?.error ??
          payuErr?.message ??
          "Payment initialisation failed. Please try again.",
      );
      return;
    }

    try {
      if (payu.formHtml) submitPayuForm(payu.formHtml as string);
      else window.location.href = payu.redirect_url as string;
    } catch (error) {
      setSubmitting(false);
      toast.error(
        error instanceof Error ? error.message : "Could not open PayU checkout",
      );
    }
  };

  const onBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (useCredits && availableCredits > 0) bookWithCredits();
    else bookWithPayment();
  };

  const canUseCredits = availableCredits > 0 && !!specialistId;

  return (
    <section className="relative overflow-hidden bg-gradient-page px-4 py-10 sm:py-14 lg:py-16">
      <div className="container mx-auto grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        {/* ── Left column ── */}
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-lg border bg-card/85 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-brand backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-teal" /> Public booking, protected checkout
          </div>
          <div>
            <h1 className="max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">
              Book a specialist session
            </h1>
            <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
              Choose the right specialist, pick a session tier, and complete payment
              securely — or redeem your credits instantly.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: ShieldCheck, label: "Auth required", value: "Protected" },
              { icon: CalendarClock, label: "Live sessions", value: "Daily video" },
              { icon: CheckCircle2, label: "PayU return", value: "Verified" },
            ].map((item) => (
              <Card
                key={item.label}
                className="border-white/55 bg-card/85 p-4 shadow-brand backdrop-blur"
              >
                <item.icon className="h-5 w-5 text-teal" />
                <div className="mt-3 text-sm font-semibold">{item.value}</div>
                <div className="text-xs text-muted-foreground">{item.label}</div>
              </Card>
            ))}
          </div>

          {selectedSpecialist && (
            <SpecialistPreview specialist={selectedSpecialist} />
          )}

          {/* Credits info panel — shown when specialist is selected */}
          {specialistId && (
            <CreditsPanel
              credits={availableCredits}
              specialistName={selectedSpecialist?.display_name ?? "this specialist"}
            />
          )}
        </div>

        {/* ── Form card ── */}
        <Card className="border-white/60 bg-card/90 p-5 shadow-glow backdrop-blur sm:p-6">
          <form onSubmit={onBook} className="space-y-5">
            {/* Specialist */}
            <div>
              <Label>Specialist</Label>
              <Select value={specialistId} onValueChange={setSpecialistId}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select a specialist" />
                </SelectTrigger>
                <SelectContent>
                  {specialists.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.country_flag} {s.display_name}
                      {s.availability_status === "online" ? " · Online" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment method toggle — only visible when credits available */}
            {canUseCredits && (
              <PaymentMethodToggle
                useCredits={useCredits}
                credits={availableCredits}
                onChange={setUseCredits}
              />
            )}

            {/* Session tier — hidden when using credits (tier is fixed to single) */}
            {(!useCredits || !canUseCredits) && (
              <div>
                <Label>Session tier</Label>
                <Select
                  value={tierId}
                  onValueChange={setTierId}
                  disabled={!specialistId || tiers.length === 0}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue
                      placeholder={
                        !specialistId
                          ? "Pick a specialist first"
                          : tiers.length === 0
                          ? "No active tiers for this specialist"
                          : "Select a tier"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {tiers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.label} · {t.currency}{" "}
                        {(t.price_cents / 100).toFixed(2)} / {t.duration_minutes} min
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* When using credits, show a tier selector limited to single-session tiers */}
            {useCredits && canUseCredits && (
              <div>
                <Label>Session tier</Label>
                <Select
                  value={tierId}
                  onValueChange={setTierId}
                  disabled={tiers.length === 0}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue
                      placeholder={
                        tiers.length === 0
                          ? "No active tiers for this specialist"
                          : "Select a tier"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {tiers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.label} · {t.duration_minutes} min
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  1 credit will be deducted from your balance ({availableCredits} remaining).
                </p>
              </div>
            )}

            {/* Date & time */}
            <div>
              <Label htmlFor="when">Date and time</Label>
              <Input
                id="when"
                type="datetime-local"
                value={scheduledAt}
                min={minDateTime}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
                className="mt-2"
              />
            </div>

            {/* Summary */}
            {selectedTier && (
              <div className="space-y-2 rounded-lg border bg-gradient-to-br from-accent/55 via-card to-card p-4 text-sm">
                <div className="flex justify-between gap-3 text-muted-foreground">
                  <span>Session</span>
                  <span className="text-right text-foreground">{selectedTier.label}</span>
                </div>
                <div className="flex justify-between gap-3 text-muted-foreground">
                  <span>Duration</span>
                  <span className="text-foreground">{selectedTier.duration_minutes} minutes</span>
                </div>
                <div className="flex justify-between gap-3 border-t border-border pt-2 font-semibold">
                  <span>Total</span>
                  {useCredits && canUseCredits ? (
                    <span className="flex items-center gap-1.5 text-teal">
                      <Coins className="h-4 w-4" /> 1 credit
                    </span>
                  ) : (
                    <span>
                      {selectedTier.currency}{" "}
                      {(selectedTier.price_cents / 100).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-1 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  submitting ||
                  !specialistId ||
                  !tierId ||
                  !scheduledAt ||
                  (useCredits && availableCredits < 1)
                }
                className="flex-1 bg-gradient-brand text-primary-foreground shadow-brand"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {useCredits && canUseCredits ? "Booking…" : "Opening PayU"}
                  </>
                ) : useCredits && canUseCredits ? (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Book with 1 credit
                  </>
                ) : (
                  "Continue to payment"
                )}
              </Button>
            </div>
          </form>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            New here?{" "}
            <Link
              to="/signup"
              className="text-foreground underline-offset-4 hover:underline"
            >
              Create an account
            </Link>{" "}
            before booking.
          </p>
        </Card>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────── */
/*  Sub-components                              */
/* ──────────────────────────────────────────── */

function PaymentMethodToggle({
  useCredits,
  credits,
  onChange,
}: {
  useCredits: boolean;
  credits: number;
  onChange: (v: boolean) => void;
}) {
  return (
    <div>
      <Label>Payment method</Label>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {/* Use credits */}
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-all ${
            useCredits
              ? "border-teal/60 bg-teal/8 ring-1 ring-teal/30"
              : "border-white/15 bg-muted/30 hover:border-white/25"
          }`}
        >
          <div className="flex items-center gap-2">
            <Coins
              className={`h-4 w-4 ${useCredits ? "text-teal" : "text-muted-foreground"}`}
            />
            <span className="text-sm font-medium">Use credits</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {credits} credit{credits !== 1 ? "s" : ""} available
          </span>
        </button>

        {/* Pay via PayU */}
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-all ${
            !useCredits
              ? "border-primary/60 bg-primary/8 ring-1 ring-primary/30"
              : "border-white/15 bg-muted/30 hover:border-white/25"
          }`}
        >
          <div className="flex items-center gap-2">
            <ShieldCheck
              className={`h-4 w-4 ${!useCredits ? "text-primary" : "text-muted-foreground"}`}
            />
            <span className="text-sm font-medium">Pay via PayU</span>
          </div>
          <span className="text-xs text-muted-foreground">Secure online payment</span>
        </button>
      </div>
    </div>
  );
}

function CreditsPanel({
  credits,
  specialistName,
}: {
  credits: number;
  specialistName: string;
}) {
  if (credits === 0) return null;

  return (
    <Card className="border-teal/30 bg-teal/5 p-4 shadow-brand backdrop-blur">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal/15">
          <Coins className="h-4.5 w-4.5 text-teal" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            You have {credits} credit{credits !== 1 ? "s" : ""} with {specialistName}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Each credit books one session at no extra charge. Credits are exclusive to
            this specialist.
          </p>
        </div>
      </div>
    </Card>
  );
}

function SpecialistPreview({ specialist }: { specialist: Specialist }) {
  const isOnline = specialist.availability_status === "online";
  return (
    <Card className="flex items-center gap-4 border-white/60 bg-card/90 p-4 shadow-brand backdrop-blur">
      <div className="relative h-16 w-16 shrink-0 overflow-visible rounded-lg bg-gradient-brand p-0.5 shadow-brand">
        <div className="h-full w-full overflow-hidden rounded-md bg-card">
          {specialist.avatar_url ? (
            <img
              src={specialist.avatar_url}
              alt={specialist.display_name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-vivid text-xl font-bold text-primary-foreground">
              {specialist.display_name?.[0] ?? "S"}
            </div>
          )}
        </div>
        {isOnline && <OnlineDot />}
      </div>
      <div className="min-w-0">
        <div className="font-semibold">{specialist.display_name}</div>
        <div className="text-sm text-muted-foreground">
          {specialist.country_flag} {specialist.country} · {specialist.timezone}
        </div>
        {specialist.headline && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {specialist.headline}
          </p>
        )}
      </div>
    </Card>
  );
}

function OnlineDot() {
  return (
    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-emerald-500 shadow-[0_0_0_4px_color-mix(in_oklab,var(--teal)_22%,transparent)]">
      <span className="absolute h-3 w-3 animate-ping rounded-full bg-emerald-400 opacity-70" />
      <span className="relative h-2.5 w-2.5 rounded-full bg-emerald-300" />
    </span>
  );
}
