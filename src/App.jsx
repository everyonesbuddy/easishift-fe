import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import PrivateRoute from "./components/Shared/PrivateRoute";
import Login from "./components/Auth/Login";
import StaffDashboard from "./components/StaffPortal/Dashboard/StaffDashboard";
import SignupTenant from "./components/Auth/SignupTenant";
import Home from "./components/Home/Home";
import Navbar from "./components/Shared/Navbar";
import Sidebar from "./components/Shared/Sidebar";
import Paywall from "./components/StaffPortal/Dashboard/Paywall";
import ManageSubscription from "./components/StaffPortal/Billing/ManageSubscription";
import BillingSuccess from "./components/StaffPortal/Billing/BillingSuccess";
import BillingCancel from "./components/StaffPortal/Billing/BillingCancel";
import ScheduleList from "./components/StaffPortal/Schedule/ScheduleList";
import StaffList from "./components/StaffPortal/Staffs/StaffList";
import MessageList from "./components/StaffPortal/Messages/MessageList";
import TimeOffRequestList from "./components/StaffPortal/TimeOff/TimeOffRequestList";
import TimeOffDecision from "./components/StaffPortal/TimeOff/TimeOffDecision";
import PreferencesPage from "./components/StaffPortal/NoAdminPreferences/PreferencesPage";
import CoveragePlanningPage from "./components/StaffPortal/Coverage/CoveragePlanningPage";
import { Box } from "@mui/material";
import { useAuth } from "./context/AuthContext";

export default function App() {
  const { user, tenant, isAdmin } = useAuth();

  const showPaywall =
    isAdmin &&
    tenant &&
    (tenant.subscriptionStatus !== "active" ||
      (tenant.seatLimit && tenant.seatLimit <= 1));

  // Billing-only mode for admins with inactive/limited tenant
  if (user && showPaywall) {
    return (
      <BrowserRouter>
        <Box sx={{ marginLeft: 0 }}>
          <Navbar />
          <Routes>
            <Route path="/billing" element={<Paywall tenant={tenant} />} />
            <Route path="*" element={<Navigate to="/billing" replace />} />
          </Routes>
        </Box>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      {user && <Sidebar />}
      <Box
        sx={{
          marginLeft: user ? { xs: 0, sm: "260px" } : 0,
          position: "relative",
        }}
      >
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup-tenant" element={<SignupTenant />} />
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
            path="/staffs"
            element={
              <PrivateRoute>
                <StaffList />
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
              <PrivateRoute>
                <PreferencesPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/timeoff-requests"
            element={
              <PrivateRoute>
                <TimeOffRequestList />
              </PrivateRoute>
            }
          />
        </Routes>
      </Box>
    </BrowserRouter>
  );
}
