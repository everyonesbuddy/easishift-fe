import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import PrivateRoute from "./components/Shared/PrivateRoute";
import Login from "./components/Auth/Login";
import ResetPassword from "./components/Auth/ResetPassword";
import StaffDashboard from "./components/StaffPortal/Dashboard/StaffDashboard";
import SignupTenant from "./components/Auth/SignupTenant";
import Home from "./components/Home/Home";
import PricingPage from "./components/Home/PricingPage";
import Calculators from "./components/Home/Calculators";
import CallOutCostCalculator from "./components/Home/CallOutCostCalculator";
import OvertimeCostCalculator from "./components/Home/OvertimeCostCalculator";
import TimeClockAccuracyCalculator from "./components/Home/TimeClockAccuracyCalculator";
import TermsAndConditions from "./components/Home/TermsAndConditions";
import PrivacyPolicy from "./components/Home/PrivacyPolicy";
import EndUserLicenseAgreement from "./components/Home/EndUserLicenseAgreement";
import ContactPage from "./components/Home/ContactPage";
import IntegrationsPage from "./components/Home/IntegrationsPage";
import FeatureLandingPage from "./components/Home/FeatureLandingPage";
import Navbar from "./components/Shared/Navbar";
import Sidebar from "./components/Shared/Sidebar";
import HowToUsePage from "./components/Shared/HowToUsePage";
import GuideTourOverlay from "./components/Shared/GuideTourOverlay";
import AnalyticsTracker from "./components/Shared/AnalyticsTracker";
import UpgradeDialog from "./components/Shared/UpgradeDialog";
import SetupPage from "./components/StaffPortal/Setup/SetupPage";
import ManageSubscription from "./components/StaffPortal/Billing/ManageSubscription";
import BillingSuccess from "./components/StaffPortal/Billing/BillingSuccess";
import BillingCancel from "./components/StaffPortal/Billing/BillingCancel";
import ScheduleList from "./components/StaffPortal/Schedule/ScheduleList";
import ShiftSwapRequestsPage from "./components/StaffPortal/Schedule/ShiftSwapRequestsPage";
import StaffList from "./components/StaffPortal/Staffs/StaffList";
import MembersPage from "./components/StaffPortal/Members/MembersPage";
import StaffingTemplatePage from "./components/StaffPortal/Coverage/StaffingTemplatePage";
import MessageList from "./components/StaffPortal/Messages/MessageList";
import TimeOffDecision from "./components/StaffPortal/TimeOff/TimeOffDecision";
import FacilityPreferencesPage from "./components/StaffPortal/FacilityPreferences/FacilityPreferencesPage";
import TenantBrandingPage from "./components/StaffPortal/FacilityPreferences/TenantBrandingPage";
import CoveragePlanningPage from "./components/StaffPortal/Coverage/CoveragePlanningPage";
import TimeTrackingPage from "./components/StaffPortal/TimeTracking/TimeTrackingPage";
import PayrollExportsPage from "./components/StaffPortal/Exports/PayrollExportsPage";
import { ToastContainer } from "react-toastify";
import { Box, CssBaseline } from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { useAuth } from "./context/AuthContext";
import { useMemo, useState } from "react";

