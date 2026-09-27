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
import { Camera, Loader2, Upload, Zap } from "lucide-react";
import { getDeviceTimeZone, getTimeZoneLabel } from "@/lib/timezone";

const COUNTRIES = [
  ["United States", "ðŸ‡ºðŸ‡¸"], ["United Kingdom", "ðŸ‡¬ðŸ‡§"], ["India", "ðŸ‡®ðŸ‡³"], ["Canada", "ðŸ‡¨ðŸ‡¦"],
  ["Australia", "ðŸ‡¦ðŸ‡º"], ["Germany", "ðŸ‡©ðŸ‡ª"], ["France", "ðŸ‡«ðŸ‡·"], ["Singapore", "ðŸ‡¸ðŸ‡¬"],
  ["United Arab Emirates", "ðŸ‡¦ðŸ‡ª"], ["Japan", "ðŸ‡¯ðŸ‡µ"], ["Brazil", "ðŸ‡§ðŸ‡·"], ["Spain", "ðŸ‡ªðŸ‡¸"],
];
const TIMEZONES = Intl.supportedValuesOf?.("timeZone") ?? ["UTC", "America/New_York", "Europe/London", "Asia/Kolkata", "Asia/Tokyo"];

type ProfileState = {
  display_name: string; headline: string; bio: string; country: string; country_flag: string; timezone: string;
  specialities: string[]; qualifications: string[]; is_published: boolean; avatar_url: string;
  immediate_sessions: boolean;
};

