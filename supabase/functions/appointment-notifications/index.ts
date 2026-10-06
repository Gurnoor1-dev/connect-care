import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const APP_URL = "https://www.breatherise.com";
const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function json(x: unknown, s = 200) {
  return new Response(JSON.stringify(x), {
    status: s,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function esc(v: unknown) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shell(pre: string, body: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#18243a"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 12px"><table width="100%" style="max-width:640px;background:linear-gradient(135deg,#5b5cf0,#8b5cf6 48%,#ec4899);border-radius:28px;overflow:hidden"><tr><td style="padding:34px 24px 70px;text-align:center;color:#fff"><b style="letter-spacing:3px">BreatheRise</b><div style="font:700 34px Georgia,serif;margin-top:16px">A calmer way forward.</div><div style="margin-top:10px">${esc(pre)}</div></td></tr><tr><td style="padding:0 16px 16px"><table width="100%" style="background:#fff;border-radius:22px"><tr><td style="padding:34px 30px">${body}</td></tr></table></td></tr></table></td></tr></table></body></html>`;
}

async function mail(to: string, subject: string, pre: string, body: string) {
  const key = Deno.env.get("BREVO_API_KEY") ?? Deno.env.get("SMTP_PASSWORD");
  const from = Deno.env.get("BREVO_FROM_EMAIL") ?? Deno.env.get("SMTP_FROM") ?? "noreply@breatherise.com";
  if (!key) throw new Error("Brevo is not configured: set BREVO_API_KEY in Supabase secrets");
  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": key, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      sender: { name: "BreatheRise", email: from },
      replyTo: { email: from },
      to: [{ email: to }],
      subject,
      htmlContent: shell(pre, body),
      tags: ["appointment_notification"],
    }),
  });
  const raw = await r.text();
  if (!r.ok) throw new Error(`Brevo API error ${r.status}: ${raw}`);
  try {
    return JSON.parse(raw).messageId ?? null;
  } catch {
    return null;
  }
}

async function details(id: string) {
  const { data, error } = await admin
    .from("appointments")
    .select("*, specialist:specialist_profiles!appointments_specialist_id_fkey(display_name,timezone)")
    .eq("id", id)
    .single();
  if (error || !data) throw new Error(error?.message ?? "Appointment not found");
  const c = await admin.auth.admin.getUserById(data.customer_id);
  const s = await admin.auth.admin.getUserById(data.specialist_id);
  return { a: data, c: c.data.user, s: s.data.user };
}

function when(a: any) {
  return new Date(a.scheduled_at).toLocaleString("en-IN", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: a.specialist?.timezone || "UTC",
  });
}

function card(a: any, w: string, extra: string) {
  return `<div style="margin:24px 0;padding:20px;border-radius:16px;background:#f7f4ff;border:1px solid #eee8ff"><b style="color:#6d4df5">SESSION DETAILS</b><div style="margin-top:10px;line-height:1.8"><b>Date & time</b><br>${esc(w)}<br><br><b>Duration</b><br>${esc(a.duration_minutes)} minutes${extra ? `<br><br>${extra}` : ""}</div></div>`;
}

async function booking(id: string) {
  const { a, c, s } = await details(id);
  if (a.booking_email_sent_at) return;

  const w = when(a);
  const cn = a.customer_name || c?.user_metadata?.full_name || c?.email || "your client";
  const sn = s?.user_metadata?.full_name || a.specialist?.display_name || s?.email || "your specialist";

  const sends: Promise<unknown>[] = [];
  if (s?.email) {
    sends.push(mail(
      s.email,
      "New BreatheRise session booked ✨",
      "A new client session has been confirmed.",
      `<h1 style="font:700 32px Georgia,serif">A new session is booked.</h1><p>Hi ${esc(sn)}, ${esc(cn)} has booked a session with you.</p>${card(a, w, `<b>Client</b><br>${esc(cn)}`)}<a href="${APP_URL}" style="display:inline-block;padding:14px 24px;background:#6d4df5;color:#fff;border-radius:12px;text-decoration:none;font-weight:700">Open BreatheRise →</a>`,
    ));
  }
  if (c?.email) {
    sends.push(mail(
      c.email,
      "Your BreatheRise appointment is confirmed ✨",
      "Your session details are ready.",
      `<h1 style="font:700 32px Georgia,serif">Your session is confirmed. ✨</h1><p>Your BreatheRise session with ${esc(sn)} is booked and ready.</p>${card(a, w, `<b>Specialist</b><br>${esc(sn)}`)}<a href="${APP_URL}" style="display:inline-block;padding:14px 24px;background:#6d4df5;color:#fff;border-radius:12px;text-decoration:none;font-weight:700">Visit BreatheRise →</a>`,
    ));
  }
  await Promise.all(sends);
  await admin.from("appointments").update({ booking_email_sent_at: new Date().toISOString() }).eq("id", id).is("booking_email_sent_at", null);
}

