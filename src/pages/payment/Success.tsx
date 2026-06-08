import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const appt = params.get("appointment");
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="rounded-full bg-teal/15 p-5"><CheckCircle2 className="h-12 w-12 text-teal" /></div>
      <h1 className="mt-6 text-3xl font-bold">Payment successful</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        Your booking is confirmed. You'll get a reminder before your session.
      </p>
      <Button asChild className="mt-8 bg-gradient-brand text-primary-foreground">
        <Link to={appt ? "/dashboard/customer/appointments" : "/dashboard/customer"}>Go to dashboard</Link>
      </Button>
    </div>
  );
}
