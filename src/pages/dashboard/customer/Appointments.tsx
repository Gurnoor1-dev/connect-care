import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AppointmentRow } from "./Overview";

export default function CustomerAppointments() {
  const { user } = useAuth();
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [past, setPast] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const nowIso = new Date().toISOString();
      const base = supabase
        .from("appointments")
        .select("*, specialist:specialist_profiles!appointments_specialist_id_fkey(display_name, country_flag)")
        .eq("customer_id", user.id);
      const [{ data: up }, { data: ps }] = await Promise.all([
        base.gte("scheduled_at", nowIso).order("scheduled_at", { ascending: true }),
        base.lt("scheduled_at", nowIso).order("scheduled_at", { ascending: false }),
      ]);
      setUpcoming(up ?? []);
      setPast(ps ?? []);
    })();
  }, [user]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">My appointments</h1>
      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">History ({past.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="mt-4 space-y-3">
          {upcoming.length === 0 && <Card className="p-8 text-center text-muted-foreground">Nothing scheduled.</Card>}
          {upcoming.map((a) => <AppointmentRow key={a.id} a={a} role="customer" />)}
        </TabsContent>
        <TabsContent value="past" className="mt-4 space-y-3">
          {past.length === 0 && <Card className="p-8 text-center text-muted-foreground">No history yet.</Card>}
          {past.map((a) => <AppointmentRow key={a.id} a={a} role="customer" past />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
