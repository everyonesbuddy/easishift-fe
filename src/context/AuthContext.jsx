import { createContext, useContext, useState, useEffect } from "react";
import api from "../config/api";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(""); // always string
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    // If a token exists from previous login, attach it to api defaults
    try {
      const existingToken = localStorage.getItem("token");
      if (existingToken)
        api.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${existingToken}`;
    } catch (err) {
      // ignore storage errors
    }
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      setRole(parsedUser.role || "staff"); // ✅ always a string
      // try to fetch tenant if available
      if (parsedUser.tenantId) {
        (async () => {
          try {
            const res = await api.get(`/tenants/${parsedUser.tenantId}`);
            // Normalize: API may return { tenant: {...} } or raw tenant
            setTenant(res.data?.tenant || res.data || null);
          } catch (err) {
            // swallow — tenant can be fetched later
            console.error("Failed to fetch tenant in AuthProvider", err);
          }
        })();
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {}, [role, user]);

  const login = (data) => {
    let userData = null;
    let detectedRole = "staff";

    if (data.user) {
      userData = data.user;
      detectedRole = data.user.role || "staff";
    } else if (data.patient || data.firstName) {
      userData = data.patient || data;
      detectedRole = "patient";
    } else if (data.role) {
      userData = data;
      detectedRole = data.role || "staff";
    } else {
      userData = data;
      detectedRole = data.role || "staff";
    }

    // ✅ Make sure role is always string
    if (typeof detectedRole !== "string") detectedRole = "staff";

    setUser(userData);
    setRole(detectedRole);
    // fetch tenant for global state if present
    if (userData && userData.tenantId) {
      (async () => {
        try {
          const res = await api.get(`/tenants/${userData.tenantId}`);
          setTenant(res.data?.tenant || res.data || null);
        } catch (err) {
          console.error("Failed to fetch tenant after login", err);
          setTenant(null);
        }
      })();
    } else {
      setTenant(null);
    }

    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("role", detectedRole);
  };

  // Allow manual refresh of tenant data
  const refreshTenant = async () => {
    if (!user || !user.tenantId) return null;
    try {
      const res = await api.get(`/tenants/${user.tenantId}`);
      const t = res.data?.tenant || res.data || null;
      setTenant(t);
      return t;
    } catch (err) {
      console.error("Failed to refresh tenant", err);
      return null;
    }
  };

  const logout = () => {
    setUser(null);
    setRole("");
    setTenant(null);
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    try {
      localStorage.removeItem("token");
      delete api.defaults.headers.common["Authorization"];
    } catch (err) {}
  };

  const isPatient = role === "patient";
  const isAdmin = role === "admin";
  const isStaff = [
    "staff",
    "admin",
    "doctor",
    "nurse",
    "receptionist",
    "billing",
  ].includes(role);

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        tenant,
        refreshTenant,
        isPatient,
        isStaff,
        isAdmin,
        login,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
