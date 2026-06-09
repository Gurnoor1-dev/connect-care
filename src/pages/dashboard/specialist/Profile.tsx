import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Camera, Loader2, Upload, Wifi, WifiOff } from "lucide-react";

const COUNTRIES = [
  ["United States", "🇺🇸"], ["United Kingdom", "🇬🇧"], ["India", "🇮🇳"], ["Canada", "🇨🇦"],
  ["Australia", "🇦🇺"], ["Germany", "🇩🇪"], ["France", "🇫🇷"], ["Singapore", "🇸🇬"],
  ["United Arab Emirates", "🇦🇪"], ["Japan", "🇯🇵"], ["Brazil", "🇧🇷"], ["Spain", "🇪🇸"],
];
const TIMEZONES = Intl.supportedValuesOf?.("timeZone") ?? ["UTC", "America/New_York", "Europe/London", "Asia/Kolkata", "Asia/Tokyo"];

type ProfileState = {
  display_name: string;
  headline: string;
  bio: string;
  country: string;
  country_flag: string;
  timezone: string;
  specialities: string[];
  qualifications: string[];
  is_published: boolean;
  avatar_url: string;
  availability_status: "online" | "offline";
};

const emptyProfile: ProfileState = {
  display_name: "",
  headline: "",
  bio: "",
  country: "",
  country_flag: "",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  specialities: [],
  qualifications: [],
  is_published: false,
  avatar_url: "",
  availability_status: "offline",
};

