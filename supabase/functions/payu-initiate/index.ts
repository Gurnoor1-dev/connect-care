// PayU hosted-checkout initiation. Returns an auto-submitting HTML form.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha512(s: string) {
  const buf = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest("SHA-512", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { appointment_id } = await req.json();
    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const { data: appt } = await admin.from("appointments").select("*, profiles!appointments_customer_id_fkey(email, full_name)").eq("id", appointment_id).single();
    if (!appt || appt.customer_id !== user.id) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: corsHeaders });

    const key = Deno.env.get("PAYU_MERCHANT_KEY")!;
    const salt = Deno.env.get("PAYU_MERCHANT_SALT")!;
    const baseUrl = (Deno.env.get("PAYU_MODE") ?? "test") === "live" ? "https://secure.payu.in/_payment" : "https://test.payu.in/_payment";
    const appBase = Deno.env.get("APP_BASE_URL") ?? "http://localhost:8080";

    const txnid = `BR-${appointment_id.slice(0, 8)}-${Date.now()}`;
    const amount = (appt.amount_cents / 100).toFixed(2);
    const productinfo = `BreatheRise session (${appt.duration_minutes} min)`;
    const firstname = appt.profiles?.full_name ?? "Customer";
    const email = appt.profiles?.email ?? user.email!;
    const surl = `${appBase}/payment/success?appointment=${appointment_id}`;
    const furl = `${appBase}/payment/failure?appointment=${appointment_id}`;

    const hashString = `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|||||||||||${salt}`;
    const hash = await sha512(hashString);

    await admin.from("appointments").update({ payu_txn_id: txnid }).eq("id", appointment_id);

    const fields: Record<string, string> = {
      key, txnid, amount, productinfo, firstname, email, surl, furl, hash, service_provider: "payu_paisa",
    };
    const inputs = Object.entries(fields).map(([k, v]) => `<input type="hidden" name="${k}" value="${v.replace(/"/g, "&quot;")}" />`).join("");
    const formHtml = `<form id="payuForm" method="post" action="${baseUrl}">${inputs}</form>`;

    return new Response(JSON.stringify({ formHtml, txnid }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: corsHeaders });
  }
});
