import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

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
}

const CURRENCIES = ["USD", "INR", "EUR", "GBP", "AED", "SGD"];

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
      .select("id, specialist_id, label, duration_minutes, price_cents, currency, is_active")
      .eq("specialist_id", specialistId)
      .order("price_cents", { ascending: true });

    setLoadingTiers(false);
    if (error) toast.error(error.message);
    setTiers(data ?? []);
  };

  const add = () => setTiers((current) => [
    ...current,
    { label: "Focused session", duration_minutes: 30, price_cents: 2500, currency: "USD", is_active: true },
  ]);

  const update = (index: number, patch: Partial<Tier>) => {
    setTiers((current) => current.map((tier, i) => i === index ? { ...tier, ...patch } : tier));
  };

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
      const cleanTier = {
        specialist_id: selectedId,
        label: tier.label.trim() || "Session",
        duration_minutes: Number.isFinite(tier.duration_minutes) ? tier.duration_minutes : 30,
        price_cents: Number.isFinite(tier.price_cents) ? tier.price_cents : 0,
        currency: tier.currency || "USD",
        is_active: tier.is_active,
      };
      return tier.id ? { id: tier.id, ...cleanTier } : cleanTier;
    });

    const { error } = await supabase.from("specialist_tiers").upsert(payload);
    setSaving(false);

    if (error) toast.error(error.message);
    else {
      toast.success("Specialist tiers saved");
      loadTiers(selectedId);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pricing & tiers</h1>
          <p className="mt-1 text-muted-foreground">Manage specialist prices, durations, currencies, and availability.</p>
        </div>
        <Button onClick={add} className="bg-gradient-brand text-primary-foreground shadow-brand" disabled={!selectedId}>
          <Plus className="mr-2 h-4 w-4" /> Add tier
        </Button>
      </header>

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <Card className="h-fit border-white/55 bg-card/88 p-4 shadow-brand backdrop-blur">
          <Label htmlFor="specialist">Specialist</Label>
          <select
            id="specialist"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="mt-2 h-10 w-full rounded-lg border bg-background px-3 text-sm"
          >
            {specialists.map((specialist) => (
              <option key={specialist.id} value={specialist.id}>{specialist.display_name}</option>
            ))}
          </select>

          {selected && (
            <div className="mt-5 rounded-lg border bg-gradient-to-br from-accent/70 via-card to-card p-4">
              <div className="flex items-center gap-3">
                <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-gradient-vivid text-primary-foreground">
                  {selected.avatar_url ? (
                    <img src={selected.avatar_url} alt={selected.display_name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-bold">{selected.display_name?.[0] ?? "S"}</div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-semibold">{selected.country_flag} {selected.display_name}</div>
                  <Badge variant={selected.availability_status === "online" ? "default" : "secondary"} className="mt-1 capitalize">
                    {selected.availability_status ?? "offline"}
                  </Badge>
                </div>
              </div>
              {selected.headline && <p className="mt-3 text-sm text-muted-foreground">{selected.headline}</p>}
            </div>
          )}
        </Card>

        <div className="space-y-3">
          {loadingTiers && (
            <Card className="flex items-center justify-center p-10 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading tiers
            </Card>
          )}
          {!loadingTiers && tiers.length === 0 && (
            <Card className="p-10 text-center text-muted-foreground">
              No tiers yet. Add one to make this specialist bookable.
            </Card>
          )}
          {!loadingTiers && tiers.map((tier, index) => (
            <Card key={tier.id ?? index} className="grid gap-3 border-white/55 bg-card/90 p-4 shadow-brand backdrop-blur md:grid-cols-[1fr_120px_140px_120px_auto_auto]">
              <div>
                <Label className="text-xs">Label</Label>
                <Input value={tier.label} onChange={(e) => update(index, { label: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Minutes</Label>
                <Input type="number" min={5} value={tier.duration_minutes} onChange={(e) => update(index, { duration_minutes: Number(e.target.value) })} />
              </div>
              <div>
                <Label className="text-xs">Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={(tier.price_cents / 100).toFixed(2)}
                  onChange={(e) => update(index, { price_cents: Math.round(Number(e.target.value || "0") * 100) })}
                />
              </div>
              <div>
                <Label className="text-xs">Currency</Label>
                <select value={tier.currency} onChange={(e) => update(index, { currency: e.target.value })} className="h-10 w-full rounded-lg border bg-background px-2 text-sm">
                  {CURRENCIES.map((currency) => <option key={currency}>{currency}</option>)}
                </select>
              </div>
              <div className="flex items-end pb-1">
                <Switch checked={tier.is_active} onCheckedChange={(is_active) => update(index, { is_active })} />
              </div>
              <div className="flex items-end pb-1">
                <Button variant="ghost" size="icon" onClick={() => remove(index)} aria-label="Remove tier">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </Card>
          ))}
          {tiers.length > 0 && (
            <Button onClick={save} disabled={saving} className="bg-gradient-brand text-primary-foreground shadow-brand">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save tiers
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
