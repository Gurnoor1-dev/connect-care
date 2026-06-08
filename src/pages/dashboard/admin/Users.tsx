import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function AdminUsers() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email, created_at, user_roles(role)")
        .order("created_at", { ascending: false })
        .limit(200);
      setRows(data ?? []);
    })();
  }, []);

  const filtered = rows.filter((r) =>
    !q ||
    (r.full_name ?? "").toLowerCase().includes(q.toLowerCase()) ||
    (r.email ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="mt-1 text-muted-foreground">All accounts on BreatheRise.</p>
        </div>
        <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="sm:max-w-xs" />
      </header>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-xs uppercase text-muted-foreground">
              <tr><th className="p-3 text-left">Name</th><th className="p-3 text-left">Email</th><th className="p-3 text-left">Roles</th><th className="p-3 text-left">Joined</th></tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{r.full_name ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{r.email}</td>
                  <td className="p-3">
                    {(r.user_roles ?? []).map((u: any) => (
                      <span key={u.role} className="mr-1 rounded-full bg-secondary px-2 py-0.5 text-xs">{u.role}</span>
                    ))}
                  </td>
                  <td className="p-3 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No users.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
