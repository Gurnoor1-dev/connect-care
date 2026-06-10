import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CreditBadge } from "@/components/CreditBadge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { Menu } from "lucide-react";

const nav = [
  { to: "/", label: "Home", end: true },
  { to: "/how-it-works", label: "How it works" },
  { to: "/specialists", label: "Specialists" },
  { to: "/book", label: "Book" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

function PublicNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      {nav.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
              isActive ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/65 hover:text-foreground"
            }`
          }
        >
          {n.label}
        </NavLink>
      ))}
    </>
  );
}

export function PublicLayout() {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/82 shadow-sm backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Logo className="h-8" />
          <nav className="hidden items-center gap-1 lg:flex"><PublicNav /></nav>
          <div className="flex items-center gap-2">
            <CreditBadge />
            <ThemeToggle />
            {user ? (
              <Button asChild size="sm" className="hidden bg-gradient-brand text-primary-foreground shadow-brand sm:inline-flex">
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex"><Link to="/login">Sign in</Link></Button>
                <Button asChild size="sm" className="hidden bg-gradient-brand text-primary-foreground shadow-brand sm:inline-flex"><Link to="/signup">Get started</Link></Button>
              </>
            )}
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation menu">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="flex w-72 flex-col bg-card/95 p-0 backdrop-blur-xl">
          <SheetHeader className="border-b px-5 py-4"><SheetTitle className="flex items-center justify-start"><Logo className="h-8" /></SheetTitle></SheetHeader>
          <nav className="flex flex-col gap-1 p-4"><PublicNav onNavigate={() => setMobileOpen(false)} /></nav>
          <div className="mt-auto space-y-2 border-t p-4">
            <CreditBadge />
            {user ? (
              <Button asChild className="w-full bg-gradient-brand text-primary-foreground shadow-brand" onClick={() => setMobileOpen(false)}><Link to="/dashboard">Dashboard</Link></Button>
            ) : (
              <>
                <Button asChild variant="outline" className="w-full" onClick={() => setMobileOpen(false)}><Link to="/login">Sign in</Link></Button>
                <Button asChild className="w-full bg-gradient-brand text-primary-foreground shadow-brand" onClick={() => setMobileOpen(false)}><Link to="/signup">Get started</Link></Button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <main className="flex-1"><Outlet /></main>
      <footer className="border-t bg-card/70 backdrop-blur">
        <div className="container mx-auto grid gap-8 px-4 py-12 md:grid-cols-4">
          <div><Logo className="h-8" /><p className="mt-3 max-w-xs text-sm text-muted-foreground">Breathe deeply. Rise higher. Performance coaching for the modern mind.</p></div>
          <div><h4 className="mb-3 text-sm font-semibold">Product</h4><ul className="space-y-2 text-sm text-muted-foreground"><li><Link to="/how-it-works" className="hover:text-foreground">How it works</Link></li><li><Link to="/specialists" className="hover:text-foreground">Specialists</Link></li><li><Link to="/book" className="hover:text-foreground">Book</Link></li></ul></div>
          <div><h4 className="mb-3 text-sm font-semibold">Company</h4><ul className="space-y-2 text-sm text-muted-foreground"><li><Link to="/about" className="hover:text-foreground">About</Link></li><li><Link to="/contact" className="hover:text-foreground">Contact</Link></li></ul></div>
          <div><h4 className="mb-3 text-sm font-semibold">Legal</h4><ul className="space-y-2 text-sm text-muted-foreground"><li>Privacy</li><li>Terms</li></ul></div>
        </div>
        <div className="border-t bg-gradient-to-r from-amber-500/10 via-card to-teal/10 px-4 py-4 text-center text-xs text-muted-foreground">
          <strong className="text-foreground">Important:</strong> BreatheRise is a peer-support and coaching platform, not a substitute for clinical medical advice. In crisis, call emergency services. If you are experiencing thoughts of self-harm, contact your local crisis line immediately (US: 988 · UK: 116 123 · EU: 112).
        </div>
        <div className="border-t py-5 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} BreatheRise. All rights reserved.</div>
      </footer>
    </div>
  );
}
