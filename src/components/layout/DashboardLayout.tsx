import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { CreditBadge } from "@/components/CreditBadge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard, Calendar, Users, ClipboardList, Mail, ShieldCheck, LogOut, DollarSign, CreditCard, Clock, User, Menu, type LucideIcon } from "lucide-react";

type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean };
const customerNav: NavItem[] = [{ to: "/dashboard/customer", label: "Overview", icon: LayoutDashboard, end: true }, { to: "/dashboard/customer/appointments", label: "Appointments", icon: Calendar }];
const specialistNav: NavItem[] = [{ to: "/dashboard/specialist", label: "Overview", icon: LayoutDashboard, end: true }, { to: "/dashboard/specialist/patients", label: "Private notes", icon: ClipboardList }, { to: "/dashboard/specialist/availability", label: "Availability", icon: Clock }, { to: "/dashboard/specialist/tiers", label: "Session tiers", icon: DollarSign }, { to: "/dashboard/specialist/profile", label: "Profile", icon: User }];
const adminNav: NavItem[] = [{ to: "/dashboard/admin", label: "Overview", icon: LayoutDashboard, end: true }, { to: "/dashboard/admin/invitations", label: "Specialist invites", icon: Mail }, { to: "/dashboard/admin/users", label: "Users", icon: Users }, { to: "/dashboard/admin/tiers", label: "Pricing & tiers", icon: DollarSign }, { to: "/dashboard/admin/payments", label: "Payments & income", icon: CreditCard }];

function NavItems({ nav, onNavigate }: { nav: NavItem[]; onNavigate?: () => void }) {
  return <>{nav.map((item) => <NavLink key={item.to} to={item.to} end={item.end} onClick={onNavigate} className={({ isActive }) => `group flex min-w-0 items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? "border-[#c4d4c0] bg-[#e4ecdf] text-[#204b3b] dark:border-[#476450] dark:bg-[#294737] dark:text-[#eff5e9]" : "border-transparent text-[#637669] hover:border-[#d5dfd1] hover:bg-[#f0f2e9] hover:text-[#204b3b] dark:text-[#c0d0c2] dark:hover:border-[#3e5b48] dark:hover:bg-[#233d30] dark:hover:text-white"}`}><item.icon className="h-4 w-4 shrink-0 opacity-80 group-hover:opacity-100" /><span className="truncate">{item.label}</span></NavLink>)}</>;
}

export function DashboardLayout() {
  const { role, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = role === "admin" ? adminNav : role === "specialist" ? specialistNav : customerNav;
  const onSignOut = async () => { await signOut(); navigate("/"); };
  const SidebarFooter = () => <div className="border-t border-[#d4dfd0] bg-[#f0f2e9] p-3 dark:border-[#344e3c] dark:bg-[#1b3025]"><div className="mb-2 min-w-0 rounded-xl border border-[#d6dfd1] bg-[#fbfaf4] px-3 py-3 text-xs text-[#65796b] dark:border-[#344e3c] dark:bg-[#20392b] dark:text-[#c0d0c2]"><div className="truncate font-semibold text-[#204b3b] dark:text-[#edf4e8]">{user?.email}</div><div className="mt-1.5 flex items-center gap-1.5 capitalize"><ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#65866a]" />{role}</div></div><Button variant="ghost" size="sm" className="w-full justify-start rounded-xl text-[#526b59] hover:bg-[#e4ecdf] hover:text-[#204b3b] dark:text-[#c0d0c2] dark:hover:bg-[#294737] dark:hover:text-white" onClick={onSignOut}><LogOut className="mr-2 h-4 w-4" />Sign out</Button></div>;

  return <div className="flex min-h-screen min-w-0 overflow-x-clip bg-[#f4f3e9] text-[#204b3b] dark:bg-[#14271e] dark:text-[#edf4e8]">
    <aside className="hidden w-64 shrink-0 flex-col border-r border-[#d4dfd0] bg-[#fbfaf4] lg:flex dark:border-[#344e3c] dark:bg-[#192e23]">
      <div className="relative flex h-[84px] items-center overflow-hidden border-b border-[#d4dfd0] px-5 dark:border-[#344e3c]"><div className="pointer-events-none absolute -right-6 -top-10 h-24 w-24 rounded-full border border-[#cbdac5] dark:border-[#45624c]" /><Logo className="relative z-10 h-8" /></div>
      <nav aria-label="Dashboard navigation" className="flex-1 space-y-1 overflow-y-auto p-3"><NavItems nav={nav} /></nav><SidebarFooter />
    </aside>
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}><SheetContent side="left" className="flex w-[min(86vw,340px)] flex-col border-r border-[#d4dfd0] bg-[#fbfaf4] p-0 dark:border-[#344e3c] dark:bg-[#192e23]"><SheetHeader className="flex h-[84px] items-center border-b border-[#d4dfd0] px-5 dark:border-[#344e3c]"><SheetTitle className="flex w-full items-center justify-start"><Logo className="h-8" /></SheetTitle></SheetHeader><nav aria-label="Mobile dashboard navigation" className="flex-1 space-y-1 overflow-y-auto p-3"><NavItems nav={nav} onNavigate={() => setMobileOpen(false)} /></nav><SidebarFooter /></SheetContent></Sheet>
    <div className="flex min-w-0 flex-1 flex-col"><header className="sticky top-0 z-30 flex h-16 min-w-0 items-center border-b border-[#d4dfd0] bg-[#f8f7ef]/95 px-3 backdrop-blur-xl sm:px-5 lg:px-8 dark:border-[#344e3c] dark:bg-[#182c22]/95"><Button variant="ghost" size="icon" className="rounded-full text-[#315b49] hover:bg-[#e4ecdf] dark:text-[#d9e7d5] dark:hover:bg-[#294737] lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation menu"><Menu className="h-5 w-5" /></Button><div className="pointer-events-none absolute left-1/2 -translate-x-1/2 lg:hidden"><Logo className="h-7" /></div><div className="ml-auto flex items-center gap-2"><CreditBadge /><ThemeToggle /></div></header><main className="min-w-0 flex-1 p-3 sm:p-5 lg:p-8"><Outlet /></main></div>
  </div>;
}