const emptyProfile: ProfileState = {
  display_name: "", headline: "", bio: "", country: "", country_flag: "",
  timezone: getDeviceTimeZone(), specialities: [], qualifications: [],
  is_published: false, avatar_url: "", immediate_sessions: false,
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
      const [{ data, error }, { data: periods, error: periodsError }] = await Promise.all([
        supabase.from("specialist_profiles").select("*").eq("id", user.id).maybeSingle(),
        Promise.resolve({ data: [], error: null }),
      ]);
      if (error) toast.error(error.message);
      if (data) setP({
        ...emptyProfile, ...data, avatar_url: data.avatar_url ?? "",
        immediate_sessions: !!data.immediate_sessions,
        specialities: data.specialities ?? [], qualifications: data.qualifications ?? [],
      });
      setLoading(false);
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const profileValues = {
      display_name: p.display_name, headline: p.headline, bio: p.bio,
      country: p.country, country_flag: p.country_flag, timezone: p.timezone,
      specialities: p.specialities, qualifications: p.qualifications,
      is_published: p.is_published, avatar_url: p.avatar_url || null,
      immediate_sessions: p.immediate_sessions,
    };

    const { data: updatedProfile, error: profileError } = await supabase
      .from("specialist_profiles")
      .update(profileValues)
      .eq("id", user.id)
      .select("id")
      .maybeSingle();

    if (profileError) { setSaving(false); toast.error(profileError.message); return; }

    if (!updatedProfile) {
      const { error: insertError } = await supabase
        .from("specialist_profiles")
        .insert({ id: user.id, ...profileValues });
      if (insertError) { setSaving(false); toast.error(insertError.message); return; }
    }

    setSaving(false);
    toast.success("Profile saved");
  };

  const uploadAvatar = async (file?: File) => {
    if (!user || !file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file.");
    setUploadingAvatar(true);
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `${user.id}/avatar-${Date.now()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("specialist-avatars").upload(filePath, file, { upsert: true, contentType: file.type });
    if (uploadError) { setUploadingAvatar(false); return toast.error(uploadError.message); }
    const { data } = supabase.storage.from("specialist-avatars").getPublicUrl(filePath);
    const avatarUrl = data.publicUrl;
    setP((state) => ({ ...state, avatar_url: avatarUrl }));
    await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", user.id);
    const { data: updatedProfile, error: updateError } = await supabase
      .from("specialist_profiles")
      .update({ avatar_url: avatarUrl, immediate_sessions: p.immediate_sessions })
      .eq("id", user.id)
      .select("id")
      .maybeSingle();

    let error = updateError;
    if (!error && !updatedProfile) {
      const { error: insertError } = await supabase
        .from("specialist_profiles")
        .insert({
          id: user.id,
          avatar_url: avatarUrl,
          immediate_sessions: p.immediate_sessions,
        });
      error = insertError;
    }
    setUploadingAvatar(false);
    if (error) toast.error(error.message); else toast.success("Profile photo updated");
  };

  const addArr = (key: "specialities" | "qualifications", value: string, clear: () => void) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setP((state) => ({ ...state, [key]: [...(state[key] ?? []), trimmed] }));
    clear();
  };

  const rmArr = (key: "specialities" | "qualifications", index: number) =>
    setP((state) => ({ ...state, [key]: state[key].filter((_, i) => i !== index) }));

  if (loading) return <div className="p-8 text-muted-foreground">Loading...</div>;

  return <div className="mx-auto max-w-5xl space-y-6">
    <header>
      <div><h1 className="text-3xl font-bold">Your profile</h1><p className="mt-1 text-muted-foreground">This is what customers see on the specialists page.</p></div>
    </header>

    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <Card className="h-fit border-white/55 bg-card/90 p-5 shadow-glow backdrop-blur">
        <div className="flex flex-col items-center text-center">
          <div className="relative h-32 w-32 overflow-visible rounded-lg bg-gradient-vivid p-1 shadow-brand"><div className="h-full w-full overflow-hidden rounded-md bg-card">
            {p.avatar_url ? <img src={p.avatar_url} alt={p.display_name || "Specialist"} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center bg-gradient-brand text-4xl font-bold text-primary-foreground">{p.display_name?.[0] ?? <Camera className="h-10 w-10" />}</div>}
          </div></div>
          <h2 className="mt-4 text-xl font-semibold">{p.display_name || "Profile photo"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Add a photo and set your profile and availability schedule.</p>
          <input id="avatar-upload" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={(event) => uploadAvatar(event.target.files?.[0])} />
          <Button asChild variant="outline" className="mt-4 w-full" disabled={uploadingAvatar}><label htmlFor="avatar-upload" className="cursor-pointer">{uploadingAvatar ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Upload photo</label></Button>
        </div>
      </Card>

      <div className="space-y-6">
        <Card className="space-y-5 border-white/55 bg-card/90 p-5 shadow-brand backdrop-blur sm:p-6">
          <div><div className="flex items-center gap-2"><Zap className="h-5 w-5 text-primary" /><h2 className="text-lg font-semibold">Immediate Sessions</h2></div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Allow customers to book same-day sessions without the normal 5-hour wait. When enabled, the earliest same-day booking is 5 minutes from the current time.</p></div>
          <div className="flex items-center justify-between gap-4 rounded-2xl border bg-gradient-to-br from-accent/70 via-card to-card p-4"><div className="min-w-0"><div className="font-medium">{p.immediate_sessions ? "Immediate booking is ON" : "Immediate booking is OFF"}</div><div className="mt-1 text-xs leading-5 text-muted-foreground">Customers can book you only during the availability you set in the Availability section.</div></div><Switch checked={p.immediate_sessions} onCheckedChange={(value) => setP({ ...p, immediate_sessions: value })} /></div>
        </Card>

        <Card className="space-y-5 border-white/55 bg-card/90 p-5 shadow-brand backdrop-blur sm:p-6">
          <div className="grid gap-5 sm:grid-cols-2"><Field label="Display name"><Input value={p.display_name ?? ""} onChange={(event) => setP({ ...p, display_name: event.target.value })} /></Field><Field label="Headline"><Input placeholder="e.g. Performance psychologist" value={p.headline ?? ""} onChange={(event) => setP({ ...p, headline: event.target.value })} /></Field></div>
          <Field label="Bio"><Textarea rows={4} value={p.bio ?? ""} onChange={(event) => setP({ ...p, bio: event.target.value })} /></Field>
          <div className="mb-4 rounded-2xl border bg-accent/40 p-4 text-sm leading-6 text-muted-foreground"><span className="font-semibold text-foreground">Timezone notice:</span> Your device timezone ({getTimeZoneLabel(getDeviceTimeZone())}) is used as the default. Schedule times are saved in your selected specialist timezone and converted for clients.</div><div className="grid gap-5 sm:grid-cols-2"><Field label="Country"><select value={p.country ?? ""} onChange={(event) => { const country = COUNTRIES.find(([name]) => name === event.target.value); setP({ ...p, country: event.target.value, country_flag: country?.[1] ?? "" }); }} className="h-10 w-full rounded-lg border bg-background px-3 text-sm"><option value="">Select...</option>{COUNTRIES.map(([name, flag]) => <option key={name} value={name}>{flag} {name}</option>)}</select></Field><Field label="Timezone"><select value={p.timezone ?? ""} onChange={(event) => setP({ ...p, timezone: event.target.value })} className="h-10 w-full rounded-lg border bg-background px-3 text-sm">{TIMEZONES.map((timezone) => <option key={timezone} value={timezone}>{getTimeZoneLabel(timezone)}</option>)}</select></Field></div>
          <ChipList label="Specialities" items={p.specialities ?? []} input={specInput} setInput={setSpecInput} onAdd={() => addArr("specialities", specInput, () => setSpecInput(""))} onRemove={(index) => rmArr("specialities", index)} placeholder="Anxiety, executive coaching..." />
          <ChipList label="Qualifications" items={p.qualifications ?? []} input={qualInput} setInput={setQualInput} onAdd={() => addArr("qualifications", qualInput, () => setQualInput(""))} onRemove={(index) => rmArr("qualifications", index)} placeholder="PhD Psychology, MBBS..." />
          <div className="flex items-center justify-between gap-4 rounded-lg border bg-gradient-to-br from-accent/70 via-card to-card p-4"><div><div className="font-medium">Publish profile</div><div className="text-xs text-muted-foreground">When on, customers can find and book you.</div></div><Switch checked={!!p.is_published} onCheckedChange={(value) => setP({ ...p, is_published: value })} /></div>
          <Button onClick={save} disabled={saving} className="bg-gradient-brand text-primary-foreground shadow-brand">{saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving</> : "Save profile"}</Button>
        </Card>
      </div>
    </div>
  </div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div><Label className="mb-2 block">{label}</Label>{children}</div>;
}

function ChipList({ label, items, input, setInput, onAdd, onRemove, placeholder }: {
  label: string; items: string[]; input: string; setInput: (value: string) => void; onAdd: () => void; onRemove: (index: number) => void; placeholder: string;
}) {
  return <div><Label className="mb-2 block">{label}</Label><div className="flex flex-col gap-2 sm:flex-row"><Input placeholder={placeholder} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); onAdd(); } }} /><Button type="button" onClick={onAdd} variant="outline">Add</Button></div><div className="mt-2 flex flex-wrap gap-1.5">{items.map((item, index) => <span key={`${item}-${index}`} className="inline-flex items-center gap-1 rounded-lg bg-secondary px-3 py-1 text-xs">{item}<button type="button" onClick={() => onRemove(index)} className="text-muted-foreground hover:text-foreground" aria-label={`Remove ${item}`}>x</button></span>)}</div></div>;
}

function OnlineDot() {
  return <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-emerald-500 shadow-glow"><span className="absolute h-4 w-4 animate-ping rounded-full bg-emerald-300 opacity-70" /><span className="relative h-3.5 w-3.5 rounded-full bg-emerald-300" /></span>;
}
