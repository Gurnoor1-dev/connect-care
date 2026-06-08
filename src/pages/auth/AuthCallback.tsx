import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  useEffect(() => {
    // Supabase auto-handles the URL hash via detectSessionInUrl
    supabase.auth.getSession().then(({ data }) => {
      const redirect = params.get("redirect") || (data.session ? "/dashboard" : "/login");
      navigate(redirect, { replace: true });
    });
  }, [navigate, params]);
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
