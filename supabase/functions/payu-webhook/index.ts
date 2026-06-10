// PayU hosted-checkout return/webhook. PayU cannot send a Supabase JWT, so this
// function verifies PayU's reverse hash before updating an appointment.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha512(value: string) {
  const hash = await crypto.subtle.digest("SHA-512", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function buildRedirect(req: Request, fallbackPath: string) {
  const url = new URL(req.url);
  const explicitRedirect = url.searchParams.get("redirect");
  if (explicitRedirect) return explicitRedirect;

  const appBase = Deno.env.get("APP_BASE_URL") ?? "";
  const appointment = url.searchParams.get("appointment");
  const suffix = appointment ? `${fallbackPath}?appointment=${encodeURIComponent(appointment)}` : fallbackPath;
  return appBase ? `${appBase}${suffix}` : suffix;
}

function textResponse(body: string, status = 200) {
  return new Response(body, { status, headers: corsHeaders });
}

async function awardBundleCredits(admin: ReturnType<typeof createClient>, txnid: string) {
  const { data: appointment, error: appointmentError } = await admin
    .from("appointments")
    .select("id, customer_id, specialist_id, tier_id, bundle_credits_awarded_at")
    .eq("payu_txn_id", txnid)
    .maybeSingle();

  if (appointmentError || !appointment || appointment.bundle_credits_awarded_at) return;

  const { data: tier } = await admin
    .from("specialist_tiers")
    .select("session_count, credit_points, tier_type")
    .eq("id", appointment.tier_id)
    .maybeSingle();

  const creditPoints = Math.max(Number(tier?.credit_points ?? 2), Number(tier?.session_count ?? 1) * 2);
  const remainingCredits = Math.max(0, creditPoints - 2);

  if (remainingCredits > 0) {
    const { data: existing } = await admin
      .from("customer_specialist_credits")
      .select("id, credit_points")
      .eq("customer_id", appointment.customer_id)
      .eq("specialist_id", appointment.specialist_id)
      .maybeSingle();

    if (existing) {
      await admin
        .from("customer_specialist_credits")
        .update({ credit_points: existing.credit_points + remainingCredits, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await admin.from("customer_specialist_credits").insert({
        customer_id: appointment.customer_id,
        specialist_id: appointment.specialist_id,
        credit_points: remainingCredits,
      });
    }
  }

  await admin
    .from("appointments")
    .update({ bundle_credits_awarded_at: new Date().toISOString() })
    .eq("id", appointment.id)
    .is("bundle_credits_awarded_at", null);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const form = await req.formData();
    const get = (key: string) => String(form.get(key) ?? "");

    const status = get("status");
    const key = get("key");
    const txnid = get("txnid");
    const amount = get("amount");
    const productinfo = get("productinfo");
    const firstname = get("firstname");
    const email = get("email");
    const postedHash = get("hash").toLowerCase();
    const mihpayid = get("mihpayid");
    const salt = Deno.env.get("PAYU_MERCHANT_SALT");
    const merchantKey = Deno.env.get("PAYU_MERCHANT_KEY");

    if (!salt || !merchantKey) {
      console.error("PayU webhook secrets are missing");
      return textResponse("PayU webhook is not configured", 500);
    }

    if (!postedHash || !txnid || !status) return textResponse("missing PayU fields", 400);
    if (key && key !== merchantKey) return textResponse("invalid merchant key", 400);

    const calculatedHash = await sha512(
      `${salt}|${status}|||||||||||${email}|${firstname}|${productinfo}|${amount}|${txnid}|${merchantKey}`,
    );

    if (calculatedHash !== postedHash) {
      console.error("PayU webhook hash mismatch", { txnid, status });
      return textResponse("invalid hash", 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const nextStatus = status.toLowerCase() === "success" ? "confirmed" : "cancelled";
    const { error } = await admin
      .from("appointments")
      .update({ status: nextStatus, payu_mihpayid: mihpayid || null })
      .eq("payu_txn_id", txnid);

    if (error) {
      console.error("PayU appointment update failed", error);
      return textResponse("appointment update failed", 500);
    }

    if (nextStatus === "confirmed") await awardBundleCredits(admin, txnid);

    const redirectUrl = buildRedirect(
      req,
      nextStatus === "confirmed" ? "/payment/success" : "/payment/failure",
    );

    return Response.redirect(redirectUrl, 303);
  } catch (error) {
    console.error("payu-webhook error", error);
    return textResponse("unexpected PayU webhook error", 500);
  }
});
