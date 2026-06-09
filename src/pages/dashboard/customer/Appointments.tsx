import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
      const select = "*, specialist:specialist_profiles!appointments_specialist_id_fkey(display_name, country_flag)";
      const [{ data: up }, { data: ps }] = await Promise.all([
        supabase
          .from("appointments")
          .select(select)
          .eq("customer_id", user.id)
          .gte("scheduled_at", nowIso)
          .order("scheduled_at", { ascending: true }),
        supabase
          .from("appointments")
          .select(select)
          .eq("customer_id", user.id)
          .lt("scheduled_at", nowIso)
          .order("scheduled_at", { ascending: false }),
      ]);
      setUpcoming(up ?? []);
      setPast(ps ?? []);
    })();
  }, [user]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">My appointments</h1>
          <p className="mt-1 text-muted-foreground">Video sessions, payment status, and prescriptions.</p>
        </div>
        <Button asChild className="bg-gradient-brand text-primary-foreground shadow-brand">
          <Link to="/book">Book specialist</Link>
        </Button>
      </header>
      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">History ({past.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="mt-4 space-y-3">
          {upcoming.length === 0 && <Card className="border-white/55 bg-card/90 p-8 text-center text-muted-foreground shadow-brand backdrop-blur">Nothing scheduled.</Card>}
          {upcoming.map((a) => <AppointmentRow key={a.id} a={a} role="customer" />)}
        </TabsContent>
        <TabsContent value="past" className="mt-4 space-y-3">
          {past.length === 0 && <Card className="border-white/55 bg-card/90 p-8 text-center text-muted-foreground shadow-brand backdrop-blur">No history yet.</Card>}
          {past.map((a) => <AppointmentRow key={a.id} a={a} role="customer" past />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
