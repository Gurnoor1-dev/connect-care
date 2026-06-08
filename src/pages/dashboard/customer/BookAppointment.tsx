import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
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
import { Loader2 } from "lucide-react";

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
  country: string | null;
  country_flag: string | null;
  timezone: string | null;
}

/** Extract a human-readable message from a supabase.functions.invoke error or response body */
function extractPayuError(error: unknown, data: unknown): string {
  // error object from the SDK (non-2xx response)
  if (error && typeof error === "object" && "message" in error) {
    const msg = String((error as { message: string }).message);
    if (msg.includes("non-2xx")) {
      // Try to get the body's error field
      if (
        data &&
        typeof data === "object" &&
        "error" in data &&
        typeof (data as Record<string, unknown>).error === "string"
      ) {
        return (data as Record<string, string>).error;
      }
      return "Payment service error — check that PayU secrets are configured on the server.";
    }
    return msg;
  }
  // 2xx response but body has { error: "..." }
  if (
    data &&
    typeof data === "object" &&
    "error" in data &&
    typeof (data as Record<string, unknown>).error === "string"
  ) {
    return (data as Record<string, string>).error;
  }
  return "Payment initialisation failed. Please try again.";
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

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("specialist_profiles")
        .select("id, display_name, country, country_flag, timezone")
        .eq("is_published", true);
      setSpecialists(data ?? []);
    })();
  }, []);

  useEffect(() => {
    if (!specialistId) { setTiers([]); setTierId(""); return; }
    (async () => {
      const { data } = await supabase
        .from("specialist_tiers")
        .select("id, label, duration_minutes, price_cents, currency")
        .eq("specialist_id", specialistId)
        .eq("is_active", true)
        .order("price_cents", { ascending: true });
      setTiers(data ?? []);
      setTierId("");
    })();
  }, [specialistId]);

  const selectedTier = tiers.find((t) => t.id === tierId);

  const onBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !specialistId || !tierId || !scheduledAt) return;
    setSubmitting(true);

    // 1. Create appointment row
    const { data: appt, error: apptErr } = await supabase
      .from("appointments")
      .insert({
        customer_id: user.id,
        specialist_id: specialistId,
        tier_id: tierId,
        scheduled_at: new Date(scheduledAt).toISOString(),
        duration_minutes: selectedTier!.duration_minutes,
        amount_cents: selectedTier!.price_cents,
        currency: selectedTier!.currency,
        status: "pending_payment",
      })
      .select()
      .single();

    if (apptErr || !appt) {
      setSubmitting(false);
      toast.error(apptErr?.message ?? "Could not create appointment");
      return;
    }

    // 2. Call payu-initiate edge function
    const { data: payu, error: payuErr } = await supabase.functions.invoke("payu-initiate", {
      body: { appointment_id: appt.id },
    });

    // Check both SDK error (non-2xx) and body-level error (2xx with { error: "..." })
    const hasError = !!payuErr || !payu?.formHtml || !!payu?.error;

    if (hasError) {
      setSubmitting(false);
      toast.error(extractPayuError(payuErr, payu));
      // Clean up the orphaned pending_payment row
      await supabase.from("appointments").delete().eq("id", appt.id);
      return;
    }

    // 3. Inject form and submit to PayU
    try {
      const tmp = document.createElement("div");
      tmp.style.cssText = "display:none;position:absolute;left:-9999px;";
      tmp.innerHTML = payu.formHtml as string;
      document.body.appendChild(tmp);

      const form = tmp.querySelector("form") as HTMLFormElement | null;
      if (!form) throw new Error("PayU form HTML was empty or malformed");

      // Move form to body before submit (avoids CSP issues with nested containers)
      document.body.appendChild(form);
      tmp.remove();
      form.submit();
      // Page navigates away — keep spinner showing
    } catch (err: unknown) {
      setSubmitting(false);
      toast.error(err instanceof Error ? err.message : "Could not redirect to payment page");
      await supabase.from("appointments").delete().eq("id", appt.id);
    }
  };

  const minDateTime = new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Book a session</h1>
        <p className="mt-1 text-muted-foreground">Choose your specialist, tier and time.</p>
      </header>

      <Card className="p-6">
        <form onSubmit={onBook} className="space-y-5">
          <div>
            <Label>Specialist</Label>
            <Select value={specialistId} onValueChange={setSpecialistId}>
              <SelectTrigger className="mt-2"><SelectValue placeholder="Select a specialist…" /></SelectTrigger>
              <SelectContent>
                {specialists.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.country_flag} {s.display_name}{s.timezone ? ` · ${s.timezone}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Session tier</Label>
            <Select
              value={tierId}
              onValueChange={setTierId}
              disabled={!specialistId || tiers.length === 0}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder={
                  !specialistId ? "Pick a specialist first"
                  : tiers.length === 0 ? "No active tiers for this specialist"
                  : "Select a tier…"
                } />
              </SelectTrigger>
              <SelectContent>
                {tiers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.label} — {t.currency} {(t.price_cents / 100).toFixed(2)} / {t.duration_minutes} min
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="when">Date &amp; time</Label>
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

          {selectedTier && (
            <div className="rounded-lg border bg-muted/40 p-4 text-sm space-y-1.5">
              <div className="flex justify-between text-muted-foreground">
                <span>Session</span><span className="text-foreground">{selectedTier.label}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Duration</span><span className="text-foreground">{selectedTier.duration_minutes} minutes</span>
              </div>
              <div className="flex justify-between font-semibold border-t border-border pt-1.5 mt-0.5">
                <span>Total</span>
                <span>{selectedTier.currency} {(selectedTier.price_cents / 100).toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !specialistId || !tierId || !scheduledAt}
              className="flex-1 bg-gradient-brand text-primary-foreground"
            >
              {submitting
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Redirecting to payment…</>
                : "Continue to payment"
              }
            </Button>
          </div>
        </form>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        You'll be redirected to PayU's secure checkout. BreatheRise never stores card details.
      </p>
    </div>
  );
}
