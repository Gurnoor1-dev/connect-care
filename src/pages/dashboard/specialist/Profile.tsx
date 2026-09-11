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
import { Camera, Clock3, Loader2, Plus, Trash2, Upload, Wifi, WifiOff, Zap } from "lucide-react";

const COUNTRIES = [
  ["United States", "ðŸ‡ºðŸ‡¸"], ["United Kingdom", "ðŸ‡¬ðŸ‡§"], ["India", "ðŸ‡®ðŸ‡³"], ["Canada", "ðŸ‡¨ðŸ‡¦"],
  ["Australia", "ðŸ‡¦ðŸ‡º"], ["Germany", "ðŸ‡©ðŸ‡ª"], ["France", "ðŸ‡«ðŸ‡·"], ["Singapore", "ðŸ‡¸ðŸ‡¬"],
  ["United Arab Emirates", "ðŸ‡¦ðŸ‡ª"], ["Japan", "ðŸ‡¯ðŸ‡µ"], ["Brazil", "ðŸ‡§ðŸ‡·"], ["Spain", "ðŸ‡ªðŸ‡¸"],
];
const TIMEZONES = Intl.supportedValuesOf?.("timeZone") ?? ["UTC", "America/New_York", "Europe/London", "Asia/Kolkata", "Asia/Tokyo"];

type ProfileState = {
  display_name: string; headline: string; bio: string; country: string; country_flag: string; timezone: string;
  specialities: string[]; qualifications: string[]; is_published: boolean; avatar_url: string;
  availability_status: "online" | "offline"; immediate_sessions: boolean;
};
type OfflinePeriod = { id?: string; start_time: string; end_time: string; is_active: boolean; };

const emptyProfile: ProfileState = {
  display_name: "", headline: "", bio: "", country: "", country_flag: "",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, specialities: [], qualifications: [],
  is_published: false, avatar_url: "", availability_status: "offline", immediate_sessions: false,
};

