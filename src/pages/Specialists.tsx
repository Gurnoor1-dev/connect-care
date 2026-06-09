import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, MapPin, UserRound, Wifi, WifiOff } from "lucide-react";

interface SpecialistRow {
  id: string;
  display_name: string;
  headline: string | null;
  country: string | null;
  country_flag: string | null;
  specialities: string[] | null;
  qualifications: string[] | null;
  timezone: string | null;
  avatar_url: string | null;
  availability_status: "online" | "offline" | null;
}

export default function Specialists() {
  const [items, setItems] = useState<SpecialistRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("specialist_profiles")
        .select("id, display_name, headline, country, country_flag, specialities, qualifications, timezone, avatar_url, availability_status")
        .eq("is_published", true)
        .order("availability_status", { ascending: false })
        .order("created_at", { ascending: false });
      setItems(data ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <section className="bg-gradient-page px-4 py-14 sm:py-16">
      <div className="container mx-auto">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-lg border bg-card/85 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-brand backdrop-blur">
            <Wifi className="h-3.5 w-3.5 text-teal" /> Live availability is shown on each profile
          </div>
          <h1 className="mt-5 text-4xl font-bold sm:text-5xl">Meet our specialists</h1>
          <p className="mt-4 text-muted-foreground">
            Browse vetted coaches and clinicians, then book from the public flow once you are signed in.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {loading && Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-lg bg-card/70 shadow-brand" />
          ))}
          {!loading && items.length === 0 && (
            <Card className="col-span-full border-white/55 bg-card/90 p-10 text-center text-muted-foreground shadow-brand backdrop-blur">
              No specialists are published yet. Check back soon.
            </Card>
          )}
          {items.map((specialist) => <SpecialistCard key={specialist.id} specialist={specialist} />)}
        </div>
      </div>
    </section>
  );
}

function SpecialistCard({ specialist }: { specialist: SpecialistRow }) {
  const isOnline = specialist.availability_status === "online";

  return (
    <Card className="group overflow-hidden border-white/55 bg-card/90 p-0 shadow-brand backdrop-blur transition-all hover:-translate-y-1 hover:shadow-glow">
      <div className="bg-gradient-to-br from-accent/70 via-card to-card p-5">
        <div className="flex items-start gap-4">
          <div className="relative h-20 w-20 shrink-0 overflow-visible rounded-lg bg-gradient-vivid p-0.5 shadow-brand">
            <div className="h-full w-full overflow-hidden rounded-md bg-card">
              {specialist.avatar_url ? (
                <img src={specialist.avatar_url} alt={specialist.display_name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-brand text-2xl font-bold text-primary-foreground">
                  {specialist.display_name?.[0] ?? <UserRound className="h-7 w-7" />}
                </div>
              )}
            </div>
            {isOnline && <OnlineDot />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="min-w-0 flex-1 truncate text-lg font-semibold">{specialist.display_name}</h3>
              <Badge variant={isOnline ? "default" : "secondary"} className="gap-1 capitalize">
                {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                {specialist.availability_status ?? "offline"}
              </Badge>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span>{specialist.country_flag} {specialist.country || "Global"}</span>
            </div>
          </div>
        </div>

        {specialist.headline && <p className="mt-4 text-sm text-muted-foreground">{specialist.headline}</p>}
      </div>

      <div className="space-y-4 p-5">
        {specialist.specialities && specialist.specialities.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {specialist.specialities.slice(0, 4).map((speciality) => (
              <Badge key={speciality} variant="secondary">{speciality}</Badge>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>{specialist.timezone ?? "Timezone pending"}</span>
          <span>{specialist.qualifications?.length ?? 0} qualifications</span>
        </div>
        <Button asChild size="sm" className="w-full bg-gradient-brand text-primary-foreground shadow-brand">
          <Link to={`/book?specialist=${specialist.id}`}>Book a session <ArrowRight className="ml-2 h-4 w-4" /></Link>
        </Button>
      </div>
    </Card>
  );
}

function OnlineDot() {
  return (
    <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-emerald-500 shadow-glow">
      <span className="absolute h-3.5 w-3.5 animate-ping rounded-full bg-emerald-300 opacity-70" />
      <span className="relative h-3 w-3 rounded-full bg-emerald-300" />
    </span>
  );
}
