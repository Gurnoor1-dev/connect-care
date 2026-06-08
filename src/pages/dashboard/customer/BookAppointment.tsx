import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Tier { id: string; label: string; duration_minutes: number; price_cents: number; currency: string; }
interface Specialist { id: string; display_name: string; country: string | null; country_flag: string | null; timezone: string | null; }

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
    if (!specialistId) { setTiers([]); return; }
    (async () => {
      const { data } = await supabase
        .from("specialist_tiers")
        .select("id, label, duration_minutes, price_cents, currency")
        .eq("specialist_id", specialistId)
        .eq("is_active", true)
        .order("price_cents", { ascending: true });
      setTiers(data ?? []);
    })();
  }, [specialistId]);

  const onBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !specialistId || !tierId || !scheduledAt) return;
    setSubmitting(true);
    const tier = tiers.find((t) => t.id === tierId)!;
    const { data: appt, error } = await supabase
      .from("appointments")
      .insert({
        customer_id: user.id,
        specialist_id: specialistId,
        tier_id: tierId,
        scheduled_at: new Date(scheduledAt).toISOString(),
        duration_minutes: tier.duration_minutes,
        amount_cents: tier.price_cents,
        currency: tier.currency,
        status: "pending_payment",
      })
      .select()
      .single();
    if (error || !appt) {
      setSubmitting(false);
      return toast.error(error?.message ?? "Could not create appointment");
    }
    // Initiate PayU hosted checkout
    const { data: payu, error: payuErr } = await supabase.functions.invoke("payu-initiate", {
      body: { appointment_id: appt.id },
    });
    setSubmitting(false);
    if (payuErr || !payu?.formHtml) return toast.error(payuErr?.message ?? "Payment init failed");
    // Render a self-submitting form to PayU
    const div = document.createElement("div");
    div.innerHTML = payu.formHtml;
    document.body.appendChild(div);
    (div.querySelector("form") as HTMLFormElement)?.submit();
  };

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
              <SelectTrigger className="mt-2"><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {specialists.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.country_flag} {s.display_name} {s.timezone ? `· ${s.timezone}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tier</Label>
            <Select value={tierId} onValueChange={setTierId} disabled={!specialistId}>
              <SelectTrigger className="mt-2"><SelectValue placeholder={specialistId ? "Select tier" : "Pick specialist first"} /></SelectTrigger>
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
            <Label htmlFor="when">Date & time</Label>
            <Input id="when" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} required className="mt-2" />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
            <Button type="submit" disabled={submitting || !specialistId || !tierId || !scheduledAt} className="flex-1 bg-gradient-brand text-primary-foreground">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Continue to payment
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
