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

async function hmacSha256(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

function basicAuth(key: string, secret: string) {
  return "Basic " + btoa(`${key}:${secret}`);
}

async function notifyBooking(appointmentId: string) {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !key) return;
  try {
    const response = await fetch(`${url}/functions/v1/appointment-notifications`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, apikey: key },
      body: JSON.stringify({ action: "booking", appointment_id: appointmentId }),
    });
    if (!response.ok) {
      const raw = await response.text();
      throw new Error(`notification function returned ${response.status}: ${raw}`);
    }
  } catch (error) {
    console.error("[razorpay-verify-payment] booking notification failed:", error);
  }
}

async function awardBundleCredits(admin: ReturnType<typeof createClient>, appointment: any) {
  if (appointment.bundle_credits_awarded_at) return;

  const { data: tier } = await admin
    .from("specialist_tiers")
    .select("session_count,credit_points,tier_type")
    .eq("id", appointment.tier_id)
    .maybeSingle();

  if (tier?.tier_type !== "bundle") return;

  const points = Math.max(Number(tier.credit_points ?? 0), Number(tier.session_count ?? 1) * 2);
  const remaining = Math.max(0, points - 2);
  if (remaining > 0) {
    const { data: existing } = await admin
      .from("customer_specialist_credits")
      .select("id,credit_points")
      .eq("customer_id", appointment.customer_id)
      .eq("specialist_id", appointment.specialist_id)
      .maybeSingle();

    if (existing) {
      await admin.from("customer_specialist_credits")
        .update({ credit_points: Number(existing.credit_points) + remaining, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await admin.from("customer_specialist_credits").insert({
        customer_id: appointment.customer_id,
        specialist_id: appointment.specialist_id,
        credit_points: remaining,
      });
    }
  }

  await admin.from("appointments")
    .update({ bundle_credits_awarded_at: new Date().toISOString() })
    .eq("id", appointment.id)
    .is("bundle_credits_awarded_at", null);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Missing Authorization header" }, 401);

    const body = await req.json().catch(() => null);
    const paymentId = body?.razorpay_payment_id;
    const checkoutOrderId = body?.razorpay_order_id;
    const signature = body?.razorpay_signature;

    if (!paymentId || !checkoutOrderId || !signature) return json({ error: "Missing Razorpay payment fields" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const keyId = Deno.env.get("RAZORPAY_KEY_ID");
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!supabaseUrl || !anonKey || !serviceRoleKey || !keyId || !keySecret) {
      return json({ error: "Razorpay server configuration is incomplete" }, 500);
    }

    if (!keyId.startsWith("rzp_live_")) {
      return json(
        { error: "Razorpay is not in Live Mode. Configure the live Razorpay key in Supabase." },
        500,
      );
    }

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: auth } } });
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const { data: appointment, error: appointmentError } = await admin
      .from("appointments")
      .select("id,customer_id,specialist_id,tier_id,amount_cents,currency,status,razorpay_order_id,bundle_credits_awarded_at")
      .eq("razorpay_order_id", checkoutOrderId)
      .maybeSingle();

    if (appointmentError) return json({ error: appointmentError.message }, 500);
    if (!appointment) return json({ error: "Razorpay order not found" }, 404);
    if (appointment.customer_id !== user.id) return json({ error: "Forbidden" }, 403);
    if (appointment.currency !== "USD") return json({ error: "Appointment currency mismatch" }, 400);

    const expectedSignature = await hmacSha256(`${appointment.razorpay_order_id}|${paymentId}`, keySecret);
    if (!safeEqual(expectedSignature, String(signature))) return json({ error: "Invalid Razorpay payment signature" }, 400);

    const paymentResponse = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: basicAuth(keyId, keySecret) },
    });
    const payment = await paymentResponse.json();
    if (!paymentResponse.ok) {
      console.error("[razorpay-verify-payment] payment lookup failed:", payment);
      return json({ error: "Could not verify payment with Razorpay" }, 502);
    }

    if (
      payment.order_id !== appointment.razorpay_order_id ||
      payment.amount !== Number(appointment.amount_cents) ||
      payment.currency !== "USD" ||
      payment.status !== "captured" ||
      payment.captured !== true
    ) {
      return json({ error: "Razorpay payment details do not match the appointment." }, 400);
    }

    const { data: updated, error: updateError } = await admin
      .from("appointments")
      .update({
        status: "confirmed",
        payment_method: "razorpay",
        razorpay_payment_id: payment.id,
        razorpay_payment_status: payment.status,
        razorpay_base_amount: payment.base_amount ?? null,
        razorpay_base_currency: payment.base_currency ?? null,
        razorpay_fee: payment.fee ?? null,
        razorpay_tax: payment.tax ?? null,
        payment_captured_at: Number.isFinite(Number(payment.created_at)) ? new Date(Number(payment.created_at) * 1000).toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", appointment.id)
      .eq("customer_id", user.id)
      .select("id,customer_id,specialist_id,tier_id,bundle_credits_awarded_at")
      .maybeSingle();

    if (updateError) return json({ error: updateError.message }, 500);
    if (!updated) return json({ error: "Appointment could not be confirmed" }, 409);

    await awardBundleCredits(admin, updated);
    await notifyBooking(appointment.id);

    return json({ success: true, appointment_id: appointment.id });
  } catch (error) {
    console.error("[razorpay-verify-payment] unexpected error:", error);
    return json({ error: error instanceof Error ? error.message : "Internal server error" }, 500);
  }
});
