// PayU hosted-checkout initiation. Returns an auto-submitting HTML form.
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

async function sha512(s: string) {
  const buf = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest("SHA-512", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    let appointment_id: string;
    try {
      ({ appointment_id } = await req.json());
    } catch {
      return json({ error: "Invalid request body - expected JSON with appointment_id" }, 400);
    }
    if (!appointment_id) return json({ error: "appointment_id is required" }, 400);

    const auth = req.headers.get("Authorization") ?? "";
    if (!auth) return json({ error: "Missing Authorization header" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: "Supabase function configuration is incomplete" }, 500);
    }

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: auth } },
    });
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return json({ error: `Unauthorized: ${authErr?.message ?? "no session"}` }, 401);
    }

    const { data: appt, error: apptErr } = await admin
      .from("appointments")
      .select("*")
      .eq("id", appointment_id)
      .maybeSingle();

    if (apptErr) {
      return json({ error: `Appointment lookup failed: ${apptErr.message}` }, 500);
    }
    if (!appt) return json({ error: "Appointment not found" }, 404);
    if (appt.customer_id !== user.id) {
      return json({ error: "Forbidden - you are not the customer for this appointment" }, 403);
    }

    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("email, full_name")
      .eq("id", appt.customer_id)
      .maybeSingle();

    if (profileErr) {
      return json({ error: `Customer profile lookup failed: ${profileErr.message}` }, 500);
    }

    const key = Deno.env.get("PAYU_MERCHANT_KEY");
    const salt = Deno.env.get("PAYU_MERCHANT_SALT");
    const mode = Deno.env.get("PAYU_MODE") ?? "test";
    const appBase = Deno.env.get("APP_BASE_URL") || req.headers.get("origin") || "";

    if (!key || !salt) {
      return json(
        { error: "PayU is not configured on the server. Set PAYU_MERCHANT_KEY and PAYU_MERCHANT_SALT secrets." },
        500,
      );
    }
    if (!appBase) {
      return json({ error: "APP_BASE_URL is required so PayU can return to the app." }, 500);
    }

    const baseUrl = mode === "live"
      ? "https://secure.payu.in/_payment"
      : "https://test.payu.in/_payment";

    const txnid = `BR-${appointment_id.slice(0, 8)}-${Date.now()}`;
    const amount = (appt.amount_cents / 100).toFixed(2);
    const productinfo = `BreatheRise session (${appt.duration_minutes} min)`;
    const fallbackName = typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : "Customer";
    const firstname = (profile?.full_name ?? fallbackName).split(" ")[0];
    const email = profile?.email ?? user.email ?? "";

    if (!email) return json({ error: "Customer email not found" }, 400);

    const successRedirect = `${appBase}/payment/success?appointment=${encodeURIComponent(appointment_id)}`;
    const failureRedirect = `${appBase}/payment/failure?appointment=${encodeURIComponent(appointment_id)}`;
    const webhookUrl = `${supabaseUrl}/functions/v1/payu-webhook`;
    const surl = `${webhookUrl}?appointment=${encodeURIComponent(appointment_id)}&redirect=${encodeURIComponent(successRedirect)}`;
    const furl = `${webhookUrl}?appointment=${encodeURIComponent(appointment_id)}&redirect=${encodeURIComponent(failureRedirect)}`;

    // Hash: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt
    const hashString = `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|||||||||||${salt}`;
    const hash = await sha512(hashString);

    const { error: updateErr } = await admin
      .from("appointments")
      .update({ payu_txn_id: txnid })
      .eq("id", appointment_id);

    if (updateErr) {
      return json({ error: `Could not save PayU transaction id: ${updateErr.message}` }, 500);
    }

    const fields: Record<string, string> = {
      key,
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      surl,
      furl,
      hash,
      service_provider: "payu_paisa",
    };

    const inputs = Object.entries(fields)
      .map(([k, v]) => `<input type="hidden" name="${escapeHtml(k)}" value="${escapeHtml(v)}" />`)
      .join("\n");

    const formHtml = `<form id="payuForm" method="post" action="${baseUrl}">\n${inputs}\n</form>`;

    return json({ formHtml, txnid, mode });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[payu-initiate] unexpected error:", msg);
    return json({ error: `Internal server error: ${msg}` }, 500);
  }
});
