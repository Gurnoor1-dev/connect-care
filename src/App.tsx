import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
const Index = lazy(() => import("@/pages/Index"));
const HowItWorks = lazy(() => import("@/pages/HowItWorks"));
const Specialists = lazy(() => import("@/pages/Specialists"));
const BookAppointment = lazy(() => import("@/pages/BookAppointment"));
const About = lazy(() => import("@/pages/About"));
const Contact = lazy(() => import("@/pages/Contact"));
const TrustCenter = lazy(() => import("@/pages/TrustCenter"));
const Privacy = lazy(() =>
  import("@/pages/Policies").then((module) => ({ default: module.Privacy })),
);
const Terms = lazy(() =>
  import("@/pages/Policies").then((module) => ({ default: module.Terms })),
);
const Cancellation = lazy(() =>
  import("@/pages/Policies").then((module) => ({ default: module.Cancellation })),
);
const NotFound = lazy(() => import("@/pages/NotFound"));
const Login = lazy(() => import("@/pages/auth/Login"));
const Signup = lazy(() => import("@/pages/auth/Signup"));
const VerifyOtp = lazy(() => import("@/pages/auth/VerifyOtp"));
const ForgotPassword = lazy(() => import("@/pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/auth/ResetPassword"));
const AuthCallback = lazy(() => import("@/pages/auth/AuthCallback"));
const AcceptInvite = lazy(() => import("@/pages/auth/AcceptInvite"));
const CustomerOverview = lazy(() => import("@/pages/dashboard/customer/Overview"));
const CustomerAppointments = lazy(() => import("@/pages/dashboard/customer/Appointments"));
const CustomerVideoCall = lazy(() => import("@/pages/dashboard/customer/VideoCall"));
const SpecialistOverview = lazy(() => import("@/pages/dashboard/specialist/Overview"));
const SpecialistAvailability = lazy(() => import("@/pages/dashboard/specialist/Availability"));
const SpecialistTiers = lazy(() => import("@/pages/dashboard/specialist/Tiers"));
const SpecialistProfile = lazy(() => import("@/pages/dashboard/specialist/Profile"));
const SpecialistVideoCall = lazy(() => import("@/pages/dashboard/specialist/VideoCall"));
const SpecialistPatients = lazy(() => import("@/pages/dashboard/specialist/Patients"));
const AdminOverview = lazy(() => import("@/pages/dashboard/admin/Overview"));
const AdminInvitations = lazy(() => import("@/pages/dashboard/admin/Invitations"));
const AdminUsers = lazy(() => import("@/pages/dashboard/admin/Users"));
const AdminTiers = lazy(() => import("@/pages/dashboard/admin/Tiers"));
const AdminPayments = lazy(() => import("@/pages/dashboard/admin/Payments"));
const DashboardRedirect = lazy(() => import("@/pages/dashboard/DashboardRedirect"));
const PaymentSuccess = lazy(() => import("@/pages/payment/Success"));
const PaymentFailure = lazy(() => import("@/pages/payment/Failure"));

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    let previousY = window.scrollY;
    let ticking = false;
    const updateScrollDirection = () => {
      const currentY = window.scrollY;
      const movingUp = currentY < previousY - 2;
      document.documentElement.classList.toggle("scrolling-up", movingUp && currentY > 24);
      previousY = currentY;
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollDirection);
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.documentElement.classList.remove("scrolling-up");
    };
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  // Apply one consistent, scroll-progress reveal across every route. Elements
  // sharpen and become fully visible as they move into the viewport.
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const selector = [
      "main section",
      "main article",
      "main [data-scroll-reveal]",
      "main [class*='rounded-xl border']",
      "main [class*='rounded-2xl border']",
      "main [class*='rounded-3xl border']",
      "#root section",
      "#root article",
      "footer",
    ].join(",");
    const matches = Array.from(document.querySelectorAll<HTMLElement>(selector));
    // Avoid stacking multiple blur/opacity effects on nested cards and sections.
    const elements = matches.filter((element) => !element.parentElement?.closest(selector));

    if (reduceMotion) {
      elements.forEach((element) => {
        element.style.removeProperty("opacity");
        element.style.removeProperty("filter");
        element.style.removeProperty("translate");
      });
      return;
    }

    let frame = 0;
    const updateReveal = () => {
      frame = 0;
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      elements.forEach((element) => {
        const rect = element.getBoundingClientRect();
        // Keep content that is already above the viewport fully revealed; fade
        // in from the bottom edge over the first ~72% of the viewport height.
        const progress = Math.max(0, Math.min(1, (viewportHeight - rect.top) / (viewportHeight * 0.72)));
        element.style.opacity = String(0.22 + progress * 0.78);
        element.style.filter = progress >= 1 ? "blur(0px)" : `blur(${(1 - progress) * 12}px)`;
        element.style.translate = `0 ${(1 - progress) * 18}px`;
        element.style.willChange = progress > 0 && progress < 1 ? "opacity, filter, translate" : "auto";
      });
    };
    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(updateReveal);
    };

    updateReveal();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate, { passive: true });
    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      if (frame) window.cancelAnimationFrame(frame);
      elements.forEach((element) => {
        element.style.removeProperty("opacity");
        element.style.removeProperty("filter");
        element.style.removeProperty("translate");
        element.style.removeProperty("will-change");
      });
    };
  }, [pathname]);

  return null;
};

