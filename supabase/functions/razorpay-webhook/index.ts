import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-razorpay-signature, x-razorpay-event-id",
};

async function hmacSha256(value: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

async function awardBundleCredits(admin: ReturnType<typeof createClient>, appointment: any) {
  if (appointment.bundle_credits_awarded_at) return;
  const { data: tier } = await admin.from("specialist_tiers").select("session_count,credit_points,tier_type").eq("id", appointment.tier_id).maybeSingle();
  if (tier?.tier_type !== "bundle") return;
  const points = Math.max(Number(tier.credit_points ?? 0), Number(tier.session_count ?? 1) * 2);
  const remaining = Math.max(0, points - 2);
  if (remaining > 0) {
    const { data: existing } = await admin.from("customer_specialist_credits").select("id,credit_points").eq("customer_id", appointment.customer_id).eq("specialist_id", appointment.specialist_id).maybeSingle();
    if (existing) {
      await admin.from("customer_specialist_credits").update({ credit_points: Number(existing.credit_points) + remaining, updated_at: new Date().toISOString() }).eq("id", existing.id);
    } else {
      await admin.from("customer_specialist_credits").insert({ customer_id: appointment.customer_id, specialist_id: appointment.specialist_id, credit_points: remaining });
    }
  }
  await admin.from("appointments").update({ bundle_credits_awarded_at: new Date().toISOString() }).eq("id", appointment.id).is("bundle_credits_awarded_at", null);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const secret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!secret || !serviceRoleKey) return new Response("Razorpay webhook is not configured", { status: 500, headers: corsHeaders });

    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") ?? "";
    const expected = await hmacSha256(rawBody, secret);
    if (!signature || !safeEqual(expected, signature)) return new Response("Invalid webhook signature", { status: 400, headers: corsHeaders });

    const payload = JSON.parse(rawBody);
    const event = String(payload.event ?? "");
    const payment = payload?.payload?.payment?.entity;
    if (event !== "payment.captured" || !payment?.id || !payment?.order_id) return new Response("ok", { status: 200, headers: corsHeaders });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey);
    const { data: appointment, error: appointmentError } = await admin
      .from("appointments")
      .select("id,customer_id,specialist_id,tier_id,amount_cents,currency,status,razorpay_order_id,bundle_credits_awarded_at")
      .eq("razorpay_order_id", payment.order_id)
      .maybeSingle();

    if (appointmentError) return new Response("appointment lookup failed", { status: 500, headers: corsHeaders });
    if (!appointment) return new Response("ok", { status: 200, headers: corsHeaders });

    if (payment.currency !== "USD" || Number(payment.amount) !== Number(appointment.amount_cents)) {
      return new Response("payment mismatch", { status: 400, headers: corsHeaders });
    }

    const { data: updated, error: updateError } = await admin
      .from("appointments")
      .update({
        status: "confirmed",
        payment_method: "razorpay",
        razorpay_payment_id: payment.id,
        razorpay_payment_status: payment.status ?? "captured",
        razorpay_base_amount: payment.base_amount ?? null,
        razorpay_base_currency: payment.base_currency ?? null,
        razorpay_fee: payment.fee ?? null,
        razorpay_tax: payment.tax ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", appointment.id)
      .select("id,customer_id,specialist_id,tier_id,bundle_credits_awarded_at")
      .maybeSingle();

    if (updateError) return new Response("appointment update failed", { status: 500, headers: corsHeaders });
    if (updated) await awardBundleCredits(admin, updated);

    return new Response("ok", { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("[razorpay-webhook] unexpected error:", error);
    return new Response("unexpected webhook error", { status: 500, headers: corsHeaders });
  }
});
