import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CreditBadge } from "@/components/CreditBadge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowUpRight, Menu } from "lucide-react";

const nav = [
  { to: "/", label: "Home", end: true }, { to: "/how-it-works", label: "How it works" },
  { to: "/specialists", label: "Specialists" }, { to: "/about", label: "About" }, { to: "/contact", label: "Contact" },
];
function PublicNav({ onNavigate }: { onNavigate?: () => void }) { return <>{nav.map(n => <NavLink key={n.to} to={n.to} end={n.end} onClick={onNavigate} className={({isActive}) => `rounded-full px-3 py-2 text-sm font-medium transition-colors ${isActive ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/65 hover:text-foreground"}`}>{n.label}</NavLink>)}</>; }

export function PublicLayout() {
  const { user } = useAuth(); const [mobileOpen,setMobileOpen]=useState(false);
  return <div className="flex min-h-screen min-w-0 flex-col overflow-x-clip bg-background">
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 min-w-0 items-center justify-between gap-3 sm:h-[72px]">
        <Link to="/" aria-label="BreatheRise home" className="shrink-0"><Logo className="h-8 sm:h-9" /></Link>
        <nav className="hidden items-center gap-0.5 lg:flex"><PublicNav /></nav>
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <div className="hidden xl:block"><CreditBadge /></div><ThemeToggle />
          {user ? <Button asChild size="sm" className="hidden rounded-full bg-primary px-4 text-primary-foreground shadow-brand sm:inline-flex"><Link to="/dashboard">Dashboard<ArrowUpRight className="ml-1.5 h-4 w-4" /></Link></Button> : <>
            <Button asChild variant="ghost" size="sm" className="hidden rounded-full sm:inline-flex"><Link to="/login">Sign in</Link></Button>
            <Button asChild size="sm" className="hidden rounded-full bg-primary px-4 text-primary-foreground shadow-brand sm:inline-flex"><Link to="/signup">Get started<ArrowUpRight className="ml-1.5 h-4 w-4" /></Link></Button>
          </>}
          <Button variant="ghost" size="icon" className="rounded-full lg:hidden" onClick={()=>setMobileOpen(true)} aria-label="Open navigation menu"><Menu className="h-5 w-5" /></Button>
        </div>
      </div>
    </header>
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}><SheetContent side="right" className="flex w-[min(88vw,360px)] flex-col bg-background/98 p-0 backdrop-blur-xl">
      <SheetHeader className="border-b border-border/70 px-5 py-5"><SheetTitle className="flex items-center justify-start"><Logo className="h-8" /></SheetTitle></SheetHeader>
      <nav className="flex flex-col gap-1 p-4"><PublicNav onNavigate={()=>setMobileOpen(false)} /></nav>
      <div className="mt-auto space-y-3 border-t border-border/70 p-4"><CreditBadge />{user ? <Button asChild className="w-full rounded-full bg-primary text-primary-foreground shadow-brand" onClick={()=>setMobileOpen(false)}><Link to="/dashboard">Dashboard</Link></Button> : <><Button asChild variant="outline" className="w-full rounded-full" onClick={()=>setMobileOpen(false)}><Link to="/login">Sign in</Link></Button><Button asChild className="w-full rounded-full bg-primary text-primary-foreground shadow-brand" onClick={()=>setMobileOpen(false)}><Link to="/signup">Get started</Link></Button></>}</div>
    </SheetContent></Sheet>
    <main className="min-w-0 flex-1"><Outlet /></main>
    <footer className="border-t border-border/70 bg-secondary/35">
      <div className="container mx-auto grid gap-8 py-10 sm:py-14 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <div className="min-w-0"><Logo className="h-8 sm:h-9"/><p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">Breathe deeply. Rise higher. Thoughtful support and performance coaching for a healthier, more balanced mind.</p><Button asChild variant="outline" size="sm" className="mt-5 rounded-full"><Link to="/book">Find your support<ArrowUpRight className="ml-1.5 h-4 w-4" /></Link></Button></div>
        <div><h4 className="mb-4 text-sm font-semibold">Explore</h4><ul className="space-y-3 text-sm text-muted-foreground"><li><Link to="/how-it-works" className="hover:text-foreground">How it works</Link></li><li><Link to="/specialists" className="hover:text-foreground">Specialists</Link></li><li><Link to="/book" className="hover:text-foreground">Book a session</Link></li></ul></div>
        <div><h4 className="mb-4 text-sm font-semibold">Company</h4><ul className="space-y-3 text-sm text-muted-foreground"><li><Link to="/about" className="hover:text-foreground">About us</Link></li><li><Link to="/contact" className="hover:text-foreground">Contact</Link></li></ul></div>
        <div><h4 className="mb-4 text-sm font-semibold">Support</h4><ul className="space-y-3 text-sm text-muted-foreground"><li>Privacy</li><li>Terms</li><li>Safety & crisis support</li></ul></div>
      </div>
      <div className="border-t border-border/70 px-4 py-5 text-center text-xs leading-5 text-muted-foreground"><strong className="text-foreground">Important:</strong> BreatheRise is a peer-support and coaching platform, not a substitute for clinical medical advice. In crisis, call emergency services. If you are experiencing thoughts of self-harm, contact your local crisis line immediately (US: 988 · UK: 116 123 · EU: 112).</div>
      <div className="border-t border-border/70 px-4 py-5 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} BreatheRise. All rights reserved.</div>
    </footer>
  </div>;
}