export default function App() {
  const { user, publicBranding } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const primaryColor = publicBranding?.primaryColor || "#2563eb";
  const secondaryColor = publicBranding?.secondaryColor || "#1e40af";
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          primary: { main: primaryColor },
          secondary: { main: secondaryColor },
        },
        components: {
          MuiButton: {
            styleOverrides: {
              containedPrimary: {
                backgroundColor: `${primaryColor} !important`,
                "&:hover": {
                  backgroundColor: `${secondaryColor} !important`,
                },
              },
            },
          },
        },
      }),
    [primaryColor, secondaryColor],
  );
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AnalyticsTracker />
        {user && (
          <Sidebar
            mobileOpen={mobileOpen}
            onMobileClose={() => setMobileOpen(false)}
          />
        )}
        <Box
          sx={{
            marginLeft: user ? { xs: 0, sm: "260px" } : 0,
            position: "relative",
          }}
        >
          <Navbar onMobileOpen={() => setMobileOpen(true)} />
          <Routes>
            <Route
              path="/"
              element={
                user ? <Navigate to="/dashboard" replace /> : <Home />
              }
            />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/calculators" element={<Calculators />} />
            <Route
              path="/turnover-roi-calculator"
              element={<Navigate to="/calculators" replace />}
            />
            <Route
              path="/cost-leak-calculator"
              element={<Navigate to="/calculators" replace />}
            />
            <Route
              path="/calculators/call-out-cost-calculator"
              element={<CallOutCostCalculator />}
            />
            <Route
              path="/calculators/overtime-cost-calculator"
              element={<OvertimeCostCalculator />}
            />
            <Route
              path="/calculators/time-clock-accuracy-calculator"
              element={<TimeClockAccuracyCalculator />}
            />
            <Route
              path="/terms-and-conditions"
              element={<TermsAndConditions />}
            />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/eula" element={<EndUserLicenseAgreement />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/integrations" element={<IntegrationsPage />} />
            <Route path="/features/:feature" element={<FeatureLandingPage />} />
            <Route
              path="/login"
              element={user ? <Navigate to="/dashboard" replace /> : <Login />}
            />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route
              path="/signup-tenant"
              element={
                user ? <Navigate to="/dashboard" replace /> : <SignupTenant />
              }
            />
            <Route path="/signup" element={<Navigate to="/signup-tenant" replace />} />
            <Route
              path="/setup"
              element={
                <PrivateRoute>
                  <SetupPage />
                </PrivateRoute>
              }
            />
            <Route path="/billing" element={<ManageSubscription />} />
            <Route path="/billing/success" element={<BillingSuccess />} />
            <Route path="/billing/cancel" element={<BillingCancel />} />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <StaffDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/coverage-planning"
              element={
                <PrivateRoute>
                  <CoveragePlanningPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/schedule"
              element={
                <PrivateRoute>
                  <ScheduleList />
                </PrivateRoute>
              }
            />
            <Route
              path="/swap-requests"
              element={
                <PrivateRoute>
                  <ShiftSwapRequestsPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/staffs"
              element={
                <PrivateRoute>
                  <StaffList />
                </PrivateRoute>
              }
            />
            <Route
              path="/staffing-template"
              element={
                <PrivateRoute>
                  <StaffingTemplatePage />
                </PrivateRoute>
              }
            />
            <Route
              path="/members"
              element={
                <PrivateRoute>
                  <MembersPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/timeoff-decisions"
              element={
                <PrivateRoute>
                  <TimeOffDecision />
                </PrivateRoute>
              }
            />
            <Route
              path="/messages"
              element={
                <PrivateRoute>
                  <MessageList />
                </PrivateRoute>
              }
            />
            <Route
              path="/preferences"
              element={
                <Navigate to="/dashboard" replace />
              }
            />
            <Route
              path="/timeoff-requests"
              element={
                <Navigate to="/timeoff-decisions" replace />
              }
            />
            <Route
              path="/time-tracking"
              element={
                <PrivateRoute>
                  <TimeTrackingPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/payroll-exports"
              element={
                <PrivateRoute>
                  <PayrollExportsPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/facility-preferences"
              element={
                <PrivateRoute>
                  <FacilityPreferencesPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/tenant-branding"
              element={
                <PrivateRoute>
                  <TenantBrandingPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/how-to-use"
              element={
                <PrivateRoute>
                  <HowToUsePage />
                </PrivateRoute>
              }
            />
          </Routes>
          <ToastContainer />
          <GuideTourOverlay />
          {user && <UpgradeDialog />}
        </Box>
      </BrowserRouter>
    </ThemeProvider>
  );
}
