import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getDeviceTimeZone, getTimeZoneLabel } from "@/lib/timezone";

function dayOfWeekFromDate(value: string) {
  return new Date(value + "T12:00:00Z").getUTCDay();
}

function normalizeTime(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return value;
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function is24HourTime(value: string) {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

interface Slot {
  id?: string;
  available_date: string;
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
      .select("id, available_date, day_of_week, start_time, end_time, is_active")
      .eq("specialist_id", user.id)
      .order("day_of_week", { ascending: true });

    if (error) {
      toast.error(error.message);
      return;
    }

    setSlots((data ?? []).filter((slot) => Boolean(slot.available_date)));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const [selectedDateToAdd, setSelectedDateToAdd] = useState("");

  const dateOptions = useMemo(() => {
    const today = new Date();
    return {
      min: format(today, "yyyy-MM-dd"),
      max: format(new Date(today.getFullYear() + 1, 11, 31), "yyyy-MM-dd"),
    };
  }, []);

  const addDate = () => {
    if (!selectedDateToAdd) {
      toast.error("Select a date first.");
      return;
    }
    const day = dayOfWeekFromDate(selectedDateToAdd);
    setSlots((current) => [
      ...current,
      {
        available_date: selectedDateToAdd,
        day_of_week: day,
        start_time: "09:00",
        end_time: "17:00",
        is_active: true,
      },
    ]);
    setSelectedDateToAdd("");
  };

  const update = (index: number, patch: Partial<Slot>) =>
    setSlots((current) =>
      current.map((slot, slotIndex) =>
        slotIndex === index ? { ...slot, ...patch } : slot
      )
    );

  const updateDate = (index: number, value: string) => {
    if (!value) return;
    update(index, { available_date: value, day_of_week: dayOfWeekFromDate(value) });
  };

  const updateTime = (index: number, field: "start_time" | "end_time", value: string) => {
    const normalized = normalizeTime(value.replace(/\s/g, ""));
    if (normalized.length <= 5) update(index, { [field]: normalized });
  };

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

    const invalid = slots.find((slot) => !is24HourTime(normalizeTime(slot.start_time)) || !is24HourTime(normalizeTime(slot.end_time)));
    if (invalid) {
      toast.error("Use 24-hour time in HH:MM format, for example 09:00 or 23:59.");
      return;
    }

    const existingSlots = slots.filter((slot) => Boolean(slot.id));
    const newSlots = slots.filter((slot) => !slot.id);

    const updates = existingSlots.map(({ id, available_date, day_of_week, start_time, end_time, is_active }) => ({
      id,
      specialist_id: user.id,
      available_date,
      day_of_week,
      start_time,
      end_time,
      is_active,
    }));

    const inserts = newSlots.map(({ available_date, day_of_week, start_time, end_time, is_active }) => ({
      specialist_id: user.id,
      available_date,
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

      <div className="flex flex-col gap-3 rounded-2xl border bg-muted/30 p-4 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1">
          <span className="mb-1 block text-xs text-muted-foreground">Add availability date</span>
          <Input
            type="date"
            min={dateOptions.min}
            max={dateOptions.max}
            value={selectedDateToAdd}
            onChange={(event) => setSelectedDateToAdd(event.target.value)}
            aria-label="Availability date"
          />
        </label>
        <Button type="button" variant="outline" onClick={addDate}>+ Add date</Button>
      </div>

      <div className="space-y-3">
        {slots.map((slot, index) => (
          <Card
            key={slot.id ?? `new-${slot.day_of_week}-${index}`}
            className="grid gap-3 p-4 sm:grid-cols-[80px_minmax(0,1fr)_minmax(0,1fr)_auto_auto] sm:items-center"
          >
            <label className="min-w-0">
              <span className="mb-1 block text-xs text-muted-foreground">Date</span>
              <Input
                type="date"
                min={dateOptions.min}
                max={dateOptions.max}
                value={slot.available_date}
                onChange={(event) => updateDate(index, event.target.value)}
                className="w-full min-w-0"
                aria-label="Availability date"
              />
              <span className="mt-1 block text-xs text-muted-foreground">
                {slot.available_date ? format(new Date(slot.available_date + "T12:00:00"), "EEE, MMM d, yyyy") : "Select a date"}
              </span>
            </label>

            <label className="min-w-0">
              <span className="mb-1 block text-xs text-muted-foreground">Start time · 24-hour (00:00–23:59)</span>
              <Input
                type="text"
                inputMode="numeric"
                pattern="(?:[01]\d|2[0-3]):[0-5]\d"
                maxLength={5}
                placeholder="09:00"
                value={normalizeTime(slot.start_time)}
                onChange={(event) => updateTime(index, "start_time", event.target.value)}
                className="w-full min-w-0"
                aria-label="Start time in 24-hour format"
              />
            </label>

            <label className="min-w-0">
              <span className="mb-1 block text-xs text-muted-foreground">End time · 24-hour (00:00–23:59)</span>
              <Input
                type="text"
                inputMode="numeric"
                pattern="(?:[01]\d|2[0-3]):[0-5]\d"
                maxLength={5}
                placeholder="17:00"
                value={normalizeTime(slot.end_time)}
                onChange={(event) => updateTime(index, "end_time", event.target.value)}
                className="w-full min-w-0"
                aria-label="End time in 24-hour format"
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
