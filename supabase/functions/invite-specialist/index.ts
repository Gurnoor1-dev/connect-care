// Admin-only: invite a specialist via email. Stores a row in specialist_invitations.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const auth = req.headers.get("Authorization") ?? "";
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
  if (!isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });

  const { email, full_name } = await req.json();
  const { data, error } = await admin.from("specialist_invitations").insert({ email, full_name, invited_by: user.id }).select().single();
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });

  // Optional: send email via Supabase Auth invite or your provider (Resend etc.) — see migrate.md
  const appBase = Deno.env.get("APP_BASE_URL") ?? "";
  const inviteUrl = `${appBase}/invite/${data.token}`;
  return new Response(JSON.stringify({ invitation: data, inviteUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
