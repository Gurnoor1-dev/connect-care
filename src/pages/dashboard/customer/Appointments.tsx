import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LiveAppointmentRow } from "@/components/dashboard/LiveAppointmentRow";
import { formatInTimeZone, getDeviceTimeZone, getZonedDateKey } from "@/lib/timezone";

export default function CustomerAppointments() {
  const { user } = useAuth();
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [past, setPast] = useState<any[]>([]);
  const [selectedHistoryMonth, setSelectedHistoryMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const now = new Date();
      const activeCutoff = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      const select = "*, specialist:specialist_profiles!appointments_specialist_id_fkey(display_name, country_flag, timezone)";
      const [{ data: up }, { data: ps }] = await Promise.all([
        supabase.from("appointments").select(select).eq("customer_id", user.id).eq("status", "confirmed").gte("scheduled_at", activeCutoff).order("scheduled_at", { ascending: true }),
        supabase.from("appointments").select(select).eq("customer_id", user.id).lt("scheduled_at", activeCutoff).order("scheduled_at", { ascending: false }),
      ]);
      setUpcoming(up ?? []); setPast(ps ?? []);
    };
    void load();
    const id = window.setInterval(() => void load(), 15_000);
    return () => window.clearInterval(id);
  }, [user]);

  const historyTimeZone = getDeviceTimeZone();
  const historyMonths = Array.from(new Set([
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`,
    ...past.map((a) => getZonedDateKey(new Date(a.scheduled_at), historyTimeZone).slice(0, 7)),
  ])).sort((a, b) => b.localeCompare(a));
  const filteredPast = past.filter((a) => getZonedDateKey(new Date(a.scheduled_at), historyTimeZone).slice(0, 7) === selectedHistoryMonth);
  const selectedMonthLabel = formatInTimeZone(`${selectedHistoryMonth}-01T12:00:00Z`, historyTimeZone, { month: "long", year: "numeric" });

  return <div className="space-y-6">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-3xl font-bold">My appointments</h1><p className="mt-1 text-muted-foreground">Video sessions, payment status, and prescriptions.</p></div><Button asChild className="bg-gradient-brand text-primary-foreground shadow-brand"><Link to="/book">Book specialist</Link></Button></header>
    <Tabs defaultValue="upcoming"><TabsList><TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger><TabsTrigger value="past">History ({past.length})</TabsTrigger></TabsList><TabsContent value="upcoming" className="mt-4 space-y-3">{upcoming.length === 0 && <Card className="border-white/55 bg-card/90 p-8 text-center text-muted-foreground shadow-brand backdrop-blur">Nothing scheduled.</Card>}{upcoming.map((a) => <LiveAppointmentRow key={a.id} a={a} role="customer" />)}</TabsContent><TabsContent value="past" className="mt-4 space-y-3"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="text-sm text-muted-foreground">Showing sessions for <span className="font-medium text-foreground">{selectedMonthLabel}</span></div><label className="flex items-center gap-2 text-sm text-muted-foreground"><span>Month</span><select value={selectedHistoryMonth} onChange={(e) => setSelectedHistoryMonth(e.target.value)} className="rounded-lg border border-white/30 bg-card px-3 py-2 text-sm text-foreground outline-none ring-offset-background focus:ring-2 focus:ring-ring">{historyMonths.map((month) => <option key={month} value={month}>{formatInTimeZone(`${month}-01T12:00:00Z`, historyTimeZone, { month: "long", year: "numeric" })}</option>)}</select></label></div>{filteredPast.length === 0 ? <Card className="border-white/55 bg-card/90 p-8 text-center text-muted-foreground shadow-brand backdrop-blur">No history in {selectedMonthLabel}.</Card> : filteredPast.map((a) => <div key={a.id} className="space-y-1"><div className="px-1 text-sm font-medium text-foreground">Consultant: {a.specialist?.display_name ?? "Specialist"}</div><LiveAppointmentRow a={a} role="customer" past /></div>)}</TabsContent></Tabs>
  </div>;
}
