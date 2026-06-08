/**
 * /payment/bridge
 *
 * This page receives PayU signed params as query-string and auto-submits
 * them to PayU's hosted checkout endpoint.  It exists because we can't POST
 * from a server — the form must be submitted by the browser so PayU can set
 * cookies and redirect properly.
 *
 * The user sees a brief "Redirecting to payment…" screen, then PayU takes over.
 */
import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

// Fields PayU expects in the POST body
const PAYU_FIELDS = [
  "key", "txnid", "amount", "productinfo", "firstname", "email",
  "phone", "surl", "furl", "hash", "service_provider",
  "udf1", "udf2", "udf3", "udf4", "udf5",
  "currency", "pg", "bankcode",
];

export default function PaymentBridge() {
  const [searchParams] = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);

  const payuBase = searchParams.get("_payu_base") ?? "https://test.payu.in";
  const action   = `${payuBase}/_payment`;

  useEffect(() => {
    // Auto-submit once the form is mounted
    const timer = setTimeout(() => {
      formRef.current?.submit();
    }, 300); // small delay so the user sees the loading screen
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Redirecting to secure payment…</p>

      {/* Hidden form — auto-submitted by the useEffect above */}
      <form ref={formRef} method="POST" action={action} className="hidden">
        {PAYU_FIELDS.map((field) => {
          const value = searchParams.get(field);
          if (!value) return null;
          return <input key={field} type="hidden" name={field} value={value} />;
        })}
      </form>
    </div>
  );
}
