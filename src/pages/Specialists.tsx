import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  ArrowRight, MapPin, UserRound, Wifi, WifiOff, 
  GraduationCap, Briefcase, Calendar, Globe, AlertCircle 
} from "lucide-react";

interface Tier {
  id: string;
  label: string;
  duration_minutes: number;
  price_cents: number;
  currency: string;
  is_active: boolean;
}

interface SpecialistRow {
  id: string;
  display_name: string;
  headline: string | null;
  bio: string | null;
  country: string | null;
  country_flag: string | null;
  specialities: string[] | null;
  qualifications: string[] | null;
  timezone: string | null;
  avatar_url: string | null;
  availability_status: "online" | "offline" | null;
  specialist_tiers: Tier[];
}

export default function Specialists() {
  const [items, setItems] = useState<SpecialistRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // 1. Fetch profiles and embed tiers cleanly without forcing a strict INNER JOIN filter
      const { data, error } = await supabase
        .from("specialist_profiles")
        .select(`
          id, display_name, headline, bio, country, country_flag, 
          specialities, qualifications, timezone, avatar_url, availability_status,
          specialist_tiers(id, label, duration_minutes, price_cents, currency, is_active)
        `)
        .eq("is_published", true)
        .order("availability_status", { ascending: false });

      if (error) {
        console.error("Error fetching specialists:", error.message);
        setLoading(false);
        return;
      }

      // 2. Safely cast data and filter out inactive tiers programmatically 
      const formattedData = ((data as unknown as SpecialistRow[]) ?? []).map(specialist => ({
        ...specialist,
        specialist_tiers: (specialist.specialist_tiers ?? []).filter(tier => tier.is_active)
      }));

      setItems(formattedData);
      setLoading(false);
    })();
  }, []);

  return (
    <section className="bg-gradient-page min-h-screen px-4 py-14 sm:py-16">
      <div className="container mx-auto">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-lg border bg-card/85 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-brand backdrop-blur">
            <Wifi className="h-3.5 w-3.5 text-emerald-500" /> Live availability updates instantly
          </div>
          <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">Meet our world-class specialists</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Browse fully vetted coaches and clinicians, view their rates across tiers, and instantly book live sessions.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {loading && Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[500px] animate-pulse rounded-xl bg-card/70 shadow-brand" />
          ))}
          
          {!loading && items.length === 0 && (
            <Card className="col-span-full border-white/10 bg-card/90 p-12 text-center text-muted-foreground shadow-brand backdrop-blur-md">
              <UserRound className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium">No specialists are available right now.</p>
              <p className="text-sm">Make sure profiles are marked "Publish Profile" in their configuration panels.</p>
            </Card>
          )}
          
          {!loading && items.map((specialist) => (
            <SpecialistCard key={specialist.id} specialist={specialist} />
          ))}
        </div>
      </div>
    </section>
  );
}

function SpecialistCard({ specialist }: { specialist: SpecialistRow }) {
  const isOnline = specialist.availability_status === "online";
  const tiers = specialist.specialist_tiers ?? [];

  return (
    <Card className="group flex flex-col overflow-hidden border-white/20 bg-card/80 shadow-brand backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:shadow-glow">
      
      {/* Top Profile Banner */}
      <div className="border-b border-white/10 bg-gradient-to-br from-accent/40 via-card/50 to-card/90 p-6">
        <div className="flex items-start gap-4">
          <div className="relative h-20 w-20 shrink-0 overflow-visible rounded-xl bg-gradient-vivid p-0.5 shadow-brand">
            <div className="h-full w-full overflow-hidden rounded-lg bg-card">
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
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="truncate text-xl font-bold tracking-tight text-foreground">{specialist.display_name || "Anonymous Specialist"}</h3>
            </div>
            
            {specialist.headline && (
              <p className="mt-1 text-sm font-medium text-emerald-400/90 line-clamp-1">{specialist.headline}</p>
            )}
            
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span>{specialist.country_flag} {specialist.country || "Global"}</span>
              </div>
              <div className="flex items-center gap-1">
                <Globe className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate max-w-[120px]">{specialist.timezone || "UTC"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Details Body */}
      <div className="flex flex-1 flex-col space-y-5 p-6">
        
        {/* Full Bio */}
        {specialist.bio && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">About Specialist</h4>
            <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-muted-foreground/90">
              {specialist.bio}
            </p>
          </div>
        )}

        {/* Specialities */}
        {specialist.specialities && specialist.specialities.length > 0 && (
          <div>
            <h4 className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Briefcase className="h-3 w-3" /> Specialities
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {specialist.specialities.map((speciality) => (
                <Badge key={speciality} variant="outline" className="border-emerald-500/20 bg-emerald-500/5 text-emerald-400">
                  {speciality}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Qualifications */}
        {specialist.qualifications && specialist.qualifications.length > 0 && (
          <div>
            <h4 className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <GraduationCap className="h-3.5 w-3.5" /> Qualifications
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {specialist.qualifications.map((qualification) => (
                <Badge key={qualification} variant="secondary" className="bg-muted text-foreground/90 border border-white/5">
                  {qualification}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Tier Pricing Section */}
        <div className="mt-auto pt-2">
          <h4 className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" /> Available Session Tiers
          </h4>
          {tiers.length > 0 ? (
            <div className="grid gap-2">
              {tiers.map((tier) => (
                <div 
                  key={tier.id} 
                  className="flex items-center justify-between rounded-lg border border-white/5 bg-background/50 p-2.5 text-xs shadow-sm transition-colors hover:bg-background/80"
                >
                  <div className="font-medium text-foreground">{tier.label}</div>
                  <div className="text-right text-muted-foreground">
                    <span className="font-bold text-foreground">
                      {tier.currency} {(tier.price_cents / 100).toFixed(2)}
                    </span>
                    {` / ${tier.duration_minutes} min`}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-white/10 p-3 text-center text-xs text-muted-foreground">
              No active consultation tiers available.
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Action Footer */}
      <div className="border-t border-white/10 bg-accent/20 p-5">
        {isOnline ? (
          <Button asChild size="default" className="w-full bg-gradient-brand font-semibold text-primary-foreground shadow-brand transition-transform active:scale-95">
            <Link to={`/book?specialist=${specialist.id}`}>
              Book a session now <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div className="flex-1 text-xs leading-normal">
              <span className="font-semibold block text-amber-300">Specialist Offline</span>
              Reservations are locked until this specialist returns active online.
            </div>
          </div>
        )}
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
