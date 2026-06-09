import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Sparkles } from "lucide-react";

export default function SpecialistTiers() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card className="overflow-hidden border-white/55 bg-card/90 shadow-glow backdrop-blur">
        <div className="bg-gradient-vivid p-6 text-primary-foreground">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/20">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-3xl font-bold">Pricing is admin-managed</h1>
          <p className="mt-2 max-w-lg text-sm text-primary-foreground/85">
            Your session durations, prices, currencies, and active tiers are now controlled from the admin panel.
          </p>
        </div>
        <div className="space-y-4 p-6">
          <div className="flex items-start gap-3 rounded-lg border bg-accent/55 p-4 text-sm text-muted-foreground">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
            <p>
              Keep your specialist profile polished and published. Customers can still book any active tier an admin has assigned to you.
            </p>
          </div>
          <Button asChild className="bg-gradient-brand text-primary-foreground shadow-brand">
            <Link to="/dashboard/specialist/profile">Update profile</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
