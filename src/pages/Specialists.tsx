import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceTimeZone, getTimeZoneLabel, formatInTimeZone, zonedTimeToUtc, getZonedDateKey, getZonedDayOfWeek } from "@/lib/timezone";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import {
  ArrowRight, MapPin, UserRound, Wifi,
  GraduationCap, Briefcase, Globe, Check, Star,
  Zap, Clock
} from "lucide-react";

interface Tier {
  id: string;
  label: string;
  duration_minutes: number;
  price_cents: number;
  currency: string;
  is_active: boolean;
  tier_type?: string;
  session_count?: number;
  savings_label?: string;
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
  specialist_availability?: { day_of_week: number; start_time: string; end_time: string; is_active: boolean }[];
}

// Colour accent per specialty tag
const SPECIALTY_COLORS: Record<string, string> = {
  anxiety: "bg-violet-500/15 text-violet-400 border-violet-500/25",
  sleep: "bg-indigo-500/15 text-indigo-400 border-indigo-500/25",
  leadership: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  relationships: "bg-rose-500/15 text-rose-400 border-rose-500/25",
  burnout: "bg-sky-500/15 text-sky-400 border-sky-500/25",
  mindfulness: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  stress: "bg-violet-500/15 text-violet-400 border-violet-500/25",
  default: "bg-teal/15 text-teal border-teal/25",
};

function specialtyColor(s: string) {
  const key = Object.keys(SPECIALTY_COLORS).find((k) => s.toLowerCase().includes(k));
  return SPECIALTY_COLORS[key ?? "default"];
}

// Sort tiers: single first, then bundles ascending by price
function sortTiers(tiers: Tier[]) {
  return [...tiers].sort((a, b) => {
    if ((a.tier_type ?? "single") === "single" && (b.tier_type ?? "single") !== "single") return -1;
    if ((a.tier_type ?? "single") !== "single" && (b.tier_type ?? "single") === "single") return 1;
    return a.price_cents - b.price_cents;
  });
}

export default function Specialists() {
  const [items, setItems] = useState<SpecialistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "online">("all");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("specialist_profiles")
        .select(`
          id, display_name, headline, bio, country, country_flag,
          specialities, qualifications, timezone, avatar_url, availability_status,
          specialist_tiers!specialist_tiers_specialist_id_fkey(id, label, duration_minutes, price_cents, currency, is_active, tier_type, session_count, savings_label), specialist_availability(day_of_week, start_time, end_time, is_active)
        `)
        .eq("is_published", true)
        .order("availability_status", { ascending: false });

      if (error) {
        const fallback = await supabase
          .from("specialist_profiles")
          .select(`
            id, display_name, headline, bio, country, country_flag,
            specialities, qualifications, timezone, avatar_url, availability_status,
            specialist_tiers!specialist_id(id, label, duration_minutes, price_cents, currency, is_active, tier_type, session_count, savings_label), specialist_availability(day_of_week, start_time, end_time, is_active)
          `)
          .eq("is_published", true);
        if (!fallback.error && fallback.data) {
          setItems(
            (fallback.data as unknown as SpecialistRow[]).map((s) => ({
              ...s,
              specialist_tiers: (s.specialist_tiers ?? []).filter((t) => t.is_active),
            }))
          );
        }
        setLoading(false);
        return;
      }

      setItems(
        (data as unknown as SpecialistRow[]).map((s) => ({
          ...s,
          specialist_tiers: (s.specialist_tiers ?? []).filter((t) => t.is_active),
        }))
      );
      setLoading(false);
    })();
  }, []);

  const visible = filter === "online" ? items.filter((s) => s.availability_status === "online") : items;
  const onlineCount = items.filter((s) => s.availability_status === "online").length;

  return (
    <section className="min-h-screen bg-gradient-page px-4 py-14 sm:py-16">
      <div className="container mx-auto">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-medium text-emerald-400">
            <Wifi className="h-3.5 w-3.5" />
            {onlineCount} specialist{onlineCount !== 1 ? "s" : ""} live now
          </div>
          <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
            Meet our world-class specialists
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Each specialist is vetted, credentialled, and ready. Browse tiers and book a session in seconds.
          </p>
        </div>

        {/* Filter pills */}
        <div className="mt-8 flex justify-center gap-2">
          {(["all", "online"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
                filter === f
                  ? "border-primary bg-primary text-primary-foreground shadow-brand"
                  : "border-white/15 bg-card/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? `All specialists (${items.length})` : `Online now (${onlineCount})`}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="mt-10 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {loading &&
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[580px] animate-pulse rounded-2xl bg-card/70 shadow-brand" />
            ))}

          {!loading && visible.length === 0 && (
            <Card className="col-span-full border-white/10 bg-card/90 p-12 text-center text-muted-foreground shadow-brand backdrop-blur-md">
              <UserRound className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium">No specialists available right now.</p>
            </Card>
          )}

          {!loading && visible.map((specialist) => (
            <SpecialistCard key={specialist.id} specialist={specialist} />
          ))}
        </div>
      </div>
    </section>
  );
}

