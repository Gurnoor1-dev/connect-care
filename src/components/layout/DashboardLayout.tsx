import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Calendar, Users,
  ClipboardList, Mail, ShieldCheck, LogOut, DollarSign, Clock, User, Menu,
  type LucideIcon,
} from "lucide-react";

type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean };

const customerNav: NavItem[] = [
  { to: "/dashboard/customer", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/dashboard/customer/appointments", label: "Appointments", icon: Calendar },
];
const specialistNav: NavItem[] = [
  { to: "/dashboard/specialist", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/dashboard/specialist/patients", label: "Private notes", icon: ClipboardList },
  { to: "/dashboard/specialist/availability", label: "Availability", icon: Clock },
  { to: "/dashboard/specialist/profile", label: "Profile", icon: User },
];
const adminNav: NavItem[] = [
  { to: "/dashboard/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/dashboard/admin/invitations", label: "Specialist invites", icon: Mail },
  { to: "/dashboard/admin/users", label: "Users", icon: Users },
  { to: "/dashboard/admin/tiers", label: "Pricing & tiers", icon: DollarSign },
];

function NavItems({ nav, onNavigate }: { nav: NavItem[]; onNavigate?: () => void }) {
  return (
    <>
      {nav.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
              isActive
                ? "bg-gradient-brand text-primary-foreground shadow-brand"
                : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
            }`
          }
        >
          <n.icon className="h-4 w-4" />{n.label}
        </NavLink>
      ))}
    </>
  );
}

export function DashboardLayout() {
  const { role, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = role === "admin" ? adminNav : role === "specialist" ? specialistNav : customerNav;

  const onSignOut = async () => { await signOut(); navigate("/"); };

  const SidebarFooter = () => (
    <div className="border-t bg-card/60 p-3">
      <div className="mb-2 rounded-lg bg-gradient-to-br from-accent/70 to-card px-3 py-2 text-xs text-muted-foreground">
        <div className="truncate font-medium text-foreground">{user?.email}</div>
        <div className="mt-0.5 flex items-center gap-1 capitalize">
          <ShieldCheck className="h-3 w-3" /> {role}
        </div>
      </div>
      <Button variant="ghost" size="sm" className="w-full justify-start" onClick={onSignOut}>
        <LogOut className="mr-2 h-4 w-4" /> Sign out
      </Button>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gradient-dashboard">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r bg-card/88 shadow-brand backdrop-blur-xl lg:flex lg:flex-col">
        <div className="flex h-16 items-center border-b px-5"><Logo className="h-7" /></div>
        <nav className="flex-1 space-y-1 p-3">
          <NavItems nav={nav} />
        </nav>
        <SidebarFooter />
      </aside>

      {/* Mobile sidebar sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="flex w-64 flex-col bg-card/95 p-0 backdrop-blur-xl">
          <SheetHeader className="flex h-16 items-center border-b px-5">
            <SheetTitle className="flex w-full items-center justify-start">
              <Logo className="h-7" />
            </SheetTitle>
          </SheetHeader>
          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            <NavItems nav={nav} onNavigate={() => setMobileOpen(false)} />
          </nav>
          <SidebarFooter />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card/82 px-4 shadow-sm backdrop-blur-xl lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="absolute left-1/2 -translate-x-1/2 lg:hidden">
            <Logo className="h-7" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-5 lg:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
