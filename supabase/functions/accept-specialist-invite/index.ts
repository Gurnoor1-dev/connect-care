// Accept a specialist invitation. Creates the auth user (auto-confirmed), assigns specialist role,
// initializes their specialist_profiles row.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const { token, password, full_name } = await req.json();
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: invite } = await admin.from("specialist_invitations").select("*").eq("token", token).maybeSingle();
  if (!invite || invite.status !== "pending" || new Date(invite.expires_at) < new Date()) {
    return new Response(JSON.stringify({ error: "Invitation invalid or expired" }), { status: 400, headers: corsHeaders });
  }

  // Mark accepted FIRST so the handle_new_user trigger sees it and skips default 'customer' role assignment.
  await admin.from("specialist_invitations").update({ status: "accepted", accepted_at: new Date().toISOString() }).eq("id", invite.id);

  // Create or fetch the user
  let userId: string | null = null;
  const { data: created, error } = await admin.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: full_name ?? invite.full_name, notifications_opt_in: true },
  });
  if (error) {
    // user may already exist — look them up
    const { data: list } = await admin.auth.admin.listUsers();
    userId = list.users.find((u) => u.email === invite.email)?.id ?? null;
    if (!userId) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
  } else {
    userId = created.user!.id;
  }

  await admin.from("user_roles").upsert({ user_id: userId, role: "specialist" }, { onConflict: "user_id,role" });
  await admin.from("specialist_profiles").upsert({
    id: userId,
    display_name: full_name ?? invite.full_name ?? invite.email.split("@")[0],
    is_published: false,
  });

  return new Response(JSON.stringify({ ok: true, user_id: userId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