function SpecialistCard({ specialist }: { specialist: SpecialistRow }) {
  const isOnline = specialist.availability_status === "online";
  const tiers = sortTiers(specialist.specialist_tiers ?? []);
  const singleTier = tiers.find((t) => (t.tier_type ?? "single") === "single");
  const bundleTiers = tiers.filter((t) => t.tier_type === "bundle");
  const [activeTier, setActiveTier] = useState<string>(tiers[0]?.id ?? "");
  const [showSpecialities, setShowSpecialities] = useState(false);
  const [showBio, setShowBio] = useState(false);

  const selectedTier = tiers.find((t) => t.id === activeTier) ?? tiers[0];

  return (
    <Card className="group flex flex-col overflow-hidden border-white/15 bg-card/85 shadow-brand backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-glow">
      {/* ── HEADER BAND ── */}
      <div className="relative border-b border-white/10 p-5">
        {/* Online/offline pill */}
        <div className={`absolute right-4 top-4 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
          isOnline ? "bg-emerald-500/15 text-emerald-400" : "bg-muted text-muted-foreground"
        }`}>
          <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? "bg-emerald-400" : "bg-muted-foreground"} ${isOnline ? "animate-pulse" : ""}`} />
          {isOnline ? "Live now" : "Offline"}
        </div>

        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative h-16 w-16 shrink-0 rounded-xl overflow-hidden ring-2 ring-white/10">
            {specialist.avatar_url ? (
              <img src={specialist.avatar_url} alt={specialist.display_name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-brand text-2xl font-bold text-white">
                {specialist.display_name?.[0] ?? <UserRound className="h-7 w-7" />}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 pr-16">
            <h3 className="truncate text-lg font-bold">{specialist.display_name}</h3>
            {specialist.headline && (
              <p className="mt-0.5 truncate text-sm text-teal">{specialist.headline}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {specialist.country && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {specialist.country_flag} {specialist.country}
                </span>
              )}
              {specialist.timezone && (
                <span className="flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  {specialist.timezone}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-xl border bg-accent/30 p-3 text-xs leading-5 text-muted-foreground"><span className="font-semibold text-foreground">Timezone notice:</span> availability is shown in your device timezone ({getTimeZoneLabel(getDeviceTimeZone())}).</div>
        <AvailabilityPreview specialist={specialist} />

        {/* Specialities */}
        {specialist.specialities && specialist.specialities.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {specialist.specialities.slice(0, 4).map((s) => (
              <span
                key={s}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${specialtyColor(s)}`}
              >
                {s}
              </span>
            ))}
            {specialist.specialities.length > 4 && (
              <button type="button" onClick={() => setShowSpecialities(true)} className="cursor-pointer rounded-full border border-white/10 px-2.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" aria-label={`View ${specialist.specialities.length - 4} more specialties`}>+{specialist.specialities.length - 4} more</button>
            )}
          </div>
        )}
      </div>

      {/* ── BIO ── */}
      {specialist.bio && (
        <div className="border-b border-white/10 px-5 py-4"><button type="button" onClick={() => setShowBio(true)} className="w-full cursor-pointer rounded-md text-left focus:outline-none focus:ring-2 focus:ring-primary/40" aria-label={`Read full bio for ${specialist.display_name}`}><p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{specialist.bio}{specialist.bio.length > 180 ? "..." : ""}</p></button></div>
      )}

      <Dialog open={showSpecialities} onOpenChange={setShowSpecialities}><DialogContent className="max-h-[80vh] overflow-y-auto"><DialogHeader><DialogTitle>{specialist.display_name}&apos;s specialties</DialogTitle></DialogHeader><div className="flex flex-wrap gap-2">{(specialist.specialities ?? []).map((s) => <span key={s} className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${specialtyColor(s)}`}>{s}</span>)}</div></DialogContent></Dialog>
      <Dialog open={showBio} onOpenChange={setShowBio}><DialogContent className="max-h-[80vh] overflow-y-auto"><DialogHeader><DialogTitle>About {specialist.display_name}</DialogTitle></DialogHeader><p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{specialist.bio}</p></DialogContent></Dialog>

      {/* ── QUALIFICATIONS ── */}
      {specialist.qualifications && specialist.qualifications.length > 0 && (
        <div className="border-b border-white/10 px-5 py-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <GraduationCap className="h-3.5 w-3.5" /> Qualifications
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {specialist.qualifications.slice(0, 3).map((q) => (
              <span key={q} className="rounded-md border border-white/10 bg-muted/60 px-2 py-0.5 text-xs text-foreground/80">
                {q}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── PRICING TIERS ── */}
      <div className="flex-1 px-5 py-4">
        <div className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Briefcase className="h-3.5 w-3.5" /> Session tiers
        </div>

        {tiers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-muted-foreground">
            No active tiers yet.
          </div>
        ) : (
          <div className="space-y-2">
            {/* Single session */}
            {singleTier && (
              <TierPill
                tier={singleTier}
                selected={activeTier === singleTier.id}
                onSelect={() => setActiveTier(singleTier.id)}
                badge={null}
              />
            )}

            {/* Bundle tiers */}
            {bundleTiers.map((t, i) => (
              <TierPill
                key={t.id}
                tier={t}
                selected={activeTier === t.id}
                onSelect={() => setActiveTier(t.id)}
                badge={t.savings_label ?? (i === 0 ? "SAVE 12%" : i === 1 ? "SAVE 20%" : null)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── CTA FOOTER ── */}
      <div className="border-t border-white/10 bg-gradient-to-b from-transparent to-accent/10 p-4">
        {isOnline ? (
          <Button
            asChild
            className="w-full bg-gradient-brand font-semibold text-primary-foreground shadow-brand transition-transform active:scale-95"
          >
            <Link to={`/book?specialist=${specialist.id}${selectedTier ? `&tier=${selectedTier.id}` : ""}`}>
              <Zap className="mr-2 h-4 w-4" />
              Book now
              {selectedTier && (
                <span className="ml-auto pl-2 font-bold">
                  {selectedTier.currency} {(selectedTier.price_cents / 100).toFixed(0)}
                </span>
              )}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-muted/40 p-3">
            <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Currently offline — check back shortly or browse other specialists.
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}

function AvailabilityPreview({ specialist }: { specialist: SpecialistRow }) {
  const rows = (specialist.specialist_availability ?? []).filter((r) => r.is_active);
  if (!rows.length) return null;
  const tz = specialist.timezone ?? "UTC";
  const viewerTz = getDeviceTimeZone();
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const now = new Date();
  const entries: string[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(now.getTime() + i * 86400000);
    const day = getZonedDayOfWeek(date, tz);
    const key = getZonedDateKey(date, tz);
    const ranges = rows.filter((r) => r.day_of_week === day).map((r) => {
      const start = zonedTimeToUtc(key, r.start_time, tz);
      const end = zonedTimeToUtc(key, r.end_time, tz);
      if (end <= start) return null;
      return formatInTimeZone(start, viewerTz, { hour: "numeric", minute: "2-digit" }) + "–" + formatInTimeZone(end, viewerTz, { hour: "numeric", minute: "2-digit" });
    }).filter(Boolean) as string[];
    if (ranges.length) entries.push(names[day] + ": " + ranges.join(", "));
  }
  if (!entries.length) return null;
  return <div className="mt-3 rounded-xl border bg-background p-3"><div className="text-xs font-semibold">Weekly availability</div><div className="mt-2 grid grid-cols-2 gap-1.5 text-xs sm:grid-cols-3">{entries.map((entry) => <div key={entry} className="text-muted-foreground">{entry}</div>)}</div></div>;
}

function TierPill({
  tier,
  selected,
  onSelect,
  badge,
}: {
  tier: Tier;
  selected: boolean;
  onSelect: () => void;
  badge: string | null;
}) {
  const isBundle = tier.tier_type === "bundle";

  return (
    <button
      onClick={onSelect}
      className={`group/tier w-full rounded-xl border p-3 text-left transition-all ${
        selected
          ? "border-primary/60 bg-primary/8 ring-1 ring-primary/30"
          : "border-white/10 bg-muted/30 hover:border-white/20 hover:bg-muted/50"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
            selected ? "border-primary bg-primary" : "border-white/20"
          }`}>
            {selected && <Check className="h-2.5 w-2.5 text-white" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate">{tier.label}</span>
              {badge && (
                <span className="shrink-0 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
                  {badge}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              {tier.duration_minutes} min
              {isBundle && tier.session_count && tier.session_count > 1 && (
                <>
                  <span className="text-white/20">·</span>
                  <Star className="h-3 w-3 text-amber-400" />
                  {tier.session_count} sessions
                </>
              )}
            </div>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-base font-bold">
            {tier.currency} {(tier.price_cents / 100).toFixed(0)}
          </div>
          {isBundle && tier.session_count && tier.session_count > 1 && (
            <div className="text-[10px] text-muted-foreground">
              {tier.currency} {(tier.price_cents / tier.session_count / 100).toFixed(0)}/session
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
