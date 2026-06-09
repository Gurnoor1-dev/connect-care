import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (body: unknown, status = 200) =>
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
    const dailyApiKey = Deno.env.get("DAILY_API_KEY");

    if (!supabaseUrl || !anonKey || !serviceKey || !dailyApiKey) {
      console.error("Missing required Daily token environment variables");
      return jsonResponse({ error: "Function configuration is incomplete" }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) return jsonResponse({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const appointmentId = body.appointmentId ?? body.appointment_id;
    const requestedRole = body.role;

    if (!appointmentId) return jsonResponse({ error: "appointment_id is required" }, 400);

    const { data: appointment, error: appointmentError } = await admin
      .from("appointments")
      .select("id, customer_id, specialist_id, scheduled_at, duration_minutes, status, daily_room_url, daily_room_name")
      .eq("id", appointmentId)
      .maybeSingle();

    if (appointmentError) {
      console.error("Appointment lookup failed", appointmentError);
      return jsonResponse({ error: "Unable to load appointment" }, 500);
    }
    if (!appointment) return jsonResponse({ error: "Appointment not found" }, 404);

    const isCustomer = appointment.customer_id === user.id;
    const isSpecialist = appointment.specialist_id === user.id;

    if (!isCustomer && !isSpecialist) {
      return jsonResponse({ error: "You do not have access to this call" }, 403);
    }

    if (!["confirmed", "completed"].includes(appointment.status)) {
      return jsonResponse({ error: "Appointment is not ready for video" }, 409);
    }

    const start = new Date(appointment.scheduled_at).getTime();
    const durationMs = (appointment.duration_minutes || 30) * 60 * 1000;
    const now = Date.now();
    const joinWindowStart = start - 5 * 60 * 1000;
    const joinWindowEnd = start + durationMs + 15 * 60 * 1000;

    if (now < joinWindowStart) {
      return jsonResponse({ error: "This call opens 5 minutes before the session" }, 403);
    }
    if (now > joinWindowEnd) {
      return jsonResponse({ error: "This call window has ended" }, 403);
    }

    const dailyHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${dailyApiKey}`,
    };

    let roomUrl = appointment.daily_room_url as string | null;
    let roomName = appointment.daily_room_name as string | null;

    if (!roomUrl || !roomName) {
      const roomExp = Math.floor((start + durationMs + 30 * 60 * 1000) / 1000);
      const roomResponse = await fetch("https://api.daily.co/v1/rooms", {
        method: "POST",
        headers: dailyHeaders,
        body: JSON.stringify({
          properties: {
            exp: roomExp,
            enable_chat: true,
            enable_screenshare: true,
          },
        }),
      });

      const roomPayload = await roomResponse.json().catch(() => ({}));

      if (!roomResponse.ok || !roomPayload.url || !roomPayload.name) {
        console.error("Daily room creation failed", roomPayload);
        return jsonResponse({ error: "Unable to create Daily room" }, 502);
      }

      roomUrl = roomPayload.url;
      roomName = roomPayload.name;

      const { error: roomUpdateError } = await admin
        .from("appointments")
        .update({ daily_room_url: roomUrl, daily_room_name: roomName })
        .eq("id", appointmentId);

      if (roomUpdateError) {
        console.error("Daily room save failed", roomUpdateError);
        return jsonResponse({ error: "Unable to save Daily room" }, 500);
      }
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    const tokenResponse = await fetch("https://api.daily.co/v1/meeting-tokens", {
      method: "POST",
      headers: dailyHeaders,
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          user_name: profile?.full_name || user.email || "Connect Care guest",
          user_id: user.id,
          is_owner: requestedRole === "specialist" || isSpecialist,
          exp: Math.floor(joinWindowEnd / 1000),
        },
      }),
    });

    const tokenPayload = await tokenResponse.json().catch(() => ({}));

    if (!tokenResponse.ok || !tokenPayload.token) {
      console.error("Daily token creation failed", tokenPayload);
      return jsonResponse({ error: "Unable to create Daily token" }, 502);
    }

    return jsonResponse({
      token: tokenPayload.token,
      room_url: roomUrl,
      roomUrl,
      room_name: roomName,
      roomName,
    });
  } catch (error) {
    console.error("daily-token error", error);
    return jsonResponse({ error: "Unexpected Daily token error" }, 500);
  }
});
