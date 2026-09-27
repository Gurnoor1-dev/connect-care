import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Coins, Loader2 } from "lucide-react";

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const apptId = params.get("appointment") ?? "";
  const { user } = useAuth();
  const [status, setStatus] = useState<"checking" | "confirmed" | "pending" | "failed">("checking");
  const [creditsGranted, setCreditsGranted] = useState(0);
  const [specialistName, setSpecialistName] = useState("");
  const [paymentAmount, setPaymentAmount] = useState<number | null>(null);
  const [settlementAmount, setSettlementAmount] = useState<number | null>(null);
  const conversionSent = useRef(false);

  useEffect(() => {
    if (!apptId || !user) return;

    let cancelled = false;
    let attempts = 0;

    const check = async () => {
      const { data: appt, error } = await supabase
        .from("appointments")
        .select(`
          id, status, specialist_id, tier_id, amount_cents, currency,
          razorpay_payment_id, razorpay_payment_status,
          razorpay_base_amount, razorpay_base_currency,
          specialist:specialist_profiles!appointments_specialist_id_fkey(display_name),
          tier:specialist_tiers!appointments_tier_id_fkey(tier_type, session_count, credit_points)
        `)
        .eq("id", apptId)
        .maybeSingle();

      if (cancelled) return;
      if (error || !appt) {
        setStatus("failed");
        return;
      }

      const specData = (appt as any).specialist;
      const tierData = (appt as any).tier;
      setSpecialistName(specData?.display_name ?? "your specialist");
      setPaymentAmount(Number((appt as any).amount_cents ?? 0) / 100);
      setSettlementAmount(
        (appt as any).razorpay_base_amount != null
          ? Number((appt as any).razorpay_base_amount) / 100
          : null,
      );

      if (appt.status === "confirmed") {
        setStatus("confirmed");
        if (!conversionSent.current) {
          const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
          if (gtag && Number((appt as any).amount_cents ?? 0) > 0) {
            gtag("event", "conversion", {
              send_to: "AW-18464359511/wdQoCNLTlP8cENeIv-RE",
              value: Number((appt as any).amount_cents) / 100,
              currency: (appt as any).currency ?? "USD",
              transaction_id: appt.id,
            });
          }
          conversionSent.current = true;
        }

        if (tierData?.tier_type === "bundle") {
          const points = Math.max(Number(tierData.credit_points ?? 0), Number(tierData.session_count ?? 1) * 2);
          setCreditsGranted(Math.max(0, points - 2));
        }
        return;
      }

      if (appt.status === "cancelled" || appt.status === "failed") {
        setStatus("failed");
        return;
      }

      setStatus("pending");
      attempts += 1;
      if (attempts < 10) window.setTimeout(check, 1500);
    };

    check();
    return () => {
      cancelled = true;
    };
  }, [apptId, user]);

  const isPending = status === "checking" || status === "pending";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-page p-6 text-center">
      <div className="rounded-full bg-teal/15 p-5">
        {isPending
          ? <Loader2 className="h-12 w-12 animate-spin text-teal" />
          : <CheckCircle2 className="h-12 w-12 text-teal" />}
      </div>

      <h1 className="text-3xl font-bold">
        {status === "confirmed" ? "Payment successful" : status === "failed" ? "Payment could not be confirmed" : "Confirming your payment"}
      </h1>

      <p className="max-w-md text-muted-foreground">
        {status === "confirmed"
          ? "Your booking is confirmed. You'll get a reminder before your session."
          : status === "failed"
            ? "Please return to booking and try again if your payment was not completed."
            : "Razorpay has returned the payment result. We are securely confirming it with our server."}
      </p>

      {status === "confirmed" && paymentAmount != null && (
        <Card className="w-full max-w-sm p-5 text-left">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Paid</span>
            <span className="font-semibold text-foreground">USD {paymentAmount.toFixed(2)}</span>
          </div>
          {settlementAmount != null && (
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-muted-foreground">Razorpay INR settlement value</span>
              <span className="font-semibold text-foreground">INR {settlementAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="mt-3 border-t pt-3 text-xs text-muted-foreground">
            Your customer payment is processed in USD. Razorpay calculates the INR settlement conversion at the payment/settlement stage.
          </div>
        </Card>
      )}

      {status === "confirmed" && creditsGranted > 0 && (
        <Card className="w-full max-w-sm border-teal/30 bg-teal/5 p-5 text-left shadow-brand backdrop-blur">
          <div className="flex items-start gap-3">
            <Coins className="mt-0.5 h-5 w-5 shrink-0 text-teal" />
            <div>
              <p className="font-semibold text-foreground">{creditsGranted} credit{creditsGranted !== 1 ? "s" : ""} added</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your remaining bundle sessions with <span className="font-medium text-foreground">{specialistName}</span> are now available.
              </p>
            </div>
          </div>
        </Card>
      )}

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