const App = () => (
  <ThemeProvider><AuthProvider><TooltipProvider><Toaster richColors position="top-right" /><BrowserRouter><ScrollToTop /><Suspense fallback={null}><Routes>
    <Route element={<PublicLayout />}>
      <Route path="/" element={<Index />} />
      <Route path="/how-it-works" element={<HowItWorks />} />
      <Route path="/specialists" element={<Specialists />} />
      <Route path="/book" element={<BookAppointment />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/trust" element={<TrustCenter />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/cancellation" element={<Cancellation />} />
    </Route>
    <Route path="/login" element={<Login />} /><Route path="/signup" element={<Signup />} /><Route path="/verify-otp" element={<VerifyOtp />} /><Route path="/forgot-password" element={<ForgotPassword />} /><Route path="/reset-password" element={<ResetPassword />} /><Route path="/auth/callback" element={<AuthCallback />} /><Route path="/invite/:token" element={<AcceptInvite />} />
    <Route path="/payment/success" element={<PaymentSuccess />} /><Route path="/payment/failure" element={<PaymentFailure />} />
    <Route path="/dashboard" element={<ProtectedRoute />}><Route element={<DashboardLayout />}><Route index element={<DashboardRedirect />} />
      <Route path="customer" element={<ProtectedRoute requireRole="customer" />}><Route index element={<CustomerOverview />} /><Route path="appointments" element={<CustomerAppointments />} /><Route path="book" element={<Navigate to="/book" replace />} /><Route path="call/:appointmentId" element={<CustomerVideoCall />} /></Route>
      <Route path="specialist" element={<ProtectedRoute requireRole="specialist" />}><Route index element={<SpecialistOverview />} /><Route path="availability" element={<SpecialistAvailability />} /><Route path="tiers" element={<SpecialistTiers />} /><Route path="profile" element={<SpecialistProfile />} /><Route path="patients" element={<SpecialistPatients />} /><Route path="call/:appointmentId" element={<SpecialistVideoCall />} /></Route>
      <Route path="admin" element={<ProtectedRoute requireRole="admin" />}><Route index element={<AdminOverview />} /><Route path="invitations" element={<AdminInvitations />} /><Route path="users" element={<AdminUsers />} /><Route path="tiers" element={<AdminTiers />} /><Route path="payments" element={<AdminPayments />} /></Route>
    </Route></Route>
    <Route path="/404" element={<NotFound />} /><Route path="*" element={<Navigate to="/404" replace />} />
  </Routes></Suspense></BrowserRouter></TooltipProvider></AuthProvider></ThemeProvider>
);
export default App;
