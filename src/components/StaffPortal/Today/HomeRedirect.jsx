import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";

const LEADERSHIP = ["owner", "administrator", "viewer"];
const SCHEDULING = ["scheduler", "admin"];

/**
 * Where someone lands after signing in. Schedulers land on Today (what to
 * do now). Owners, admins and viewers (an ED or DON) land on Labor (how the
 * week is going) when their plan has it; otherwise Today.
 */
function homePath({ roles = [], can, hasFeature }) {
  const leadership = roles.some((r) => LEADERSHIP.includes(r)) && !roles.some((r) => SCHEDULING.includes(r));
  return leadership && hasFeature("labor") && can("labor.view") ? "/labor" : "/dashboard";
}

export default function HomeRedirect() {
  const { roles, can, hasFeature, session } = useAuth();
  // The plan comes with the session; don't wait for it forever.
  const [gaveUp, setGaveUp] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setGaveUp(true), 3000);
    return () => clearTimeout(t);
  }, []);
  if (!session && !gaveUp) return <p className="text-center mt-10">Loading...</p>;
  return <Navigate to={homePath({ roles, can, hasFeature })} replace />;
}
