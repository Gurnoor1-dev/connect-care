import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Calendar, Video, Users, Settings,
  ClipboardList, Mail, ShieldCheck, LogOut, DollarSign, Clock, User,
} from "lucide-react";

const customerNav = [
  { to: "/dashboard/customer", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/dashboard/customer/appointments", label: "Appointments", icon: Calendar },
  { to: "/dashboard/customer/book", label: "Book session", icon: Video },
];
const specialistNav = [
  { to: "/dashboard/specialist", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/dashboard/specialist/patients", label: "Patient notes", icon: ClipboardList },
  { to: "/dashboard/specialist/availability", label: "Availability", icon: Clock },
  { to: "/dashboard/specialist/tiers", label: "Pricing tiers", icon: DollarSign },
  { to: "/dashboard/specialist/profile", label: "Profile", icon: User },
];
const adminNav = [
  { to: "/dashboard/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/dashboard/admin/invitations", label: "Specialist invites", icon: Mail },
  { to: "/dashboard/admin/users", label: "Users", icon: Users },
];

export function DashboardLayout() {
  const { role, user, signOut } = useAuth();
  const navigate = useNavigate();

  const nav = role === "admin" ? adminNav : role === "specialist" ? specialistNav : customerNav;

  const onSignOut = async () => { await signOut(); navigate("/"); };

  return (
    <div className="flex min-h-screen bg-muted/20">
      <aside className="hidden w-64 shrink-0 border-r bg-card lg:flex lg:flex-col">
        <div className="flex h-16 items-center border-b px-5"><Logo className="h-7" /></div>
        <nav className="flex-1 space-y-1 p-3">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-gradient-brand text-primary-foreground shadow-brand"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`
              }
            >
              <n.icon className="h-4 w-4" />{n.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t p-3">
          <div className="mb-2 px-2 text-xs text-muted-foreground">
            <div className="font-medium text-foreground truncate">{user?.email}</div>
            <div className="flex items-center gap-1 mt-0.5">
              <ShieldCheck className="h-3 w-3" /> {role}
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={onSignOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b bg-card px-4 lg:px-8">
          <div className="lg:hidden"><Logo className="h-7" /></div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={onSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