export default function SpecialistProfile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [p, setP] = useState<ProfileState>(emptyProfile);
  const [specInput, setSpecInput] = useState("");
  const [qualInput, setQualInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase.from("specialist_profiles").select("*").eq("id", user.id).maybeSingle();
      if (error) toast.error(error.message);
      if (data) {
        setP({
          ...emptyProfile,
          ...data,
          avatar_url: data.avatar_url ?? "",
          availability_status: data.availability_status ?? "offline",
          specialities: data.specialities ?? [],
          qualifications: data.qualifications ?? [],
        });
      }
      setLoading(false);
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const payload = {
      id: user.id,
      display_name: p.display_name,
      headline: p.headline,
      bio: p.bio,
      country: p.country,
      country_flag: p.country_flag,
      timezone: p.timezone,
      specialities: p.specialities,
      qualifications: p.qualifications,
      is_published: p.is_published,
      avatar_url: p.avatar_url || null,
      availability_status: p.availability_status,
    };
    const { error } = await supabase.from("specialist_profiles").upsert(payload);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Profile saved");
  };

  const uploadAvatar = async (file?: File) => {
    if (!user || !file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file.");

    setUploadingAvatar(true);
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `${user.id}/avatar-${Date.now()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("specialist-avatars")
      .upload(filePath, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      setUploadingAvatar(false);
      return toast.error(uploadError.message);
    }

    const { data } = supabase.storage.from("specialist-avatars").getPublicUrl(filePath);
    const avatarUrl = data.publicUrl;
    setP((state) => ({ ...state, avatar_url: avatarUrl }));

    await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", user.id);
    const { error } = await supabase
      .from("specialist_profiles")
      .upsert({ id: user.id, avatar_url: avatarUrl, availability_status: p.availability_status });

    setUploadingAvatar(false);
    if (error) toast.error(error.message); else toast.success("Profile photo updated");
  };

  const addArr = (key: "specialities" | "qualifications", value: string, clear: () => void) => {
    const v = value.trim(); if (!v) return;
    setP((s) => ({ ...s, [key]: [...(s[key] ?? []), v] })); clear();
  };
  const rmArr = (key: "specialities" | "qualifications", i: number) =>
    setP((s) => ({ ...s, [key]: s[key].filter((_, j) => j !== i) }));

  if (loading) return <div className="p-8 text-muted-foreground">Loading...</div>;

  const isOnline = p.availability_status === "online";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Your profile</h1>
          <p className="mt-1 text-muted-foreground">This is what customers see on the specialists page.</p>
        </div>
        <Badge variant={isOnline ? "default" : "secondary"} className="w-fit gap-1 capitalize">
          {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {p.availability_status}
        </Badge>
      </header>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="h-fit border-white/55 bg-card/90 p-5 shadow-glow backdrop-blur">
          <div className="flex flex-col items-center text-center">
            <div className="relative h-32 w-32 overflow-visible rounded-lg bg-gradient-vivid p-1 shadow-brand">
              <div className="h-full w-full overflow-hidden rounded-md bg-card">
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt={p.display_name || "Specialist"} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-brand text-4xl font-bold text-primary-foreground">
                    {p.display_name?.[0] ?? <Camera className="h-10 w-10" />}
                  </div>
                )}
              </div>
              {isOnline && <OnlineDot />}
            </div>
            <h2 className="mt-4 text-xl font-semibold">{p.display_name || "Profile photo"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Add a photo and choose how customers see your availability.</p>

            <input
              id="avatar-upload"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="sr-only"
              onChange={(e) => uploadAvatar(e.target.files?.[0])}
            />
            <Button asChild variant="outline" className="mt-4 w-full" disabled={uploadingAvatar}>
              <label htmlFor="avatar-upload" className="cursor-pointer">
                {uploadingAvatar ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Upload photo
              </label>
            </Button>
          </div>

          <div className="mt-6 rounded-lg border bg-gradient-to-br from-accent/70 via-card to-card p-3">
            <Label className="mb-2 block">Status</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setP({ ...p, availability_status: "online" })}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  isOnline ? "bg-emerald-500 text-white shadow-brand" : "bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                Online
              </button>
              <button
                type="button"
                onClick={() => setP({ ...p, availability_status: "offline" })}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  !isOnline ? "bg-muted text-foreground shadow-brand" : "bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                Offline
              </button>
            </div>
          </div>
        </Card>

        <Card className="space-y-5 border-white/55 bg-card/90 p-5 shadow-brand backdrop-blur sm:p-6">
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
                className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
              >
                <option value="">Select...</option>
                {COUNTRIES.map(([n, f]) => <option key={n} value={n}>{f} {n}</option>)}
              </select>
            </Field>
            <Field label="Timezone">
              <select value={p.timezone ?? ""} onChange={(e) => setP({ ...p, timezone: e.target.value })} className="h-10 w-full rounded-lg border bg-background px-3 text-sm">
                {TIMEZONES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
          </div>

          <ChipList label="Specialities" items={p.specialities ?? []} input={specInput} setInput={setSpecInput}
            onAdd={() => addArr("specialities", specInput, () => setSpecInput(""))}
            onRemove={(i) => rmArr("specialities", i)} placeholder="Anxiety, executive coaching..." />
          <ChipList label="Qualifications" items={p.qualifications ?? []} input={qualInput} setInput={setQualInput}
            onAdd={() => addArr("qualifications", qualInput, () => setQualInput(""))}
            onRemove={(i) => rmArr("qualifications", i)} placeholder="PhD Psychology, MBBS..." />

          <div className="flex items-center justify-between gap-4 rounded-lg border bg-gradient-to-br from-accent/70 via-card to-card p-4">
            <div>
              <div className="font-medium">Publish profile</div>
              <div className="text-xs text-muted-foreground">When on, customers can find and book you.</div>
            </div>
            <Switch checked={!!p.is_published} onCheckedChange={(v) => setP({ ...p, is_published: v })} />
          </div>

          <Button onClick={save} disabled={saving} className="bg-gradient-brand text-primary-foreground shadow-brand">
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving</> : "Save profile"}
          </Button>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div><Label className="mb-2 block">{label}</Label>{children}</div>;
}
function ChipList({ label, items, input, setInput, onAdd, onRemove, placeholder }: {
  label: string; items: string[]; input: string; setInput: (s: string) => void;
  onAdd: () => void; onRemove: (i: number) => void; placeholder: string;
}) {
  return (
    <div>
      <Label className="mb-2 block">{label}</Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input placeholder={placeholder} value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAdd(); } }} />
        <Button type="button" onClick={onAdd} variant="outline">Add</Button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {items.map((it: string, i: number) => (
          <span key={i} className="inline-flex items-center gap-1 rounded-lg bg-secondary px-3 py-1 text-xs">
            {it}
            <button onClick={() => onRemove(i)} className="text-muted-foreground hover:text-foreground" aria-label={`Remove ${it}`}>x</button>
          </span>
        ))}
      </div>
    </div>
  );
}

function OnlineDot() {
  return (
    <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-emerald-500 shadow-glow">
      <span className="absolute h-4 w-4 animate-ping rounded-full bg-emerald-300 opacity-70" />
      <span className="relative h-3.5 w-3.5 rounded-full bg-emerald-300" />
    </span>
  );
}
