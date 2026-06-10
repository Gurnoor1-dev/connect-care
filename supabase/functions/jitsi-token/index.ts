import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return json({ error: "Function configuration is incomplete" }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const appointmentId = body.appointment_id ?? body.appointmentId;
    if (!appointmentId) return json({ error: "appointment_id is required" }, 400);

    const { data: appointment, error } = await admin
      .from("appointments")
      .select("id, customer_id, specialist_id, scheduled_at, duration_minutes, status")
      .eq("id", appointmentId)
      .maybeSingle();

    if (error) return json({ error: error.message }, 500);
    if (!appointment) return json({ error: "Appointment not found" }, 404);

    const isCustomer = appointment.customer_id === user.id;
    const isSpecialist = appointment.specialist_id === user.id;
    if (!isCustomer && !isSpecialist) return json({ error: "Forbidden" }, 403);

    if (!["confirmed", "completed"].includes(appointment.status)) {
      return json({ error: "Appointment is not ready for video" }, 409);
    }

    const start = new Date(appointment.scheduled_at).getTime();
    const durationMs = (appointment.duration_minutes || 30) * 60 * 1000;
    const now = Date.now();
    if (now < start - 5 * 60 * 1000) return json({ error: "This call opens 5 minutes before the session" }, 403);
    if (now > start + durationMs + 15 * 60 * 1000) return json({ error: "This call window has ended" }, 403);

    const { data: profile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    return json({
      room_name: `breatherise-${appointment.id.replaceAll("-", "")}`,
      display_name: profile?.full_name || user.email || (isSpecialist ? "Specialist" : "Customer"),
      role: isSpecialist ? "specialist" : "customer",
    });
  } catch (error) {
    console.error("jitsi-token error", error);
    return json({ error: "Unexpected Jitsi token error" }, 500);
  }
});
