import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getDeviceTimeZone, getTimeZoneLabel, formatInTimeZone, zonedTimeToUtc, getZonedDateKey, getZonedDayOfWeek } from "@/lib/timezone";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import BookAppointment from "@/pages/BookAppointment";
import {
  ArrowRight, MapPin, UserRound,
  GraduationCap, Briefcase, Globe, Check, Star,
  Zap, Clock, SlidersHorizontal, ArrowUpDown
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
  experience_level: string | null;
  timezone: string | null;
  avatar_url: string | null;
  specialist_tiers: Tier[];
  specialist_availability?: { available_date: string; day_of_week: number; start_time: string; end_time: string; is_active: boolean }[];
}

// Colour accent per specialty tag
const SPECIALTY_COLORS: Record<string, string> = {
  anxiety: "bg-[#eee9f4] text-[#66517d] border-[#d8cce7] dark:bg-[#352944] dark:text-[#d8c8ee] dark:border-[#514064]",
  sleep: "bg-[#e5eaf0] text-[#4b6479] border-[#cbd8e3] dark:bg-[#263744] dark:text-[#c5d9e8] dark:border-[#3c5364]",
  leadership: "bg-[#f2ead7] text-[#856a36] border-[#e3d4ad] dark:bg-[#3c3322] dark:text-[#e7d09a] dark:border-[#5a4b2d]",
  relationships: "bg-[#f2e6e1] text-[#8b5e4e] border-[#e3ccc2] dark:bg-[#3c2b27] dark:text-[#e8c4b7] dark:border-[#5c4037]",
  burnout: "bg-[#e3eee8] text-[#426f5c] border-[#c3d9cc] dark:bg-[#233b30] dark:text-[#c3e2cf] dark:border-[#3a5947]",
  mindfulness: "bg-[#e1ecdf] text-[#3f704b] border-[#c2d8bf] dark:bg-[#263e2b] dark:text-[#c4e3c4] dark:border-[#3f5b41]",
  stress: "bg-[#eee9f4] text-[#66517d] border-[#d8cce7] dark:bg-[#352944] dark:text-[#d8c8ee] dark:border-[#514064]",
  default: "bg-[#e1ecdf] text-[#315b49] border-[#c2d8bf] dark:bg-[#263e2b] dark:text-[#c4e3c4] dark:border-[#3f5b41]",
};

function specialtyColor(s: string) {
  const key = Object.keys(SPECIALTY_COLORS).find((k) => s.toLowerCase().includes(k));
  return SPECIALTY_COLORS[key ?? "default"];
}

