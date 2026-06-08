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
import About from "@/pages/About";
import Contact from "@/pages/Contact";
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
import CustomerBook from "@/pages/dashboard/customer/BookAppointment";

import SpecialistOverview from "@/pages/dashboard/specialist/Overview";
import SpecialistAvailability from "@/pages/dashboard/specialist/Availability";
import SpecialistTiers from "@/pages/dashboard/specialist/Tiers";
import SpecialistProfile from "@/pages/dashboard/specialist/Profile";
import SpecialistVideoCall from "@/pages/dashboard/specialist/VideoCall";
import SpecialistPatients from "@/pages/dashboard/specialist/Patients";

import AdminOverview from "@/pages/dashboard/admin/Overview";
import AdminInvitations from "@/pages/dashboard/admin/Invitations";
import AdminUsers from "@/pages/dashboard/admin/Users";

import DashboardRedirect from "@/pages/dashboard/DashboardRedirect";

import PaymentSuccess from "@/pages/payment/Success";
import PaymentFailure from "@/pages/payment/Failure";

const App = () => (
  <ThemeProvider>
    <AuthProvider>
      <TooltipProvider>
        <Toaster richColors position="top-right" />
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/specialists" element={<Specialists />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
            </Route>

            {/* Auth */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/verify-otp" element={<VerifyOtp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/invite/:token" element={<AcceptInvite />} />

            {/* Payment callbacks (PayU hosted checkout returns here) */}
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/failure" element={<PaymentFailure />} />

            {/* Dashboard router by role */}
            <Route path="/dashboard" element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route index element={<DashboardRedirect />} />

                {/* Customer */}
                <Route path="customer" element={<ProtectedRoute requireRole="customer" />}>
                  <Route index element={<CustomerOverview />} />
                  <Route path="appointments" element={<CustomerAppointments />} />
                  <Route path="book" element={<CustomerBook />} />
                  <Route path="call/:appointmentId" element={<CustomerVideoCall />} />
                </Route>

                {/* Specialist */}
                <Route path="specialist" element={<ProtectedRoute requireRole="specialist" />}>
                  <Route index element={<SpecialistOverview />} />
                  <Route path="availability" element={<SpecialistAvailability />} />
                  <Route path="tiers" element={<SpecialistTiers />} />
                  <Route path="profile" element={<SpecialistProfile />} />
                  <Route path="patients" element={<SpecialistPatients />} />
                  <Route path="call/:appointmentId" element={<SpecialistVideoCall />} />
                </Route>

                {/* Admin */}
                <Route path="admin" element={<ProtectedRoute requireRole="admin" />}>
                  <Route index element={<AdminOverview />} />
                  <Route path="invitations" element={<AdminInvitations />} />
                  <Route path="users" element={<AdminUsers />} />
                </Route>
              </Route>
            </Route>

            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </ThemeProvider>
);

export default App;
