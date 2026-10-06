import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const isPasswordReset = params.get("reset") === "1";

    const handleSession = (session: unknown) => {
      if (isPasswordReset && session) {
        navigate("/change-password", { replace: true });
        return true;
      }
      return false;
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session) {
        if (handleSession(session)) return;

        const redirect = params.get("redirect") || "/dashboard";
        navigate(redirect, { replace: true });
      } else if (event === "INITIAL_SESSION") {
        if (handleSession(session)) return;
        if (!session) {
          const redirect = params.get("redirect") || "/login";
          navigate(redirect, { replace: true });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, params]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-page">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
