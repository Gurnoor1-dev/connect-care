import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Search, Users as UsersIcon, X, Trash2, AlertTriangle, Eye, EyeOff } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type UserRole = string;
type UserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
  roles: UserRole[];
  is_published: boolean | null;
};

export default function AdminUsers() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "specialist" | "customer">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [updatingVisibilityId, setUpdatingVisibilityId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadUsers = async () => {
      setLoading(true);
      setError("");

      const [
        { data: profiles, error: profilesError },
        { data: userRoles, error: rolesError },
        { data: specialistProfiles, error: specialistProfilesError },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, email, created_at")
          .order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("specialist_profiles").select("id, is_published"),
      ]);

      if (cancelled) return;

      if (profilesError || rolesError || specialistProfilesError) {
        setRows([]);
        setError(
          profilesError?.message ||
          rolesError?.message ||
          specialistProfilesError?.message ||
          "Could not load users.",
        );
        setLoading(false);
        return;
      }

      const rolesByUser = new Map<string, UserRole[]>();
      (userRoles ?? []).forEach(({ user_id, role }) => {
        const existing = rolesByUser.get(user_id) ?? [];
        existing.push(role);
        rolesByUser.set(user_id, existing);
      });

      const visibilityBySpecialist = new Map(
        (specialistProfiles ?? []).map(({ id, is_published }) => [id, is_published]),
      );

      setRows(
        (profiles ?? []).map((profile) => ({
          ...profile,
          roles: rolesByUser.get(profile.id) ?? [],
          is_published: visibilityBySpecialist.get(profile.id) ?? null,
        })),
      );
      setLoading(false);
    };

    loadUsers();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();

    return rows.filter((user) => {
      const matchesRole =
        roleFilter === "all" ||
        user.roles.includes(roleFilter);

      const matchesSearch =
        !search ||
        (user.full_name ?? "").toLowerCase().includes(search) ||
        (user.email ?? "").toLowerCase().includes(search) ||
        user.roles.some((role) => role.toLowerCase().includes(search)) ||
        (user.roles.includes("customer") && "client".includes(search));

      return matchesRole && matchesSearch;
    });
  }, [rows, q, roleFilter]);

  const toggleVisibility = async (user: UserRow) => {
    if (!user.roles.includes("specialist") || updatingVisibilityId) return;

    const nextVisibility = user.is_published !== true;
    setUpdatingVisibilityId(user.id);
    setError("");

    const { error: updateError } = await supabase
      .from("specialist_profiles")
      .update({ is_published: nextVisibility })
      .eq("id", user.id);

    if (updateError) {
      setError(updateError.message || "Could not update specialist visibility.");
      setUpdatingVisibilityId(null);
      return;
    }

    setRows((current) =>
      current.map((currentUser) =>
        currentUser.id === user.id
          ? { ...currentUser, is_published: nextVisibility }
          : currentUser,
      ),
    );
    setUpdatingVisibilityId(null);
  };

  const deleteUser = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    setDeleteError("");

    const { data, error: functionError } = await supabase.functions.invoke("admin-delete-user", {
      body: { user_id: deleteTarget.id },
    });

    if (functionError || data?.error) {
      setDeleteError(functionError?.message || data?.error || "Could not delete this user.");
      setDeletingId(null);
      return;
    }

    setRows((current) => current.filter((user) => user.id !== deleteTarget.id));
    setDeleteTarget(null);
    setDeletingId(null);
  };

  const roleLabel =
    roleFilter === "customer" ? "Client" :
    roleFilter === "specialist" ? "Specialist" :
    "All users";

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
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-10 text-center text-muted-foreground">Loading users...</td></tr>
              ) : error ? (
                <tr><td colSpan={4} className="p-10 text-center text-destructive">{error}</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} className="p-10 text-center text-muted-foreground">No users match your filters.</td></tr>
              ) : (
                filtered.map((user) => (
                  <tr key={user.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="p-3 font-medium">{user.full_name || "—"}</td>
                    <td className="p-3 text-muted-foreground">{user.email || "—"}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {user.roles.length ? user.roles.map((role) => (
                          <span key={role} className="rounded-full bg-secondary px-2 py-0.5 text-xs capitalize">
                            {role === "customer" ? "Client" : role}
                          </span>
                        )) : <span className="text-muted-foreground">—</span>}
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">{new Date(user.created_at).toLocaleDateString()}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {user.roles.includes("specialist") && (
                          <div className="flex items-center gap-1.5">
                            <Switch
                              checked={user.is_published === true}
                              onCheckedChange={() => void toggleVisibility(user)}
                              disabled={updatingVisibilityId === user.id || deletingId === user.id}
                              aria-label={`${user.is_published === true ? "Hide" : "Show"} ${user.full_name || user.email || "specialist"} on website`}
                              title={user.is_published === true ? "Visible on website — click to hide" : "Hidden from website — click to show"}
                            />
                            {user.is_published === true ? (
                              <Eye className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                            ) : (
                              <EyeOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                            )}
                          </div>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          aria-label={`Delete ${user.full_name || user.email || "user"}`}
                          onClick={() => { setDeleteError(""); setDeleteTarget(user); }}
                          disabled={deletingId === user.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => {
        if (!open && !deletingId) {
          setDeleteTarget(null);
          setDeleteError("");
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Permanently delete this user?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">⚠️ This permanently removes the user's account, profile, specialist data, appointments, credits, roles, and owned storage files.</span>
              <span className="block">A protected JSON deletion archive and recovery SQL will be kept in the deletion log.</span>
              {deleteTarget && (
                <span className="block font-medium text-foreground">
                  User: {deleteTarget.full_name || deleteTarget.email || deleteTarget.id}
                </span>
              )}
              {deleteError && <span className="block text-sm font-medium text-destructive">{deleteError}</span>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingId}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void deleteUser();
              }}
              disabled={!deleteTarget || !!deletingId}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deletingId ? "Deleting..." : "Yes, permanently delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
