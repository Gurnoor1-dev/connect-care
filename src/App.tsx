import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import Index from "@/pages/Index";
import HowItWorks from "@/pages/HowItWorks";
import Specialists from "@/pages/Specialists";
import BookAppointment from "@/pages/BookAppointment";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import TrustCenter from "@/pages/TrustCenter";
import { Privacy, Terms, Cancellation } from "@/pages/Policies";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/auth/Login";
import Signup from "@/pages/auth/Signup";
import VerifyOtp from "@/pages/auth/VerifyOtp";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import AuthCallback from "@/pages/auth/AuthCallback";
import AcceptInvite from "@/pages/auth/AcceptInvite";
import CustomerOverview from "@/pages/dashboard/customer/Overview";
import CustomerAppointments from "@/pages/dashboard/customer/Appointments";
import CustomerVideoCall from "@/pages/dashboard/customer/VideoCall";
import SpecialistOverview from "@/pages/dashboard/specialist/Overview";
import SpecialistAvailability from "@/pages/dashboard/specialist/Availability";
import SpecialistTiers from "@/pages/dashboard/specialist/Tiers";
import SpecialistProfile from "@/pages/dashboard/specialist/Profile";
import SpecialistVideoCall from "@/pages/dashboard/specialist/VideoCall";
import SpecialistPatients from "@/pages/dashboard/specialist/Patients";
import AdminOverview from "@/pages/dashboard/admin/Overview";
import AdminInvitations from "@/pages/dashboard/admin/Invitations";
import AdminUsers from "@/pages/dashboard/admin/Users";
import AdminTiers from "@/pages/dashboard/admin/Tiers";
import DashboardRedirect from "@/pages/dashboard/DashboardRedirect";
import PaymentSuccess from "@/pages/payment/Success";
import PaymentFailure from "@/pages/payment/Failure";
import PaymentBridge from "@/pages/payment/Bridge";

const App = () => (
  <ThemeProvider><AuthProvider><TooltipProvider><Toaster richColors position="top-right" /><BrowserRouter><Routes>
    <Route element={<PublicLayout />}>
      <Route path="/" element={<Index />} />
      <Route path="/how-it-works" element={<HowItWorks />} />
      <Route path="/specialists" element={<Specialists />} />
      <Route path="/book" element={<ProtectedRoute requireRole="customer" />}><Route index element={<BookAppointment />} /></Route>
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/trust" element={<TrustCenter />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/cancellation" element={<Cancellation />} />
    </Route>
    <Route path="/login" element={<Login />} /><Route path="/signup" element={<Signup />} /><Route path="/verify-otp" element={<VerifyOtp />} /><Route path="/forgot-password" element={<ForgotPassword />} /><Route path="/auth/callback" element={<AuthCallback />} /><Route path="/invite/:token" element={<AcceptInvite />} />
    <Route path="/payment/bridge" element={<PaymentBridge />} /><Route path="/payment/success" element={<PaymentSuccess />} /><Route path="/payment/failure" element={<PaymentFailure />} />
    <Route path="/dashboard" element={<ProtectedRoute />}><Route element={<DashboardLayout />}><Route index element={<DashboardRedirect />} />
      <Route path="customer" element={<ProtectedRoute requireRole="customer" />}><Route index element={<CustomerOverview />} /><Route path="appointments" element={<CustomerAppointments />} /><Route path="book" element={<Navigate to="/book" replace />} /><Route path="call/:appointmentId" element={<CustomerVideoCall />} /></Route>
      <Route path="specialist" element={<ProtectedRoute requireRole="specialist" />}><Route index element={<SpecialistOverview />} /><Route path="availability" element={<SpecialistAvailability />} /><Route path="tiers" element={<SpecialistTiers />} /><Route path="profile" element={<SpecialistProfile />} /><Route path="patients" element={<SpecialistPatients />} /><Route path="call/:appointmentId" element={<SpecialistVideoCall />} /></Route>
      <Route path="admin" element={<ProtectedRoute requireRole="admin" />}><Route index element={<AdminOverview />} /><Route path="invitations" element={<AdminInvitations />} /><Route path="users" element={<AdminUsers />} /><Route path="tiers" element={<AdminTiers />} /></Route>
    </Route></Route>
    <Route path="/404" element={<NotFound />} /><Route path="*" element={<Navigate to="/404" replace />} />
  </Routes></BrowserRouter></TooltipProvider></AuthProvider></ThemeProvider>
);
export default App;
