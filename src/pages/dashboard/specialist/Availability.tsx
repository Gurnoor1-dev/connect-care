import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Slot { id?: string; day_of_week: number; start_time: string; end_time: string; is_active: boolean; }

export default function SpecialistAvailability() {
  const { user } = useAuth();
  const [slots, setSlots] = useState<Slot[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("specialist_availability")
      .select("*")
      .eq("specialist_id", user.id)
      .order("day_of_week", { ascending: true });
    setSlots(data ?? []);
  };
  useEffect(() => { load(); /* eslint-disable-line */ }, [user]);

  const addDay = (d: number) => setSlots([...slots, { day_of_week: d, start_time: "09:00", end_time: "17:00", is_active: true }]);
  const update = (i: number, p: Partial<Slot>) => setSlots(slots.map((s, j) => j === i ? { ...s, ...p } : s));
  const remove = async (i: number) => {
    const s = slots[i]; if (s.id) await supabase.from("specialist_availability").delete().eq("id", s.id);
    setSlots(slots.filter((_, j) => j !== i));
  };
  const save = async () => {
    if (!user) return;
    const { error } = await supabase.from("specialist_availability").upsert(slots.map((s) => ({ ...s, specialist_id: user.id })));
    if (error) toast.error(error.message); else { toast.success("Availability saved"); load(); }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Availability</h1>
        <p className="mt-1 text-muted-foreground">Weekly recurring slots in your timezone.</p>
      </header>
      <div className="flex flex-wrap gap-2">
        {DAYS.map((d, i) => (
          <Button key={d} variant="outline" size="sm" onClick={() => addDay(i)}>+ {d}</Button>
        ))}
      </div>
      <div className="space-y-3">
        {slots.map((s, i) => (
          <Card key={i} className="grid grid-cols-[80px_1fr_1fr_auto_auto] items-center gap-3 p-4">
            <div className="font-medium">{DAYS[s.day_of_week]}</div>
            <Input type="time" value={s.start_time} onChange={(e) => update(i, { start_time: e.target.value })} />
            <Input type="time" value={s.end_time} onChange={(e) => update(i, { end_time: e.target.value })} />
            <Switch checked={s.is_active} onCheckedChange={(v) => update(i, { is_active: v })} />
            <Button variant="ghost" size="sm" onClick={() => remove(i)}>Remove</Button>
          </Card>
        ))}
      </div>
      {slots.length > 0 && <Button onClick={save} className="bg-gradient-brand text-primary-foreground">Save availability</Button>}
    </div>
  );
}
