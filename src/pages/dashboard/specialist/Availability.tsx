import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getDeviceTimeZone, getTimeZoneLabel } from "@/lib/timezone";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Slot {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export default function SpecialistAvailability() {
  const { user } = useAuth();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [timeZone, setTimeZone] = useState(getDeviceTimeZone());

  const load = async () => {
    if (!user) return;

    const { data: profile } = await supabase
      .from("specialist_profiles")
      .select("timezone")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.timezone) setTimeZone(profile.timezone);

    const { data, error } = await supabase
      .from("specialist_availability")
      .select("id, day_of_week, start_time, end_time, is_active")
      .eq("specialist_id", user.id)
      .order("day_of_week", { ascending: true });

    if (error) {
      toast.error(error.message);
      return;
    }

    setSlots(data ?? []);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const addDay = (dayOfWeek: number) =>
    setSlots((current) => [
      ...current,
      {
        day_of_week: dayOfWeek,
        start_time: "09:00",
        end_time: "17:00",
        is_active: true,
      },
    ]);

  const update = (index: number, patch: Partial<Slot>) =>
    setSlots((current) =>
      current.map((slot, slotIndex) =>
        slotIndex === index ? { ...slot, ...patch } : slot
      )
    );

  const remove = async (index: number) => {
    const slot = slots[index];

    if (slot?.id) {
      const { error } = await supabase
        .from("specialist_availability")
        .delete()
        .eq("id", slot.id);

      if (error) {
        toast.error(error.message);
        return;
      }
    }

    setSlots((current) => current.filter((_, slotIndex) => slotIndex !== index));
  };

  const save = async () => {
    if (!user) return;

    const existingSlots = slots.filter((slot) => Boolean(slot.id));
    const newSlots = slots.filter((slot) => !slot.id);

    const updates = existingSlots.map(({ id, day_of_week, start_time, end_time, is_active }) => ({
      id,
      specialist_id: user.id,
      day_of_week,
      start_time,
      end_time,
      is_active,
    }));

    const inserts = newSlots.map(({ day_of_week, start_time, end_time, is_active }) => ({
      specialist_id: user.id,
      day_of_week,
      start_time,
      end_time,
      is_active,
    }));

    const { error: updateError } = updates.length
      ? await supabase.from("specialist_availability").upsert(updates)
      : { error: null };

    if (updateError) {
      toast.error(updateError.message);
      return;
    }

    const { error: insertError } = inserts.length
      ? await supabase.from("specialist_availability").insert(inserts)
      : { error: null };

    if (insertError) {
      toast.error(insertError.message);
      return;
    }

    toast.success("Availability saved");
    await load();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Availability</h1>
        <p className="mt-1 text-muted-foreground">
          Weekly recurring slots in your specialist timezone ({getTimeZoneLabel(timeZone)}).
        </p>
        <div className="mt-3 rounded-2xl border bg-accent/40 p-4 text-sm leading-6 text-muted-foreground">
          <span className="font-semibold text-foreground">Timezone notice:</span>{" "}
          Your device timezone ({getTimeZoneLabel(getDeviceTimeZone())}) is shown here.
          Availability times are saved in your selected specialist timezone, and clients
          see the converted time in their own device timezone.
        </div>
      </header>

      <div className="rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground">
        Add one or more recurring time ranges for each day. Customers will only see slots
        that fall inside an active range for the selected day.
      </div>

      <div className="flex flex-wrap gap-2">
        {DAYS.map((day, index) => (
          <Button key={day} variant="outline" size="sm" onClick={() => addDay(index)}>
            + {day}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {slots.map((slot, index) => (
          <Card
            key={slot.id ?? `new-${slot.day_of_week}-${index}`}
            className="grid gap-3 p-4 sm:grid-cols-[80px_minmax(0,1fr)_minmax(0,1fr)_auto_auto] sm:items-center"
          >
            <div className="font-medium">{DAYS[slot.day_of_week]}</div>

            <label className="min-w-0">
              <span className="mb-1 block text-xs text-muted-foreground sm:sr-only">Start time</span>
              <Input
                type="time"
                value={slot.start_time}
                onChange={(event) => update(index, { start_time: event.target.value })}
                className="w-full min-w-0"
              />
            </label>

            <label className="min-w-0">
              <span className="mb-1 block text-xs text-muted-foreground sm:sr-only">End time</span>
              <Input
                type="time"
                value={slot.end_time}
                onChange={(event) => update(index, { end_time: event.target.value })}
                className="w-full min-w-0"
              />
            </label>

            <div className="flex items-center gap-2">
              <Switch
                checked={slot.is_active}
                onCheckedChange={(value) => update(index, { is_active: value })}
              />
              <span className="text-sm text-muted-foreground">Active</span>
            </div>

            <Button variant="ghost" size="sm" onClick={() => remove(index)}>
              Remove
            </Button>
          </Card>
        ))}
      </div>

      {slots.length > 0 && (
        <Button onClick={save} className="bg-gradient-brand text-primary-foreground">
          Save availability
        </Button>
      )}
    </div>
  );
}
