import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Users as UsersIcon, X } from "lucide-react";

type UserRole = "specialist" | "customer";
type UserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
  user_roles?: { role: UserRole }[];
};

export default function AdminUsers() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadUsers = async () => {
      setLoading(true);
      setError("");

      const { data, error: queryError } = await supabase
        .from("profiles")
        .select("id, full_name, email, created_at, user_roles(role)")
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (queryError) {
        setRows([]);
        setError(queryError.message);
      } else {
        setRows((data ?? []) as UserRow[]);
      }
      setLoading(false);
    };

    loadUsers();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();

    return rows.filter((user) => {
      const roles = (user.user_roles ?? []).map((item) => item.role);
      const matchesRole =
        roleFilter === "all" ||
        (roleFilter === "specialist" && roles.includes("specialist")) ||
        (roleFilter === "customer" && roles.includes("customer"));

      const matchesSearch =
        !search ||
        (user.full_name ?? "").toLowerCase().includes(search) ||
        (user.email ?? "").toLowerCase().includes(search) ||
        roles.some((role) => role.toLowerCase().includes(search));

      return matchesRole && matchesSearch;
    });
  }, [rows, q, roleFilter]);

  const roleLabel = roleFilter === "customer" ? "Client" : roleFilter === "specialist" ? "Specialist" : "All users";

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="mt-1 text-muted-foreground">View and search all BreatheRise accounts.</p>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1 lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or role..."
              value={q}
              onChange={(event) => setQ(event.target.value)}
              className="pl-9 pr-9"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {([
              ["all", "All users"],
              ["specialist", "Specialists"],
              ["customer", "Clients"],
            ] as const).map(([value, label]) => (
              <Button
                key={value}
                type="button"
                variant={roleFilter === value ? "default" : "outline"}
                onClick={() => setRoleFilter(value)}
                className="rounded-full"
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <UsersIcon className="h-4 w-4" />
        <span>
          {loading ? "Loading users..." : `${filtered.length} ${roleLabel.toLowerCase()} found`}
        </span>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Role</th>
                <th className="p-3 text-left">Joined</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-10 text-center text-muted-foreground">Loading users...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={4} className="p-10 text-center text-destructive">{error}</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-10 text-center text-muted-foreground">No users match your filters.</td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr key={user.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="p-3 font-medium">{user.full_name || "—"}</td>
                    <td className="p-3 text-muted-foreground">{user.email || "—"}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {(user.user_roles ?? []).map(({ role }) => (
                          <span
                            key={role}
                            className="rounded-full bg-secondary px-2 py-0.5 text-xs capitalize"
                          >
                            {role === "customer" ? "Client" : role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
