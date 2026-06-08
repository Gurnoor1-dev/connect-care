// PayU server-to-server webhook. Verifies reverse hash, marks appointment confirmed.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

async function sha512(s: string) {
  const hash = await crypto.subtle.digest("SHA-512", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const form = await req.formData();
  const get = (k: string) => String(form.get(k) ?? "");
  const status = get("status");
  const key = get("key");
  const txnid = get("txnid");
  const amount = get("amount");
  const productinfo = get("productinfo");
  const firstname = get("firstname");
  const email = get("email");
  const posted = get("hash");
  const mihpayid = get("mihpayid");
  const salt = Deno.env.get("PAYU_MERCHANT_SALT")!;

  // Reverse hash: salt|status|||||||||||email|firstname|productinfo|amount|txnid|key
  const calc = await sha512(`${salt}|${status}|||||||||||${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`);
  if (calc !== posted) return new Response("invalid hash", { status: 400 });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const newStatus = status === "success" ? "confirmed" : "cancelled";
  await admin.from("appointments").update({ status: newStatus, payu_mihpayid: mihpayid }).eq("payu_txn_id", txnid);
  return new Response("ok");
});