function firstConsultationPrice(priceCents: number, tierType?: string) {
  if (tierType === "bundle") return null;
  const discounts: Record<number, number> = { 9900: 6900, 12900: 9100, 18900: 13300 };
  return discounts[priceCents] ?? null;
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
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<SpecialistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [previousConsultationSpecialistIds, setPreviousConsultationSpecialistIds] = useState<Set<string>>(new Set());
  const [consultationHistoryLoaded, setConsultationHistoryLoaded] = useState(false);
  const [specialityFilter, setSpecialityFilter] = useState("all");
  const [qualificationFilter, setQualificationFilter] = useState("all");
  const [experienceFilter, setExperienceFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name-asc");
  const [priceSort, setPriceSort] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [bookingSelection, setBookingSelection] = useState<{ specialistId: string; tierId: string } | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setPreviousConsultationSpecialistIds(new Set());
      setConsultationHistoryLoaded(true);
      return;
    }
    let cancelled = false;
    setConsultationHistoryLoaded(false);
    (async () => {
      const { data, error } = await supabase.from("appointments")
        .select("specialist_id")
        .eq("customer_id", user.id)
        .not("status", "eq", "cancelled");
      if (cancelled) return;
      if (error) {
        console.error("[Specialists] consultation history lookup failed:", error);
        setPreviousConsultationSpecialistIds(new Set(items.map((item) => item.id)));
      } else {
        setPreviousConsultationSpecialistIds(new Set((data ?? []).map((appointment) => appointment.specialist_id)));
      }
      setConsultationHistoryLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [user, authLoading, items]);

  const breatheRiseSpecialities = [
    { label: "Stress & anxiety", keywords: ["stress", "anxiety"] },
    { label: "Sleep & recovery", keywords: ["sleep", "recovery"] },
    { label: "Relationships", keywords: ["relationship"] },
    { label: "Focus & confidence", keywords: ["focus", "confidence"] },
    { label: "Life transitions", keywords: ["transition"] },
    { label: "Personal growth", keywords: ["growth", "mindfulness"] },
  ];
  const breatheRiseQualifications = [
    "Psychology",
    "Counselling",
    "Therapy",
    "Psychiatry",
    "Mental health",
    "Coaching",
  ];

  const visibleItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = items.filter((s) => {
      const matchesSearch = !query || [s.display_name, s.headline ?? "", s.bio ?? "", ...(s.specialities ?? []), ...(s.qualifications ?? [])].some((value) => value.toLowerCase().includes(query));
      return matchesSearch && (specialityFilter === "all" || (() => {
        const category = breatheRiseSpecialities.find((v) => v.label === specialityFilter);
        return category ? (s.specialities ?? []).some((v) => category.keywords.some((keyword) => v.toLowerCase().includes(keyword))) : false;
      })()) &&
      (qualificationFilter === "all" || (s.qualifications ?? []).some((v) => v.toLowerCase().includes(qualificationFilter.toLowerCase()))) &&
      (experienceFilter === "all" || s.experience_level === experienceFilter);
    });
    return [...filtered].sort((a, b) => {
      if (sortBy === "name-desc") return b.display_name.localeCompare(a.display_name);
      if (priceSort === "low") return (a.specialist_tiers.find((t) => (t.tier_type ?? "single") === "single")?.price_cents ?? Infinity) - (b.specialist_tiers.find((t) => (t.tier_type ?? "single") === "single")?.price_cents ?? Infinity);
      if (priceSort === "high") return (b.specialist_tiers.find((t) => (t.tier_type ?? "single") === "single")?.price_cents ?? -1) - (a.specialist_tiers.find((t) => (t.tier_type ?? "single") === "single")?.price_cents ?? -1);
      if (sortBy === "duration-short") return (a.specialist_tiers[0]?.duration_minutes ?? Infinity) - (b.specialist_tiers[0]?.duration_minutes ?? Infinity);
      if (sortBy === "duration-long") return (b.specialist_tiers[0]?.duration_minutes ?? -1) - (a.specialist_tiers[0]?.duration_minutes ?? -1);
      return a.display_name.localeCompare(b.display_name);
    });
  }, [items, specialityFilter, qualificationFilter, experienceFilter, sortBy, priceSort, searchQuery]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("specialist_profiles")
        .select(`
          id, display_name, headline, bio, country, country_flag,
          specialities, qualifications, experience_level, timezone, avatar_url,
          specialist_tiers!specialist_tiers_specialist_id_fkey(id, label, duration_minutes, price_cents, currency, is_active, tier_type, session_count, savings_label), specialist_availability(available_date, day_of_week, start_time, end_time, is_active)
        `)
        .eq("is_published", true)
        .order("display_name");

      if (error) {
        const fallback = await supabase
          .from("specialist_profiles")
          .select(`
            id, display_name, headline, bio, country, country_flag,
            specialities, qualifications, experience_level, timezone, avatar_url,
            specialist_tiers!specialist_id(id, label, duration_minutes, price_cents, currency, is_active, tier_type, session_count, savings_label), specialist_availability(available_date, day_of_week, start_time, end_time, is_active)
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


  return (
    <section className="relative min-h-screen overflow-hidden bg-[#f4f3e9] px-3 py-8 text-[#204b3b] dark:bg-[#14271e] dark:text-[#edf4e8] sm:px-5 sm:py-12 lg:py-14">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-[#dfe9d9] via-[#edf0e5]/60 to-transparent dark:from-[#233b2c] dark:via-[#182d22]/70" />
      <div className="container relative mx-auto w-full max-w-7xl">
        <RevealOnScroll className="relative overflow-hidden rounded-[1.4rem] border border-[#d1dccd] bg-[#fbfaf4] p-4 shadow-none dark:border-[#3d5946] dark:bg-[#1b3025] sm:p-7 lg:p-10"><div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border border-[#c5d6bf] dark:border-[#3f604a]" /><div className="pointer-events-none absolute -right-5 -top-9 h-44 w-44 rounded-full border border-[#c5d6bf] dark:border-[#3f604a]" /><div className="pointer-events-none absolute right-8 top-8 h-24 w-24 rounded-full bg-[#dfe9d9]/70 dark:bg-[#315640]/50" />
          <div className="relative z-10 grid min-w-0 items-center gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(19rem,0.9fr)] lg:gap-8">
            <div className="min-w-0"><span className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-[#cbdac5] bg-[#e5ecdf] px-3 py-1.5 text-xs font-semibold text-[#315b49] dark:border-[#3f604a] dark:bg-[#294737] dark:text-[#dcebd8]"><Star className="h-3.5 w-3.5" /> Thoughtful care, chosen around you</span>
              <h1 className="mt-5 max-w-2xl font-display text-4xl font-medium leading-[1.04] tracking-[-.065em] text-[#204b3b] dark:text-[#edf4e8] sm:text-6xl lg:text-7xl">Find the right support for your <span className="font-serif italic font-normal text-[#789577] dark:text-[#9fbe9d]">next step.</span></h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">Explore experienced specialists, compare session options, and choose a time that fits your life.</p>
              <div className="mt-6 flex flex-wrap gap-2 text-xs font-medium text-muted-foreground"><span className="rounded-full border bg-background/70 px-3 py-2">Personalised discovery</span><span className="rounded-full border bg-background/70 px-3 py-2">Clear session pricing</span><span className="rounded-full border bg-background/70 px-3 py-2">Times in your timezone</span></div>
            </div>
            <div className="min-w-0 rounded-2xl border border-[#cbd7c7] bg-[#e8ede2] p-4 sm:p-6 dark:border-[#3d5946] dark:bg-[#233b2c]"><div className="text-sm font-semibold">A little help finding your fit</div><p className="mt-1 text-sm leading-6 text-muted-foreground">Search by name, specialty, or qualification. Compare availability and pricing before booking.</p>
              <label className="mt-5 block"><span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Search specialists</span><div className="flex items-center gap-2 rounded-2xl border border-[#cbd7c7] bg-[#fbfaf4] px-3 shadow-sm dark:border-[#3d5946] dark:bg-[#192e23]"><UserRound className="h-4 w-4 shrink-0 text-primary" /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Try anxiety, sleep, counselling…" className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" aria-label="Search specialists by name or specialty" />{searchQuery && <button type="button" onClick={() => setSearchQuery("")} className="text-xs font-semibold text-primary">Clear</button>}</div></label>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm"><span className="text-muted-foreground">{loading ? "Finding specialists…" : `${visibleItems.length} specialist${visibleItems.length === 1 ? "" : "s"} to explore`}</span><span className="inline-flex items-center gap-1 font-semibold text-primary"><Check className="h-4 w-4" /> Your pace, your choice</span></div>
            </div>
          </div>

        </RevealOnScroll>

        {/* Filters & sorting — options come only from published specialists */}
        {!loading && items.length > 0 && (
          <RevealOnScroll className="mt-6 rounded-2xl border border-[#d1dccd] bg-[#fbfaf4] p-4 shadow-none dark:border-[#3d5946] dark:bg-[#1b3025] sm:p-5">
            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[auto_repeat(5,minmax(0,1fr))] lg:items-end">
              <div className="flex min-h-10 items-center gap-2 text-sm font-semibold sm:col-span-2 lg:col-span-1 lg:mr-2">
                <SlidersHorizontal className="h-4 w-4 text-teal" /> Filter specialists
              </div>
              <label className="min-w-0">
                <span className="mb-1 block text-xs text-muted-foreground">Speciality</span>
                <select value={specialityFilter} onChange={(e) => setSpecialityFilter(e.target.value)} className="h-10 w-full min-w-0 rounded-lg border border-[#cbd7c7] bg-[#fbfaf4] px-3 text-sm dark:border-[#3d5946] dark:bg-[#192e23]">
                  <option value="all">All specialities</option>
                  {breatheRiseSpecialities.map((v) => <option key={v.label} value={v.label}>{v.label}</option>)}
                </select>
              </label>
              <label className="flex-1">
                <span className="mb-1 block text-xs text-muted-foreground">Qualification</span>
                <select value={qualificationFilter} onChange={(e) => setQualificationFilter(e.target.value)} className="h-10 w-full rounded-lg border border-[#cbd7c7] bg-[#fbfaf4] px-3 text-sm dark:border-[#3d5946] dark:bg-[#192e23]">
                  <option value="all">All qualifications</option>
                  {breatheRiseQualifications.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
              <label className="min-w-0">
                <span className="mb-1 block text-xs text-muted-foreground">Experience Level</span>
                <select value={experienceFilter} onChange={(e) => setExperienceFilter(e.target.value)} className="h-10 w-full min-w-0 rounded-lg border border-[#cbd7c7] bg-[#fbfaf4] px-3 text-sm dark:border-[#3d5946] dark:bg-[#192e23]">
                  <option value="all">All experience levels</option>
                  <option value="0-3 years">0–3 years</option>
                  <option value="4-7 years">4–7 years</option>
                  <option value="7+ years">7+ years</option>
                </select>
              </label>
              <label className="flex-1">
                <span className="mb-1 flex items-center gap-1 text-xs text-muted-foreground"><ArrowUpDown className="h-3 w-3" /> Sort by</span>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="h-10 w-full rounded-lg border border-[#cbd7c7] bg-[#fbfaf4] px-3 text-sm dark:border-[#3d5946] dark:bg-[#192e23]">
                  <option value="name-asc">Name (A–Z)</option>
                  <option value="name-desc">Name (Z–A)</option>
                  <option value="duration-short">Shortest session</option>
                  <option value="duration-long">Longest session</option>
                </select>
              </label>
              <label className="flex-1">
                <span className="mb-1 block text-xs text-muted-foreground">Price</span>
                <select value={priceSort} onChange={(e) => setPriceSort(e.target.value)} className="h-10 w-full rounded-lg border border-white/10 bg-background px-3 text-sm">
                  <option value="all">All prices</option>
                  <option value="low">Low to high</option>
                  <option value="high">High to low</option>
                </select>
              </label>
              {(specialityFilter !== "all" || qualificationFilter !== "all" || experienceFilter !== "all" || priceSort !== "all") && <Button type="button" variant="outline" onClick={() => { setSpecialityFilter("all"); setQualificationFilter("all"); setExperienceFilter("all"); setPriceSort("all"); }}>Clear</Button>}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{visibleItems.length} published specialist{visibleItems.length === 1 ? "" : "s"} shown</p>
          </RevealOnScroll>
        )}

        {/* Grid */}
        <div className="mt-6 grid min-w-0 grid-cols-1 items-stretch gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
          {loading &&
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[540px] animate-pulse rounded-[1.4rem] border border-[#d1dccd] bg-[#e8ede2] dark:border-[#3d5946] dark:bg-[#203629]" />
            ))}

          {!loading && visibleItems.length === 0 && (
            <Card className="col-span-full border-[#d1dccd] bg-[#fbfaf4] p-12 text-center text-muted-foreground shadow-none dark:border-[#3d5946] dark:bg-[#1b3025]">
              <UserRound className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium">No published specialists match these filters.</p>
            </Card>
          )}

          {!loading && visibleItems.map((specialist, index) => (
            <RevealOnScroll key={specialist.id} delay={Math.min(index % 3, 2) * 90}>
              <SpecialistCard
                specialist={specialist}
                firstConsultationEligible={!authLoading && (!user || (consultationHistoryLoaded && !previousConsultationSpecialistIds.has(specialist.id)))}
                onBook={(tierId) => setBookingSelection({ specialistId: specialist.id, tierId })}
              />
            </RevealOnScroll>
          ))}
        </div>
        <Dialog open={!!bookingSelection} onOpenChange={(open) => { if (!open) setBookingSelection(null); }}>
          <DialogContent className="max-h-[92vh] w-[calc(100%-1rem)] max-w-5xl overflow-y-auto p-0 sm:rounded-3xl">
            <DialogHeader className="sr-only"><DialogTitle>Book a specialist session</DialogTitle></DialogHeader>
            {bookingSelection && <BookAppointment initialSpecialistId={bookingSelection.specialistId} initialTierId={bookingSelection.tierId} embedded onClose={() => setBookingSelection(null)} />}
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}

function SpecialistCard({ specialist, onBook, firstConsultationEligible }: { specialist: SpecialistRow; onBook: (tierId: string) => void; firstConsultationEligible: boolean }) {
  const tiers = sortTiers(specialist.specialist_tiers ?? []);
  const singleTier = tiers.find((t) => (t.tier_type ?? "single") === "single");
  const bundleTiers = tiers.filter((t) => t.tier_type === "bundle");
  const [activeTier, setActiveTier] = useState<string>(tiers[0]?.id ?? "");
  const [showSpecialities, setShowSpecialities] = useState(false);
  const [showBio, setShowBio] = useState(false);

  const selectedTier = tiers.find((t) => t.id === activeTier) ?? tiers[0];

  return (
    <Card className="group relative flex min-w-0 flex-col overflow-hidden rounded-[1.6rem] border border-[#cbd8c5] bg-[#fbfaf4] shadow-[0_18px_48px_-34px_rgba(32,75,59,0.45)] transition-all duration-300 hover:-translate-y-1 hover:border-[#86a889] hover:shadow-[0_24px_58px_-32px_rgba(32,75,59,0.5)] dark:border-[#3d5946] dark:bg-[#1b3025] dark:shadow-[0_18px_48px_-34px_rgba(0,0,0,0.7)] dark:hover:border-[#648467]"><div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#c8dfc5]/35 blur-3xl transition-opacity duration-300 group-hover:opacity-100 dark:bg-[#4b8c74]/15" />
      {/* ── HEADER BAND ── */}
      <div className="relative border-b border-[#d7e0d2] bg-[#edf1e7] p-4 sm:p-5 dark:border-[#3d5946] dark:bg-[#233b2c]">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          {/* Avatar */}
          <div className="relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-2xl ring-2 ring-primary/15 shadow-sm">
            {specialist.avatar_url ? (
              <img src={specialist.avatar_url} alt={specialist.display_name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[#204b3b] font-display text-2xl font-medium text-[#f4f3e9] dark:bg-[#a5c4a4] dark:text-[#183e32]">
                {specialist.display_name?.[0] ?? <UserRound className="h-7 w-7" />}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="break-words text-lg font-bold leading-snug">{specialist.display_name}</h3>
            {specialist.headline && (
              <p className="mt-0.5 break-words text-sm leading-snug text-teal">{specialist.headline}</p>
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
            {specialist.experience_level && <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#cbdac5] bg-[#e5ecdf] px-2.5 py-1 text-xs font-medium text-[#315b49] dark:border-[#3f604a] dark:bg-[#294737] dark:text-[#dcebd8]"><Briefcase className="h-3.5 w-3.5" />{specialist.experience_level}</div>}
          </div>
        </div>

        <div className="mt-3 break-words rounded-xl border border-[#d1dccd] bg-[#f7f7ee] p-3 text-xs leading-5 text-muted-foreground dark:border-[#3d5946] dark:bg-[#203629]"><span className="font-semibold text-foreground">Timezone notice:</span> availability is shown in your device timezone ({getTimeZoneLabel(getDeviceTimeZone())}).</div>
        <AvailabilityPreview specialist={specialist} />

        {/* Specialities */}
        {specialist.specialities && specialist.specialities.length > 0 && (
          <div className="mt-3 flex min-w-0 flex-wrap gap-1.5">
            {specialist.specialities.slice(0, 4).map((s) => (
              <span
                key={s}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${specialtyColor(s)}`}
              >
                {s}
              </span>
            ))}
            {specialist.specialities.length > 4 && (
              <button type="button" onClick={() => setShowSpecialities(true)} className="cursor-pointer rounded-full border border-[#cbd7c7] px-2.5 py-0.5 text-[11px] text-[#587060] transition-colors hover:border-[#9fb69f] hover:text-[#204b3b] focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-[#3d5946] dark:text-[#c0d0c2] dark:hover:border-[#648467] dark:hover:text-white" aria-label={`View ${specialist.specialities.length - 4} more specialties`}>+{specialist.specialities.length - 4} more</button>
            )}
          </div>
        )}
      </div>

      {/* ── BIO ── */}
      {specialist.bio && (
        <div className="min-w-0 border-b border-[#d7e0d2] px-4 py-4 sm:px-5 dark:border-[#3d5946]"><button type="button" onClick={() => setShowBio(true)} className="w-full cursor-pointer rounded-md text-left focus:outline-none focus:ring-2 focus:ring-primary/40" aria-label={`Read full bio for ${specialist.display_name}`}><p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{specialist.bio}{specialist.bio.length > 180 ? "..." : ""}</p></button></div>
      )}

      <Dialog open={showSpecialities} onOpenChange={setShowSpecialities}><DialogContent className="max-h-[80vh] overflow-y-auto"><DialogHeader><DialogTitle>{specialist.display_name}&apos;s specialties</DialogTitle></DialogHeader><div className="flex flex-wrap gap-2">{(specialist.specialities ?? []).map((s) => <span key={s} className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${specialtyColor(s)}`}>{s}</span>)}</div></DialogContent></Dialog>
      <Dialog open={showBio} onOpenChange={setShowBio}><DialogContent className="max-h-[80vh] overflow-y-auto"><DialogHeader><DialogTitle>About {specialist.display_name}</DialogTitle></DialogHeader><p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{specialist.bio}</p></DialogContent></Dialog>

      {/* ── QUALIFICATIONS ── */}
      {specialist.qualifications && specialist.qualifications.length > 0 && (
        <div className="border-b border-[#d7e0d2] px-5 py-3 dark:border-[#3d5946]">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <GraduationCap className="h-3.5 w-3.5" /> Qualifications
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {specialist.qualifications.slice(0, 3).map((q) => (
              <span key={q} className="rounded-md border border-[#d1dccd] bg-[#f7f7ee] px-2 py-0.5 text-xs text-foreground/80 dark:border-[#3d5946] dark:bg-[#203629]">
                {q}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── PREMIUM SESSION PICKER ── */}
      <div className="relative min-w-0 flex-1 bg-gradient-to-b from-[#f8faf3] to-[#fbfaf4] px-4 py-5 sm:px-5 dark:from-[#1d3528] dark:to-[#1b3025]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-[#65866a] dark:text-[#a5c4a4]">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#e1ecdf] text-[#315b49] ring-1 ring-[#cbdac5] dark:bg-[#294737] dark:text-[#dcebd8] dark:ring-[#45624c]"><Briefcase className="h-3.5 w-3.5" /></span>
              Find your fit
            </div>
            <h4 className="mt-2 text-lg font-semibold tracking-tight text-[#204b3b] dark:text-[#edf4e8]">Choose your session</h4>
            <p className="mt-1 text-xs leading-5 text-[#718273] dark:text-[#b8cbbb]">Flexible options, clear pricing, your pace.</p>
          </div>
          {tiers.length > 0 && <span className="mt-1 inline-flex shrink-0 items-center gap-1 rounded-full border border-[#d0dfca] bg-white/70 px-2.5 py-1 text-[10px] font-semibold text-[#53765d] dark:border-[#3d5946] dark:bg-[#203629] dark:text-[#c0d9bf]"><Check className="h-3 w-3" /> {tiers.length} {tiers.length === 1 ? "option" : "options"}</span>}
        </div>

        {tiers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#cbd7c7] bg-white/50 p-5 text-center text-xs text-muted-foreground dark:border-[#3d5946] dark:bg-[#203629]/60">
            No active sessions just yet.
          </div>
        ) : (
          <div className="space-y-2.5">
            {singleTier && (
              <TierPill
                tier={singleTier}
                selected={activeTier === singleTier.id}
                onSelect={() => setActiveTier(singleTier.id)}
                badge={null}
                firstConsultationEligible={firstConsultationEligible}
              />
            )}
            {bundleTiers.map((t, i) => (
              <TierPill
                key={t.id}
                tier={t}
                selected={activeTier === t.id}
                onSelect={() => setActiveTier(t.id)}
                badge={t.savings_label ?? (i === 0 ? "SAVE 12%" : i === 1 ? "SAVE 20%" : null)}
                firstConsultationEligible={firstConsultationEligible}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── BOOKING CTA ── */}
      <div className="relative overflow-hidden border-t border-[#d4e0cf] bg-gradient-to-br from-[#eaf1e4] via-[#f0f4e9] to-[#e2eee7] p-4 sm:p-5 dark:border-[#3d5946] dark:from-[#203b2c] dark:via-[#203629] dark:to-[#1c3833]">
        <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[#79b9a5]/25 blur-2xl" />
        {selectedTier && <div className="relative mb-3 flex items-center justify-between gap-3 px-1">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#65866a] dark:text-[#a5c4a4]">Your selection</p>
            <p className="mt-1 truncate text-sm font-semibold text-[#204b3b] dark:text-[#edf4e8]">{selectedTier.label}</p>
            <p className="mt-0.5 text-xs text-[#718273] dark:text-[#b8cbbb]"><Clock className="mr-1 inline h-3 w-3" />{selectedTier.duration_minutes} minute session</p>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-right">
              {firstConsultationEligible && firstConsultationPrice(selectedTier.price_cents, selectedTier.tier_type) !== null ? (
                <>
                  <p className="text-xs text-[#718273] line-through dark:text-[#b8cbbb]">{selectedTier.currency} {(selectedTier.price_cents / 100).toFixed(0)}/session</p>
                  <p className="text-2xl font-bold tracking-tight text-[#147d70] dark:text-[#9fdbca]">{selectedTier.currency} {(firstConsultationPrice(selectedTier.price_cents, selectedTier.tier_type)! / 100).toFixed(0)}/session</p>
                  <span className="mt-1 inline-flex rounded-full bg-[#dff1e3] px-2 py-1 text-[10px] font-bold text-[#276545] dark:bg-[#294737] dark:text-[#c3e2cf]">First consultation only</span>
                </>
              ) : (
                <p className="text-2xl font-bold tracking-tight text-[#204b3b] dark:text-[#edf4e8]">{selectedTier.currency} {(selectedTier.price_cents / 100).toFixed(0)}</p>
              )}
            </div>
            <p className="text-[10px] text-[#718273] dark:text-[#b8cbbb]">clear, upfront pricing</p>
          </div>
        </div>}
        <Button type="button" disabled={!selectedTier} onClick={() => selectedTier && onBook(selectedTier.id)} className="group/book relative z-10 flex h-12 w-full items-center overflow-hidden rounded-2xl border border-[#65cdb5]/50 bg-gradient-to-r from-[#147d70] via-[#259e8a] to-[#537fba] px-5 font-semibold !text-white shadow-[0_10px_26px_-9px_rgba(37,158,138,0.72)] transition-all duration-300 before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/25 before:to-transparent before:transition-transform before:duration-700 hover:-translate-y-0.5 hover:shadow-[0_15px_32px_-8px_rgba(37,158,138,0.8)] hover:before:translate-x-full active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#65cdb5]/40 dark:from-[#176f64] dark:via-[#218c7c] dark:to-[#496fa4]"><Zap className="mr-2 h-4 w-4" />Book this session<span className="ml-auto flex items-center gap-1 text-sm font-bold"><span>{selectedTier ? selectedTier.currency + " " + (((firstConsultationEligible ? firstConsultationPrice(selectedTier.price_cents, selectedTier.tier_type) : null) ?? selectedTier.price_cents) / 100).toFixed(0) + (firstConsultationEligible && firstConsultationPrice(selectedTier.price_cents, selectedTier.tier_type) !== null ? "/session" : "") : "Choose a session"}</span><ArrowRight className="h-4 w-4 transition-transform group-hover/book:translate-x-1" /></span></Button>
        <p className="relative mt-2.5 text-center text-[10px] text-[#718273] dark:text-[#b8cbbb]">A thoughtful next step, at your own pace.</p>
      </div>
    </Card>
  );
}


function RevealOnScroll({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") {
      setRevealed(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setRevealed(true);
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.12, rootMargin: "0px 0px -35px 0px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={elementRef}
      className={`transition-[opacity,filter,transform] duration-700 ease-out motion-reduce:transition-none ${revealed ? "translate-y-0 opacity-100 blur-0" : "translate-y-5 opacity-0 blur-md"} ${className}`}
      style={{ transitionDelay: revealed ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}

function AvailabilityPreview({ specialist }: { specialist: SpecialistRow }) {
  const rows = (specialist.specialist_availability ?? []).filter((r) => r.is_active && r.available_date);
  if (!rows.length) return null;

  const tz = specialist.timezone ?? "UTC";
  const viewerTz = getDeviceTimeZone();
  const now = Date.now();
  const entries = rows
    .map((row) => {
      const start = zonedTimeToUtc(row.available_date, row.start_time, tz);
      const startMinutes = Number(row.start_time.slice(0, 2)) * 60 + Number(row.start_time.slice(3, 5));
      const endMinutes = Number(row.end_time.slice(0, 2)) * 60 + Number(row.end_time.slice(3, 5));
      const crossesMidnight = endMinutes <= startMinutes;
      const endDate = new Date(`${row.available_date}T00:00:00Z`);
      if (crossesMidnight) endDate.setUTCDate(endDate.getUTCDate() + 1);
      const end = zonedTimeToUtc(endDate.toISOString().slice(0, 10), row.end_time, tz);
      if (end <= start || end.getTime() < now) return null;
      return {
        key: row.available_date + row.start_time + row.end_time,
        start,
        label: formatInTimeZone(start, viewerTz, { day: "numeric", month: "short", year: "numeric" }),
        time: formatInTimeZone(start, viewerTz, { hour: "numeric", minute: "2-digit" }) + "–" + formatInTimeZone(end, viewerTz, { hour: "numeric", minute: "2-digit" }),
      };
    })
    .filter((entry): entry is { key: string; start: Date; label: string; time: string } => Boolean(entry))
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, 8);

  if (!entries.length) return null;
  return <div className="mt-3 min-w-0 rounded-xl border border-[#d1dccd] bg-[#f7f7ee] p-3 dark:border-[#3d5946] dark:bg-[#203629]">
    <div className="text-xs font-semibold">Upcoming availability</div>
    <div className="mt-2 grid min-w-0 grid-cols-1 gap-2 text-xs">
      {entries.map((entry) => <div key={entry.key} className="flex min-w-0 flex-wrap items-start justify-between gap-x-3 gap-y-1 text-muted-foreground"><span className="min-w-0">{entry.label}</span><span className="shrink-0 font-medium text-foreground">{entry.time}</span></div>)}
    </div>
  </div>;
}

function TierPill({
  tier,
  selected,
  onSelect,
  badge,
  firstConsultationEligible,
}: {
  tier: Tier;
  selected: boolean;
  onSelect: () => void;
  badge: string | null;
  firstConsultationEligible: boolean;
}) {
  const isBundle = tier.tier_type === "bundle";

  return (
    <button
      onClick={onSelect}
      aria-pressed={selected}
      className={`group/tier relative w-full overflow-hidden rounded-2xl border p-3.5 text-left transition-all duration-200 ${
        selected
          ? "border-[#7ea783] bg-gradient-to-br from-[#e7f1e2] via-[#f1f5e9] to-[#e4f0e9] shadow-[0_8px_22px_-16px_rgba(32,75,59,0.65)] ring-1 ring-[#b5cbb0] dark:border-[#789d7d] dark:from-[#294737] dark:via-[#233b2c] dark:to-[#1f3a31] dark:ring-[#42664a]"
          : "border-[#d7e2d2] bg-white/65 hover:border-[#9fb69f] hover:bg-[#f0f5eb] dark:border-[#3d5946] dark:bg-[#203629]/70 dark:hover:border-[#648467] dark:hover:bg-[#294737]"
      }`}
    >
      {selected && <span className="pointer-events-none absolute inset-y-0 left-0 w-1 rounded-l-2xl bg-gradient-to-b from-[#259e8a] to-[#537fba]" />}
      <div className="flex min-w-0 items-start justify-between gap-3 pl-1">
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
            selected ? "border-[#315b49] bg-[#315b49] text-white dark:border-[#9fbe9d] dark:bg-[#9fbe9d] dark:text-[#183e32]" : "border-[#bdcdbb] bg-white/70 text-transparent dark:border-[#506b55] dark:bg-[#1b3025]"
          }`}>
            {selected && <Check className="h-3 w-3" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="break-words text-sm font-semibold text-[#204b3b] dark:text-[#edf4e8]">{tier.label}</span>
              {badge && (
                <span className="shrink-0 rounded-full border border-[#a8d4b4]/70 bg-[#dff1e3] px-2 py-0.5 text-[9px] font-extrabold tracking-wide text-[#276545] dark:border-[#42664a] dark:bg-[#294737] dark:text-[#c3e2cf]">
                  {badge}
                </span>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[#718273] dark:text-[#b8cbbb]">
              <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{tier.duration_minutes} min</span>
              {isBundle && tier.session_count && tier.session_count > 1 && (
                <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 text-amber-500" />{tier.session_count} sessions</span>
              )}
            </div>
          </div>
        </div>
        <div className="max-w-[42%] shrink-0 text-right">
          <div className={`text-base font-bold tracking-tight ${selected ? "text-[#204b3b] dark:text-[#edf4e8]" : "text-[#405d4b] dark:text-[#d7e6d5]"}`}>
            {firstConsultationEligible && firstConsultationPrice(tier.price_cents, tier.tier_type) !== null ? (
              <div className="flex flex-col items-end">
                <span className="text-xs font-medium text-[#718273] line-through dark:text-[#b8cbbb]">{tier.currency} {(tier.price_cents / 100).toFixed(0)}/session</span>
                <span className="text-base font-extrabold text-[#147d70] dark:text-[#9fdbca]">{tier.currency} {(firstConsultationPrice(tier.price_cents, tier.tier_type)! / 100).toFixed(0)}/session</span>
                <span className="mt-1 rounded-full bg-[#dff1e3] px-2 py-0.5 text-[9px] font-bold text-[#276545] dark:bg-[#294737] dark:text-[#c3e2cf]">First consultation only</span>
              </div>
            ) : (
              <span>{tier.currency} {(tier.price_cents / 100).toFixed(0)}</span>
            )}
          </div>
          {isBundle && tier.session_count && tier.session_count > 1 && (
            <div className="mt-0.5 text-[10px] text-[#718273] dark:text-[#b8cbbb]">
              {tier.currency} {(tier.price_cents / tier.session_count / 100).toFixed(0)}/session
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
