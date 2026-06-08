import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface SpecialistRow {
  id: string;
  display_name: string;
  headline: string | null;
  country: string | null;
  country_flag: string | null;
  specialities: string[] | null;
  qualifications: string[] | null;
  timezone: string | null;
}

export default function Specialists() {
  const [items, setItems] = useState<SpecialistRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("specialist_profiles")
        .select("id, display_name, headline, country, country_flag, specialities, qualifications, timezone")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      setItems(data ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <section className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold md:text-5xl">Meet our specialists</h1>
        <p className="mt-4 text-muted-foreground">
          A curated network of vetted coaches and clinicians.
        </p>
      </div>
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {loading && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-48 animate-pulse rounded-2xl bg-muted" />
        ))}
        {!loading && items.length === 0 && (
          <Card className="col-span-full p-10 text-center text-muted-foreground">
            No specialists are published yet. Check back soon.
          </Card>
        )}
        {items.map((s) => (
          <Card key={s.id} className="group overflow-hidden p-6 transition-all hover:shadow-brand">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-brand text-lg font-bold text-primary-foreground">
                {s.display_name?.[0] ?? "S"}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold">{s.display_name}</h3>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {s.country_flag} {s.country} · {s.timezone}
                </div>
              </div>
            </div>
            {s.headline && <p className="mt-4 text-sm text-muted-foreground">{s.headline}</p>}
            {s.specialities && s.specialities.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {s.specialities.slice(0, 3).map((sp) => (
                  <Badge key={sp} variant="secondary">{sp}</Badge>
                ))}
              </div>
            )}
            <Button asChild size="sm" className="mt-5 w-full bg-gradient-brand text-primary-foreground">
              <Link to={`/dashboard/customer/book?specialist=${s.id}`}>Book a session</Link>
            </Button>
          </Card>
        ))}
      </div>
    </section>
  );
}