export default function SpecialistProfile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [p, setP] = useState<ProfileState>(emptyProfile);
  const [offlinePeriods, setOfflinePeriods] = useState<OfflinePeriod[]>([]);
  const [specInput, setSpecInput] = useState("");
  const [qualInput, setQualInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data, error }, { data: periods, error: periodsError }] = await Promise.all([
        supabase.from("specialist_profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("specialist_offline_periods").select("id,start_time,end_time,is_active").eq("specialist_id", user.id).order("start_time"),
      ]);
      if (error) toast.error(error.message);
      if (periodsError) toast.error(periodsError.message);
      if (data) setP({
        ...emptyProfile, ...data, avatar_url: data.avatar_url ?? "",
        availability_status: data.availability_status ?? "offline",
        immediate_sessions: !!data.immediate_sessions,
        specialities: data.specialities ?? [], qualifications: data.qualifications ?? [],
      });
      setOfflinePeriods((periods ?? []) as OfflinePeriod[]);
      setLoading(false);
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    for (const period of offlinePeriods) {
      if (!period.start_time || !period.end_time || period.start_time.slice(0, 5) === period.end_time.slice(0, 5)) {
        toast.error("Each offline period must have different start and end times.");
        return;
      }
    }
    setSaving(true);
    const { error: profileError } = await supabase.from("specialist_profiles").upsert({
      id: user.id, display_name: p.display_name, headline: p.headline, bio: p.bio,
      country: p.country, country_flag: p.country_flag, timezone: p.timezone,
      specialities: p.specialities, qualifications: p.qualifications,
      is_published: p.is_published, avatar_url: p.avatar_url || null,
      availability_status: p.availability_status, immediate_sessions: p.immediate_sessions,
    });
    if (profileError) { setSaving(false); toast.error(profileError.message); return; }

    const unsaved = offlinePeriods.filter((period) => !period.id);
    if (unsaved.length) {
      const { data: inserted, error } = await supabase.from("specialist_offline_periods").insert(
        unsaved.map((period) => ({ specialist_id: user.id, start_time: period.start_time, end_time: period.end_time, is_active: period.is_active }))
      ).select("id,start_time,end_time,is_active");
      if (error) { setSaving(false); toast.error(error.message); return; }
      if (inserted) setOfflinePeriods((current) => [...current.filter((period) => period.id), ...(inserted as OfflinePeriod[])]);
    }

    for (const period of offlinePeriods.filter((item) => item.id)) {
      const { error } = await supabase.from("specialist_offline_periods").update({
        start_time: period.start_time, end_time: period.end_time, is_active: period.is_active,
      }).eq("id", period.id).eq("specialist_id", user.id);
      if (error) { setSaving(false); toast.error(error.message); return; }
    }
    setSaving(false);
    toast.success("Profile and availability settings saved");
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
    const { error } = await supabase.from("specialist_profiles").upsert({
      id: user.id, avatar_url: avatarUrl, availability_status: p.availability_status, immediate_sessions: p.immediate_sessions,
    });
    setUploadingAvatar(false);
    if (error) toast.error(error.message); else toast.success("Profile photo updated");
  };

  const addOfflinePeriod = () => setOfflinePeriods((current) => [...current, { start_time: "17:30", end_time: "23:30", is_active: true }]);

  const updateOfflinePeriod = (index: number, patch: Partial<OfflinePeriod>) =>
    setOfflinePeriods((current) => current.map((period, i) => i === index ? { ...period, ...patch } : period));

  const removeOfflinePeriod = async (index: number) => {
    const period = offlinePeriods[index];
    if (!period) return;
    if (period.id && user) {
      const { error } = await supabase.from("specialist_offline_periods").delete().eq("id", period.id).eq("specialist_id", user.id);
      if (error) { toast.error(error.message); return; }
    }
    setOfflinePeriods((current) => current.filter((_, i) => i !== index));
    toast.success("Offline period removed");
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
  const isOnline = p.availability_status === "online";

  return <div className="mx-auto max-w-5xl space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><h1 className="text-3xl font-bold">Your profile</h1><p className="mt-1 text-muted-foreground">This is what customers see on the specialists page.</p></div>
      <Badge variant={isOnline ? "default" : "secondary"} className="w-fit gap-1 capitalize">{isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}{p.availability_status}</Badge>
    </header>

    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <Card className="h-fit border-white/55 bg-card/90 p-5 shadow-glow backdrop-blur">
        <div className="flex flex-col items-center text-center">
          <div className="relative h-32 w-32 overflow-visible rounded-lg bg-gradient-vivid p-1 shadow-brand"><div className="h-full w-full overflow-hidden rounded-md bg-card">
            {p.avatar_url ? <img src={p.avatar_url} alt={p.display_name || "Specialist"} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center bg-gradient-brand text-4xl font-bold text-primary-foreground">{p.display_name?.[0] ?? <Camera className="h-10 w-10" />}</div>}
          </div>{isOnline && <OnlineDot />}</div>
          <h2 className="mt-4 text-xl font-semibold">{p.display_name || "Profile photo"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Add a photo and choose how customers see your availability.</p>
          <input id="avatar-upload" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={(event) => uploadAvatar(event.target.files?.[0])} />
          <Button asChild variant="outline" className="mt-4 w-full" disabled={uploadingAvatar}><label htmlFor="avatar-upload" className="cursor-pointer">{uploadingAvatar ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Upload photo</label></Button>
        </div>
        <div className="mt-6 rounded-lg border bg-gradient-to-br from-accent/70 via-card to-card p-3"><Label className="mb-2 block">Status</Label><div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setP({ ...p, availability_status: "online" })} className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${isOnline ? "bg-emerald-500 text-white shadow-brand" : "bg-card text-muted-foreground hover:text-foreground"}`}>Online</button>
          <button type="button" onClick={() => setP({ ...p, availability_status: "offline" })} className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${!isOnline ? "bg-muted text-foreground shadow-brand" : "bg-card text-muted-foreground hover:text-foreground"}`}>Offline</button>
        </div></div>
      </Card>

      <div className="space-y-6">
        <Card className="space-y-5 border-white/55 bg-card/90 p-5 shadow-brand backdrop-blur sm:p-6">
          <div><div className="flex items-center gap-2"><Zap className="h-5 w-5 text-primary" /><h2 className="text-lg font-semibold">Immediate Sessions</h2></div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Allow customers to book same-day sessions without the normal 5-hour wait. When enabled, the earliest same-day booking is 5 minutes from the current time.</p></div>
          <div className="flex items-center justify-between gap-4 rounded-2xl border bg-gradient-to-br from-accent/70 via-card to-card p-4"><div className="min-w-0"><div className="font-medium">{p.immediate_sessions ? "Immediate booking is ON" : "Immediate booking is OFF"}</div><div className="mt-1 text-xs leading-5 text-muted-foreground">Customers can only book you when your profile is published and you are online.</div></div><Switch checked={p.immediate_sessions} onCheckedChange={(value) => setP({ ...p, immediate_sessions: value })} /></div>
        </Card>

        <Card className="space-y-5 border-white/55 bg-card/90 p-5 shadow-brand backdrop-blur sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><Clock3 className="h-5 w-5 text-teal" /><h2 className="text-lg font-semibold">Offline for time</h2></div><p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">Add recurring daily periods when customers cannot book you. Multiple periods and overnight periods such as 11:00 PM â†’ 2:00 AM are supported.</p></div><Button type="button" variant="outline" onClick={addOfflinePeriod} className="shrink-0"><Plus className="mr-2 h-4 w-4" />Add period</Button></div>
          {offlinePeriods.length === 0 ? <div className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">No offline periods configured. Customers can book during your normal availability schedule.</div> : <div className="space-y-3">{offlinePeriods.map((period, index) => <div key={period.id ?? `new-${index}`} className="rounded-2xl border bg-background p-4"><div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
            <Field label="Start time"><Input type="time" value={period.start_time.slice(0, 5)} onChange={(event) => updateOfflinePeriod(index, { start_time: event.target.value })} /></Field>
            <Field label="End time"><Input type="time" value={period.end_time.slice(0, 5)} onChange={(event) => updateOfflinePeriod(index, { end_time: event.target.value })} /></Field>
            <div className="flex items-center gap-3 rounded-xl border px-3 py-2.5"><Switch checked={period.is_active} onCheckedChange={(value) => updateOfflinePeriod(index, { is_active: value })} /><span className="text-sm font-medium">Active</span></div>
            <Button type="button" variant="outline" size="icon" onClick={() => removeOfflinePeriod(index)} aria-label="Remove offline period" className="shrink-0"><Trash2 className="h-4 w-4" /></Button>
          </div><div className="mt-3 text-xs text-muted-foreground">{period.start_time.slice(0, 5) === period.end_time.slice(0, 5) ? "Start and end time must be different." : "This period repeats each day while Active is enabled."}</div></div>)}</div>}
        </Card>

        <Card className="space-y-5 border-white/55 bg-card/90 p-5 shadow-brand backdrop-blur sm:p-6">
          <div className="grid gap-5 sm:grid-cols-2"><Field label="Display name"><Input value={p.display_name ?? ""} onChange={(event) => setP({ ...p, display_name: event.target.value })} /></Field><Field label="Headline"><Input placeholder="e.g. Performance psychologist" value={p.headline ?? ""} onChange={(event) => setP({ ...p, headline: event.target.value })} /></Field></div>
          <Field label="Bio"><Textarea rows={4} value={p.bio ?? ""} onChange={(event) => setP({ ...p, bio: event.target.value })} /></Field>
          <div className="grid gap-5 sm:grid-cols-2"><Field label="Country"><select value={p.country ?? ""} onChange={(event) => { const country = COUNTRIES.find(([name]) => name === event.target.value); setP({ ...p, country: event.target.value, country_flag: country?.[1] ?? "" }); }} className="h-10 w-full rounded-lg border bg-background px-3 text-sm"><option value="">Select...</option>{COUNTRIES.map(([name, flag]) => <option key={name} value={name}>{flag} {name}</option>)}</select></Field><Field label="Timezone"><select value={p.timezone ?? ""} onChange={(event) => setP({ ...p, timezone: event.target.value })} className="h-10 w-full rounded-lg border bg-background px-3 text-sm">{TIMEZONES.map((timezone) => <option key={timezone} value={timezone}>{timezone}</option>)}</select></Field></div>
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