type ReminderStage = 30 | 10 | 1;

async function reminder(id: string, stage: ReminderStage) {
  const { a, c, s } = await details(id);
  const sentColumn = stage === 30
    ? "reminder_30_email_sent_at"
    : stage === 10
      ? "reminder_10_email_sent_at"
      : "reminder_1_email_sent_at";

  if (a[sentColumn]) return;

  const w = when(a);
  const stageText = stage === 30 ? "30 minutes" : stage === 10 ? "10 minutes" : "1 minute";
  const body = `<h1 style="font:700 32px Georgia,serif">Your session starts in ${stageText}.</h1><p>This is your ${stageText} BreatheRise session reminder.</p>${card(a, w, "")}<a href="${APP_URL}" style="display:inline-block;padding:14px 24px;background:#6d4df5;color:#fff;border-radius:12px;text-decoration:none;font-weight:700">Open BreatheRise →</a>`;
  const subject = `BreatheRise session starts in ${stageText} ⏰`;
  const sends: Promise<unknown>[] = [];
  if (s?.email) sends.push(mail(s.email, subject, `Your appointment starts in ${stageText}.`, body));
  if (c?.email) sends.push(mail(c.email, subject, `Your appointment starts in ${stageText}.`, body));

  await Promise.all(sends);
  await admin
    .from("appointments")
    .update({
      [sentColumn]: new Date().toISOString(),
      reminder_email_sent_at: new Date().toISOString(),
    })
    .eq("id", id)
    .is(sentColumn, null);
}

async function noShow(id: string) {
  const { a, c, s } = await details(id);
  if (a.no_show_email_sent_at) return;
  const body = `<h1 style="font:700 32px Georgia,serif">Appointment closed.</h1><p>The session was not joined within 10 minutes of its scheduled start time, so the appointment has been marked as <b>Didn't attend</b>.</p><a href="${APP_URL}" style="color:#6d4df5;font-weight:700">Visit BreatheRise →</a>`;
  const sends: Promise<unknown>[] = [];
  if (s?.email) sends.push(mail(s.email, "BreatheRise appointment not attended", "Appointment attendance update.", body));
  if (c?.email) sends.push(mail(c.email, "BreatheRise appointment not attended", "Appointment attendance update.", body));
  await Promise.all(sends);
  await admin.from("appointments").update({ no_show_email_sent_at: new Date().toISOString() }).eq("id", id).is("no_show_email_sent_at", null);
}

async function sweep() {
  await admin.rpc("expire_unattended_appointments");
  const now = Date.now();
  const stages: Array<{ stage: ReminderStage; from: number; to: number }> = [
    { stage: 30, from: 29, to: 31 },
    { stage: 10, from: 9, to: 11 },
    { stage: 1, from: 0, to: 2 },
  ];

  for (const item of stages) {
    const lo = new Date(now + item.from * 60 * 1000).toISOString();
    const hi = new Date(now + item.to * 60 * 1000).toISOString();
    const sentColumn = item.stage === 30
      ? "reminder_30_email_sent_at"
      : item.stage === 10
        ? "reminder_10_email_sent_at"
        : "reminder_1_email_sent_at";

    const { data: rows, error } = await admin
      .from("appointments")
      .select("id")
      .eq("status", "confirmed")
      .is(sentColumn, null)
      .gt("scheduled_at", lo)
      .lte("scheduled_at", hi);

    if (error) throw error;
    for (const row of rows ?? []) await reminder(row.id, item.stage);
  }

  const { data: n, error: noShowError } = await admin
    .from("appointments")
    .select("id")
    .eq("status", "no_show")
    .is("no_show_email_sent_at", null);

  if (noShowError) throw noShowError;
  for (const x of n ?? []) await noShow(x.id);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  try {
    const { action, appointment_id, reminder_stage } = await req.json();
    if (action === "booking" && appointment_id) await booking(appointment_id);
    else if (action === "reminder" && appointment_id && [30, 10, 1].includes(Number(reminder_stage))) {
      await reminder(appointment_id, Number(reminder_stage) as ReminderStage);
    } else if (action === "no_show" && appointment_id) await noShow(appointment_id);
    else if (action === "sweep") await sweep();
    else return json({ error: "Invalid action" }, 400);
    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
