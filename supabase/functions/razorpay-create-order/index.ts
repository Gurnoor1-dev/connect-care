import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function basicAuth(key: string, secret: string) {
  return "Basic " + btoa(`${key}:${secret}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Missing Authorization header" }, 401);

    const { appointment_id } = await req.json().catch(() => ({ appointment_id: "" }));
    if (!appointment_id) return json({ error: "appointment_id is required" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const keyId = Deno.env.get("RAZORPAY_KEY_ID");
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!supabaseUrl || !anonKey || !serviceRoleKey || !keyId || !keySecret) {
      return json({ error: "Razorpay server configuration is incomplete. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET." }, 500);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: auth } },
    });
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const { data: appointment, error: appointmentError } = await admin
      .from("appointments")
      .select("id,customer_id,specialist_id,tier_id,duration_minutes,amount_cents,currency,status,customer_name")
      .eq("id", appointment_id)
      .maybeSingle();

    if (appointmentError) return json({ error: appointmentError.message }, 500);
    if (!appointment) return json({ error: "Appointment not found" }, 404);
    if (appointment.customer_id !== user.id) return json({ error: "Forbidden" }, 403);
    if (appointment.status !== "pending_payment") return json({ error: "This appointment is not awaiting payment." }, 409);

    if (appointment.currency !== "USD") {
      return json({
        error: "This payment is not configured for USD. Set this specialist tier's currency to USD before accepting Razorpay payments.",
      }, 400);
    }

    const amount = Number(appointment.amount_cents);
    if (!Number.isInteger(amount) || amount <= 0) return json({ error: "Invalid appointment amount" }, 400);

    const { data: profile } = await admin
      .from("profiles")
      .select("email,full_name")
      .eq("id", user.id)
      .maybeSingle();

    const email = profile?.email ?? user.email ?? "";
    const name = profile?.full_name ?? appointment.customer_name ?? user.user_metadata?.full_name ?? "Customer";
    if (!email) return json({ error: "Customer email not found" }, 400);

    const existingOrderId = (appointment as any).razorpay_order_id;
    if (existingOrderId) {
      return json({
        key_id: keyId,
        order_id: existingOrderId,
        amount,
        currency: "USD",
        name: "BreatheRise",
        description: `BreatheRise session (${appointment.duration_minutes} min)`,
        prefill: { name, email },
      });
    }

    const receipt = `BR-${appointment.id.replaceAll("-", "").slice(0, 30)}`;
    const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: basicAuth(keyId, keySecret),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        currency: "USD",
        receipt,
        notes: {
          appointment_id: appointment.id,
          specialist_id: appointment.specialist_id,
          customer_id: appointment.customer_id,
        },
      }),
    });

    const orderBody = await razorpayResponse.json();
    if (!razorpayResponse.ok) {
      console.error("[razorpay-create-order] Razorpay error:", orderBody);
      return json({ error: orderBody?.error?.description ?? "Razorpay order creation failed" }, 502);
    }

    const { error: updateError } = await admin
      .from("appointments")
      .update({
        razorpay_order_id: orderBody.id,
        razorpay_payment_status: "created",
        payment_method: "razorpay",
        currency: "USD",
      })
      .eq("id", appointment.id)
      .eq("status", "pending_payment");

    if (updateError) return json({ error: `Could not save Razorpay order: ${updateError.message}` }, 500);

    return json({
      key_id: keyId,
      order_id: orderBody.id,
      amount: orderBody.amount,
      currency: orderBody.currency,
      name: "BreatheRise",
      description: `BreatheRise session (${appointment.duration_minutes} min)`,
      prefill: { name, email },
    });
  } catch (error) {
    console.error("[razorpay-create-order] unexpected error:", error);
    return json({ error: error instanceof Error ? error.message : "Internal server error" }, 500);
  }
});
