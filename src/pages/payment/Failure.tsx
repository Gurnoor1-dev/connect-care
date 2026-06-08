import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

export default function PaymentFailure() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="rounded-full bg-destructive/15 p-5"><XCircle className="h-12 w-12 text-destructive" /></div>
      <h1 className="mt-6 text-3xl font-bold">Payment didn't go through</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        No charge was made. You can try again from your dashboard.
      </p>
      <Button asChild className="mt-8 bg-gradient-brand text-primary-foreground">
        <Link to="/dashboard/customer/book">Try again</Link>
      </Button>
    </div>
  );
}
