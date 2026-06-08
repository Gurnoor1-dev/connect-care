import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const COUNTRIES = [
  ["United States", "🇺🇸"], ["United Kingdom", "🇬🇧"], ["India", "🇮🇳"], ["Canada", "🇨🇦"],
  ["Australia", "🇦🇺"], ["Germany", "🇩🇪"], ["France", "🇫🇷"], ["Singapore", "🇸🇬"],
  ["United Arab Emirates", "🇦🇪"], ["Japan", "🇯🇵"], ["Brazil", "🇧🇷"], ["Spain", "🇪🇸"],
];
const TIMEZONES = Intl.supportedValuesOf?.("timeZone") ?? ["UTC", "America/New_York", "Europe/London", "Asia/Kolkata", "Asia/Tokyo"];

export default function SpecialistProfile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [p, setP] = useState<any>({
    display_name: "", headline: "", bio: "", country: "", country_flag: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    specialities: [] as string[], qualifications: [] as string[], is_published: false,
  });
  const [specInput, setSpecInput] = useState("");
  const [qualInput, setQualInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("specialist_profiles").select("*").eq("id", user.id).maybeSingle();
      if (data) setP({ ...p, ...data });
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("specialist_profiles").upsert({ id: user.id, ...p });
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Profile saved");
  };

  const addArr = (key: "specialities" | "qualifications", value: string, clear: () => void) => {
    const v = value.trim(); if (!v) return;
    setP((s: any) => ({ ...s, [key]: [...(s[key] ?? []), v] })); clear();
  };
  const rmArr = (key: "specialities" | "qualifications", i: number) =>
    setP((s: any) => ({ ...s, [key]: s[key].filter((_: any, j: number) => j !== i) }));

  if (loading) return <div className="p-8 text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Your profile</h1>
        <p className="mt-1 text-muted-foreground">This is what customers see.</p>
      </header>

      <Card className="space-y-5 p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Display name"><Input value={p.display_name ?? ""} onChange={(e) => setP({ ...p, display_name: e.target.value })} /></Field>
          <Field label="Headline"><Input placeholder="e.g. Performance psychologist" value={p.headline ?? ""} onChange={(e) => setP({ ...p, headline: e.target.value })} /></Field>
        </div>
        <Field label="Bio"><Textarea rows={4} value={p.bio ?? ""} onChange={(e) => setP({ ...p, bio: e.target.value })} /></Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Country">
            <select
              value={p.country ?? ""}
              onChange={(e) => {
                const c = COUNTRIES.find(([n]) => n === e.target.value);
                setP({ ...p, country: e.target.value, country_flag: c?.[1] ?? "" });
              }}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">Select…</option>
              {COUNTRIES.map(([n, f]) => <option key={n} value={n}>{f} {n}</option>)}
            </select>
          </Field>
          <Field label="Timezone">
            <select value={p.timezone ?? ""} onChange={(e) => setP({ ...p, timezone: e.target.value })} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
              {TIMEZONES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
        </div>

        <ChipList label="Specialities" items={p.specialities ?? []} input={specInput} setInput={setSpecInput}
          onAdd={() => addArr("specialities", specInput, () => setSpecInput(""))}
          onRemove={(i) => rmArr("specialities", i)} placeholder="Anxiety, executive coaching…" />
        <ChipList label="Qualifications" items={p.qualifications ?? []} input={qualInput} setInput={setQualInput}
          onAdd={() => addArr("qualifications", qualInput, () => setQualInput(""))}
          onRemove={(i) => rmArr("qualifications", i)} placeholder="PhD Psychology, MBBS…" />

        <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
          <div>
            <div className="font-medium">Publish profile</div>
            <div className="text-xs text-muted-foreground">When on, customers can find and book you.</div>
          </div>
          <Switch checked={!!p.is_published} onCheckedChange={(v) => setP({ ...p, is_published: v })} />
        </div>

        <Button onClick={save} disabled={saving} className="bg-gradient-brand text-primary-foreground">
          {saving ? "Saving…" : "Save profile"}
        </Button>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="mb-2 block">{label}</Label>{children}</div>;
}
function ChipList({ label, items, input, setInput, onAdd, onRemove, placeholder }: {
  label: string; items: string[]; input: string; setInput: (s: string) => void;
  onAdd: () => void; onRemove: (i: number) => void; placeholder: string;
}) {
  return (
    <div>
      <Label className="mb-2 block">{label}</Label>
      <div className="flex gap-2">
        <Input placeholder={placeholder} value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAdd(); } }} />
        <Button type="button" onClick={onAdd} variant="outline">Add</Button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {items.map((it: string, i: number) => (
          <span key={i} className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs">
            {it}
            <button onClick={() => onRemove(i)} className="text-muted-foreground hover:text-foreground">×</button>
          </span>
        ))}
      </div>
    </div>
  );
}
