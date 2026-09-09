// Accept a specialist invitation. Creates the auth user unconfirmed, assigns the
// specialist role, initializes their profile, then sends an email OTP.
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
    const { token, password, full_name } = await req.json();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const appBase = Deno.env.get("APP_BASE_URL") || req.headers.get("origin") || "";
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: invite } = await admin
      .from("specialist_invitations")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (!invite || invite.status !== "pending" || new Date(invite.expires_at) < new Date()) {
      return json({ error: "Invitation invalid or expired" }, 400);
    }

    await admin
      .from("specialist_invitations")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", invite.id);

    let userId: string | null = null;
    const { data: created, error } = await admin.auth.admin.createUser({
      email: invite.email,
      password,
      email_confirm: false,
      user_metadata: { full_name: full_name ?? invite.full_name, notifications_opt_in: true },
    });

    if (error) {
      const { data: list } = await admin.auth.admin.listUsers();
      userId = list.users.find((u) => u.email === invite.email)?.id ?? null;
      if (!userId) return json({ error: error.message }, 400);
    } else {
      userId = created.user!.id;
    }

    await admin.from("user_roles").upsert({ user_id: userId, role: "specialist" }, { onConflict: "user_id,role" });
    await admin.from("specialist_profiles").upsert({
      id: userId,
      display_name: full_name ?? invite.full_name ?? invite.email.split("@")[0],
      is_published: false,
      availability_status: "offline",
    });

    const { error: otpError } = await admin.auth.signInWithOtp({
      email: invite.email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: appBase ? `${appBase}/auth/callback?redirect=/dashboard/specialist` : undefined,
      },
    });

    if (otpError) return json({ error: otpError.message }, 400);

    return json({ ok: true, user_id: userId, requires_email_verification: true, email: invite.email });
  } catch (error) {
    console.error("accept-specialist-invite error", error);
    return json({ error: "Unexpected invite acceptance error" }, 500);
  }
});
