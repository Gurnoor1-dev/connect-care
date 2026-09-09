import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Coins, Loader2 } from "lucide-react";

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const apptId = params.get("appointment") ?? params.get("udf1") ?? "";
  const { user } = useAuth();
  const [creditsGranted, setCreditsGranted] = useState(0);
  const [specialistName, setSpecialistName] = useState("");
  const [loading, setLoading] = useState(!!apptId);
  const processed = useRef(false);

  useEffect(() => {
    if (!apptId || !user || processed.current) return;
    processed.current = true;

    (async () => {
      /* 1. Fetch appointment + tier details */
      const { data: appt, error } = await supabase
        .from("appointments")
        .select(
          `
          id, status, specialist_id, tier_id,
          specialist:specialist_profiles!appointments_specialist_id_fkey(display_name),
          tier:specialist_tiers!appointments_tier_id_fkey(tier_type, session_count, credit_points)
        `,
        )
        .eq("id", apptId)
        .maybeSingle();

      if (error || !appt) {
        setLoading(false);
        return;
      }

      const tierData = (appt as any).tier;
      const specData = (appt as any).specialist;
      setSpecialistName(specData?.display_name ?? "your specialist");

      /* 2. Grant credits only for bundle tiers & only if not already done */
      const isBundle = tierData?.tier_type === "bundle";
      const creditPoints = Number(tierData?.credit_points ?? 0);

      if (isBundle && creditPoints > 0 && appt.status === "confirmed") {
        // Upsert: add new credits to any existing ones for this specialist
        const { data: existing } = await supabase
          .from("customer_specialist_credits")
          .select("credit_points, id")
          .eq("customer_id", user.id)
          .eq("specialist_id", appt.specialist_id)
          .maybeSingle();

        const currentCredits = Number((existing as any)?.credit_points ?? 0);
        const newTotal = currentCredits + creditPoints;

        if ((existing as any)?.id) {
          await supabase
            .from("customer_specialist_credits")
            .update({ credit_points: newTotal, updated_at: new Date().toISOString() })
            .eq("id", (existing as any).id);
        } else {
          await supabase.from("customer_specialist_credits").insert({
            customer_id: user.id,
            specialist_id: appt.specialist_id,
            credit_points: newTotal,
          });
        }

        setCreditsGranted(creditPoints);
      }

      setLoading(false);
    })();
  }, [apptId, user]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-page p-6 text-center">
      {/* Success icon */}
      <div className="rounded-full bg-teal/15 p-5">
        <CheckCircle2 className="h-12 w-12 text-teal" />
      </div>

      <h1 className="text-3xl font-bold">Payment successful</h1>
      <p className="max-w-md text-muted-foreground">
        Your booking is confirmed. You'll get a reminder before your session.
      </p>

      {/* Credits granted card — shown for bundle purchases */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking your booking…
        </div>
      ) : creditsGranted > 0 ? (
        <Card className="w-full max-w-sm border-teal/30 bg-teal/5 p-5 text-left shadow-brand backdrop-blur">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal/15">
              <Coins className="h-5 w-5 text-teal" />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                {creditsGranted} credit{creditsGranted !== 1 ? "s" : ""} added to your account!
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                You can now book {creditsGranted} more session
                {creditsGranted !== 1 ? "s" : ""} with{" "}
                <span className="font-medium text-foreground">{specialistName}</span> at no
                additional charge — no PayU required.
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild className="bg-gradient-brand text-primary-foreground shadow-brand">
          <Link to="/dashboard/customer/appointments">View appointments</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/book">Book another session</Link>
        </Button>
      </div>
    </div>
  );
}
