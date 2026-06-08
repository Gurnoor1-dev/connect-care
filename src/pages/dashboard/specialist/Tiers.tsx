import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

interface Tier {
  id?: string;
  label: string;
  duration_minutes: number;
  price_cents: number;
  currency: string;
  is_active: boolean;
}

export default function SpecialistTiers() {
  const { user } = useAuth();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("specialist_tiers")
      .select("*")
      .eq("specialist_id", user.id)
      .order("price_cents", { ascending: true });
    setTiers(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-line */ }, [user]);

  const add = () => setTiers([...tiers, { label: "Quick chat", duration_minutes: 15, price_cents: 300, currency: "USD", is_active: true }]);
  const update = (i: number, patch: Partial<Tier>) => setTiers(tiers.map((t, j) => j === i ? { ...t, ...patch } : t));
  const remove = async (i: number) => {
    const t = tiers[i];
    if (t.id) await supabase.from("specialist_tiers").delete().eq("id", t.id);
    setTiers(tiers.filter((_, j) => j !== i));
  };
  const save = async () => {
    if (!user) return;
    const payload = tiers.map((t) => ({ ...t, specialist_id: user.id }));
    const { error } = await supabase.from("specialist_tiers").upsert(payload);
    if (error) toast.error(error.message); else { toast.success("Tiers saved"); load(); }
  };

  if (loading) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pricing tiers</h1>
          <p className="mt-1 text-muted-foreground">Set what customers pay for a session.</p>
        </div>
        <Button onClick={add} variant="outline"><Plus className="mr-2 h-4 w-4" /> Add tier</Button>
      </header>

      {tiers.length === 0 && <Card className="p-10 text-center text-muted-foreground">No tiers yet. Add one to get bookable.</Card>}

      <div className="space-y-3">
        {tiers.map((t, i) => (
          <Card key={i} className="grid gap-3 p-4 sm:grid-cols-[1fr_120px_140px_120px_auto_auto]">
            <div><Label className="text-xs">Label</Label><Input value={t.label} onChange={(e) => update(i, { label: e.target.value })} /></div>
            <div><Label className="text-xs">Minutes</Label><Input type="number" min={5} value={t.duration_minutes} onChange={(e) => update(i, { duration_minutes: +e.target.value })} /></div>
            <div><Label className="text-xs">Price</Label>
              <Input type="number" step="0.01" min={0} value={(t.price_cents / 100).toFixed(2)} onChange={(e) => update(i, { price_cents: Math.round(parseFloat(e.target.value || "0") * 100) })} />
            </div>
            <div><Label className="text-xs">Currency</Label>
              <select value={t.currency} onChange={(e) => update(i, { currency: e.target.value })} className="h-10 w-full rounded-md border bg-background px-2 text-sm">
                {["USD", "INR", "EUR", "GBP", "AED", "SGD"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex items-end pb-1"><Switch checked={t.is_active} onCheckedChange={(v) => update(i, { is_active: v })} /></div>
            <div className="flex items-end pb-1"><Button variant="ghost" size="icon" onClick={() => remove(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
          </Card>
        ))}
      </div>
      {tiers.length > 0 && <Button onClick={save} className="bg-gradient-brand text-primary-foreground">Save all tiers</Button>}
    </div>
  );
}
