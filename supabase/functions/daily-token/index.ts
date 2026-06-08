// Create a Daily.co meeting token (and room on first call) gated by appointment access and 5-min window.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const auth = req.headers.get("Authorization") ?? "";
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

  const { appointment_id, role } = await req.json();
  const { data: appt } = await admin.from("appointments").select("*, profiles!appointments_customer_id_fkey(full_name)").eq("id", appointment_id).single();
  if (!appt) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: corsHeaders });
  if (appt.customer_id !== user.id && appt.specialist_id !== user.id) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
  }
  if (appt.status !== "confirmed") return new Response(JSON.stringify({ error: "Not confirmed" }), { status: 400, headers: corsHeaders });

  const start = new Date(appt.scheduled_at).getTime();
  const now = Date.now();
  const mins = (start - now) / 60000;
  if (mins > 5) return new Response(JSON.stringify({ error: "Too early — opens 5 min before start" }), { status: 400, headers: corsHeaders });
  if (mins < -(appt.duration_minutes + 15)) return new Response(JSON.stringify({ error: "Session ended" }), { status: 400, headers: corsHeaders });

  const dailyKey = Deno.env.get("DAILY_API_KEY")!;
  const dailyHeaders = { Authorization: `Bearer ${dailyKey}`, "Content-Type": "application/json" };

  let roomUrl = appt.daily_room_url as string | null;
  let roomName = appt.daily_room_name as string | null;
  if (!roomUrl) {
    const exp = Math.floor(start / 1000) + (appt.duration_minutes + 30) * 60;
    const r = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST", headers: dailyHeaders,
      body: JSON.stringify({ properties: { exp, enable_chat: true, enable_screenshare: true } }),
    });
    const room = await r.json();
    roomUrl = room.url; roomName = room.name;
    await admin.from("appointments").update({ daily_room_url: roomUrl, daily_room_name: roomName }).eq("id", appointment_id);
  }

  const exp = Math.floor(start / 1000) + (appt.duration_minutes + 30) * 60;
  const tokenRes = await fetch("https://api.daily.co/v1/meeting-tokens", {
    method: "POST", headers: dailyHeaders,
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        is_owner: role === "specialist",
        user_name: role === "specialist" ? "Specialist" : (appt.profiles?.full_name ?? "Patient"),
        exp,
      },
    }),
  });
  const { token } = await tokenRes.json();

  return new Response(JSON.stringify({ room_url: roomUrl, token }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
