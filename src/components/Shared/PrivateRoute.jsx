import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function PrivateRoute({ children }) {
  const { user, loading, tenant, can } = useAuth();
  const location = useLocation();

  if (loading) return <p className="text-center mt-10">Loading...</p>;
  if (!user) return <Navigate to="/login" />;

  // New workspaces finish onboarding before anything else.
  const needsSetup =
    tenant &&
    !tenant.setupCompletedAt &&
    can("facility_preferences.manage") &&
    location.pathname !== "/setup" &&
    !location.pathname.startsWith("/billing");
  if (needsSetup) return <Navigate to="/setup" replace />;

  return children;
}
