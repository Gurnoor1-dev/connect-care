import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Calendar, Video, Users,
  ClipboardList, Mail, ShieldCheck, LogOut, DollarSign, Clock, User, Menu,
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

function NavItems({ nav, onNavigate }: { nav: typeof customerNav; onNavigate?: () => void }) {
  return (
    <>
      {nav.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.end}
          onClick={onNavigate}
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
  );

  return (
    <div className="flex min-h-screen bg-muted/20">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r bg-card lg:flex lg:flex-col">
        <div className="flex h-16 items-center border-b px-5"><Logo className="h-7" /></div>
        <nav className="flex-1 space-y-1 p-3">
          <NavItems nav={nav} />
        </nav>
        <SidebarFooter />
      </aside>

      {/* Mobile sidebar sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0 flex flex-col">
          <SheetHeader className="flex h-16 items-center border-b px-5 space-y-0">
            <SheetTitle className="flex items-center justify-start w-full">
              <Logo className="h-7" />
            </SheetTitle>
          </SheetHeader>
          <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
            <NavItems nav={nav} onNavigate={() => setMobileOpen(false)} />
          </nav>
          <SidebarFooter />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b bg-card px-4 lg:px-8">
          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          {/* Logo visible on mobile (hamburger is left, logo center-ish) */}
          <div className="lg:hidden absolute left-1/2 -translate-x-1/2">
            <Logo className="h-7" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
