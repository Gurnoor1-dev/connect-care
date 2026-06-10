import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Package, User } from "lucide-react";

interface Specialist {
  id: string;
  display_name: string;
  headline: string | null;
  country_flag: string | null;
  avatar_url: string | null;
  availability_status: "online" | "offline" | null;
}
interface Tier {
  id?: string;
  specialist_id?: string;
  label: string;
  duration_minutes: number;
  price_cents: number;
  currency: string;
  is_active: boolean;
  tier_type: "single" | "bundle";
  session_count: number;
  savings_label: string;
}

const CURRENCIES = ["USD", "INR", "EUR", "GBP", "AED", "SGD"];

function defaultTier(type: "single" | "bundle"): Tier {
  return {
    label: type === "single" ? "Single session" : "4-session bundle",
    duration_minutes: 50,
    price_cents: type === "single" ? 9900 : 35640,
    currency: "USD",
    is_active: true,
    tier_type: type,
    session_count: type === "single" ? 1 : 4,
    savings_label: type === "bundle" ? "SAVE 10%" : "",
  };
}

export default function AdminTiers() {
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loadingTiers, setLoadingTiers] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("specialist_profiles")
        .select("id, display_name, headline, country_flag, avatar_url, availability_status")
        .order("display_name", { ascending: true });
      if (error) toast.error(error.message);
      setSpecialists(data ?? []);
      if (data?.length) setSelectedId(data[0].id);
    })();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    loadTiers(selectedId);
  }, [selectedId]);

  const selected = specialists.find((s) => s.id === selectedId);

  const loadTiers = async (specialistId: string) => {
    setLoadingTiers(true);
    const { data, error } = await supabase
      .from("specialist_tiers")
      .select("id, specialist_id, label, duration_minutes, price_cents, currency, is_active, tier_type, session_count, savings_label")
      .eq("specialist_id", specialistId)
      .order("price_cents", { ascending: true });
    setLoadingTiers(false);
    if (error) toast.error(error.message);
    setTiers(
      (data ?? []).map((t: any) => ({
        ...t,
        tier_type: t.tier_type ?? "single",
        session_count: t.session_count ?? 1,
        savings_label: t.savings_label ?? "",
      }))
    );
  };

  const add = (type: "single" | "bundle") =>
    setTiers((current) => [...current, defaultTier(type)]);

  const update = (index: number, patch: Partial<Tier>) =>
    setTiers((current) => current.map((tier, i) => (i === index ? { ...tier, ...patch } : tier)));

  const remove = async (index: number) => {
    const tier = tiers[index];
    if (tier.id) {
      const { error } = await supabase.from("specialist_tiers").delete().eq("id", tier.id);
      if (error) return toast.error(error.message);
    }
    setTiers((current) => current.filter((_, i) => i !== index));
    toast.success("Tier removed");
  };

  const save = async () => {
    if (!selectedId) return;
    setSaving(true);
    const payload = tiers.map((tier) => {
      const base = {
        specialist_id: selectedId,
        label: tier.label.trim() || "Session",
        duration_minutes: Number.isFinite(tier.duration_minutes) ? tier.duration_minutes : 50,
        price_cents: Number.isFinite(tier.price_cents) ? tier.price_cents : 0,
        currency: tier.currency || "USD",
        is_active: tier.is_active,
        tier_type: tier.tier_type ?? "single",
        session_count: tier.tier_type === "bundle" ? (tier.session_count ?? 4) : 1,
        savings_label: tier.savings_label?.trim() || null,
        credit_points: Math.max(
          tier.tier_type === "bundle" ? (tier.session_count ?? 4) * 2 : 2,
          2
        ),
      };
      return tier.id ? { id: tier.id, ...base } : base;
    });
    const { error } = await supabase.from("specialist_tiers").upsert(payload);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Tiers saved");
      loadTiers(selectedId);
    }
  };

  const singles = tiers.filter((t) => (t.tier_type ?? "single") === "single");
  const bundles = tiers.filter((t) => t.tier_type === "bundle");

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pricing & tiers</h1>
          <p className="mt-1 text-muted-foreground">Manage single-session prices and bundle packages.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => add("single")} variant="outline" disabled={!selectedId}>
            <User className="mr-2 h-4 w-4" /> Add single
          </Button>
          <Button onClick={() => add("bundle")} className="bg-gradient-brand text-primary-foreground shadow-brand" disabled={!selectedId}>
            <Package className="mr-2 h-4 w-4" /> Add bundle
          </Button>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        {/* Specialist selector */}
        <Card className="h-fit border-white/55 bg-card/88 p-4 shadow-brand backdrop-blur">
          <Label>Specialist</Label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="mt-2 h-10 w-full rounded-lg border bg-background px-3 text-sm"
          >
            {specialists.map((s) => (
              <option key={s.id} value={s.id}>{s.display_name}</option>
            ))}
          </select>
          {selected && (
            <div className="mt-4 rounded-lg border bg-gradient-to-br from-accent/70 via-card to-card p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 overflow-hidden rounded-lg bg-gradient-brand text-white flex items-center justify-center font-bold shrink-0">
                  {selected.avatar_url
                    ? <img src={selected.avatar_url} alt={selected.display_name} className="h-full w-full object-cover" />
                    : selected.display_name?.[0]}
                </div>
                <div>
                  <div className="truncate font-semibold text-sm">{selected.display_name}</div>
                  <Badge variant={selected.availability_status === "online" ? "default" : "secondary"} className="mt-0.5 capitalize text-xs">
                    {selected.availability_status ?? "offline"}
                  </Badge>
                </div>
              </div>
              {selected.headline && <p className="mt-2 text-xs text-muted-foreground">{selected.headline}</p>}
            </div>
          )}
        </Card>

        {/* Tiers */}
        <div className="space-y-4">
          {loadingTiers && (
            <Card className="flex items-center justify-center p-10 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading tiers
            </Card>
          )}
          {!loadingTiers && tiers.length === 0 && (
            <Card className="p-10 text-center text-muted-foreground">
              No tiers yet. Add a single session or bundle to make this specialist bookable.
            </Card>
          )}

          {/* Single tiers */}
          {singles.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <User className="h-3.5 w-3.5" /> Single sessions
              </div>
              <div className="space-y-2">
                {singles.map((tier, idx) => {
                  const realIdx = tiers.indexOf(tier);
                  return <TierRow key={tier.id ?? idx} tier={tier} index={realIdx} onUpdate={update} onRemove={remove} />;
                })}
              </div>
            </div>
          )}

          {/* Bundle tiers */}
          {bundles.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <Package className="h-3.5 w-3.5" /> Bundle packages
              </div>
              <div className="space-y-2">
                {bundles.map((tier, idx) => {
                  const realIdx = tiers.indexOf(tier);
                  return <TierRow key={tier.id ?? idx} tier={tier} index={realIdx} onUpdate={update} onRemove={remove} isBundle />;
                })}
              </div>
            </div>
          )}

          {tiers.length > 0 && (
            <Button onClick={save} disabled={saving} className="bg-gradient-brand text-primary-foreground shadow-brand">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save all tiers
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function TierRow({
  tier,
  index,
  onUpdate,
  onRemove,
  isBundle = false,
}: {
  tier: Tier;
  index: number;
  onUpdate: (i: number, p: Partial<Tier>) => void;
  onRemove: (i: number) => void;
  isBundle?: boolean;
}) {
  const CURRENCIES = ["USD", "INR", "EUR", "GBP", "AED", "SGD"];
  return (
    <Card className="border-white/55 bg-card/90 p-4 shadow-brand backdrop-blur">
      <div className="grid gap-3 sm:grid-cols-[1fr_100px_130px_100px_auto]">
        <div>
          <Label className="text-xs">Label</Label>
          <Input value={tier.label} onChange={(e) => onUpdate(index, { label: e.target.value })} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Minutes</Label>
          <Input type="number" min={5} value={tier.duration_minutes} onChange={(e) => onUpdate(index, { duration_minutes: Number(e.target.value) })} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Price ({tier.currency})</Label>
          <Input
            type="number" step="0.01" min={0}
            value={(tier.price_cents / 100).toFixed(2)}
            onChange={(e) => onUpdate(index, { price_cents: Math.round(Number(e.target.value || "0") * 100) })}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">Currency</Label>
          <select value={tier.currency} onChange={(e) => onUpdate(index, { currency: e.target.value })} className="mt-1 h-9 w-full rounded-lg border bg-background px-2 text-sm">
            {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex items-end gap-2 pb-0.5">
          <Switch checked={tier.is_active} onCheckedChange={(v) => onUpdate(index, { is_active: v })} />
          <Button variant="ghost" size="icon" onClick={() => onRemove(index)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
      {isBundle && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 border-t border-white/10 pt-3">
          <div>
            <Label className="text-xs">Sessions in bundle</Label>
            <Input
              type="number" min={2} max={20}
              value={tier.session_count}
              onChange={(e) => onUpdate(index, { session_count: Number(e.target.value) })}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Savings label (shown on card)</Label>
            <Input
              placeholder="e.g. SAVE 20%"
              value={tier.savings_label ?? ""}
              onChange={(e) => onUpdate(index, { savings_label: e.target.value })}
              className="mt-1"
            />
          </div>
        </div>
      )}
    </Card>
  );
}
