import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase, type AppRole } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const AuthCtx = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRole = async (uid: string | undefined) => {
    if (!uid) { setRole(null); return; }
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .order("role", { ascending: true })
      .limit(1)
      .maybeSingle();
    setRole((data?.role as AppRole) ?? "customer");
  };

  useEffect(() => {
    let deletedUserChannel: ReturnType<typeof supabase.channel> | null = null;
    let activeUserId: string | undefined;

    const forceLogoutDeletedUser = () => {
      setSession(null);
      setUser(null);
      setRole(null);
      void supabase.auth.signOut();
    };

    const watchDeletedUser = (uid: string | undefined) => {
      if (!uid || uid === activeUserId) return;
      if (deletedUserChannel) void supabase.removeChannel(deletedUserChannel);
      activeUserId = uid;
      deletedUserChannel = supabase
        .channel(`account-deletion-${uid}`)
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "profiles", filter: `id=eq.${uid}` },
          (payload) => {
            if (payload.old?.id === uid) forceLogoutDeletedUser();
          },
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "user_roles", filter: `user_id=eq.${uid}` },
          (payload) => {
            if (payload.old?.user_id === uid) forceLogoutDeletedUser();
          },
        )
        .subscribe();
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      watchDeletedUser(s?.user?.id);
      setTimeout(() => { loadRole(s?.user?.id); }, 0);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      watchDeletedUser(data.session?.user?.id);
      loadRole(data.session?.user?.id).finally(() => setLoading(false));
    });
    return () => {
      sub.subscription.unsubscribe();
      if (deletedUserChannel) void supabase.removeChannel(deletedUserChannel);
    };
  }, []);

  const signOut = async () => { await supabase.auth.signOut(); };
  const refreshRole = async () => { await loadRole(user?.id); };

  return (
    <AuthCtx.Provider value={{ user, session, role, loading, signOut, refreshRole }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
