import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import api from "../config/api";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

const FALLBACK_SYSTEM_ROLE_PERMISSIONS = {
  staff: [
    "schedule.view_own",
    "schedule.pick_up",
    "timeoff.request",
    "shift_swap.use",
    "messages.use",
    "preferences.manage_own",
  ],
  scheduler: [
    "schedule.view",
    "schedule.manage",
    "coverage.view",
    "coverage.manage",
    "staff.view",
    "facility_preferences.view",
  ],
  admin: [
    "schedule.view",
    "schedule.manage",
    "coverage.view",
    "coverage.manage",
    "staff.view",
    "staff.manage",
    "staff.reset_password",
    "timeoff.review",
    "messages.manage",
    "facility_preferences.manage",
  ],
  owner: [
    "schedule.view",
    "schedule.manage",
    "coverage.view",
    "coverage.manage",
    "staff.view",
    "staff.manage",
    "staff.reset_password",
    "timeoff.review",
    "messages.manage",
    "facility_preferences.manage",
    "billing.view",
    "billing.manage",
    "tenant.settings",
    "tenant.delete",
    "roles.manage",
  ],
};

const normalizeRole = (role) => {
  const value = String(role || "")
    .trim()
    .toLowerCase();

  if (value === "user" || value === "other") return "staff";
  if (value === "superadmin") return "owner";
  return value;
};

const normalizeRoles = (user) => {
  if (Array.isArray(user?.roles) && user.roles.length) {
    return Array.from(
      new Set(user.roles.map((role) => normalizeRole(role)).filter(Boolean)),
    );
  }

  const legacyRole = normalizeRole(user?.role);
  return legacyRole ? [legacyRole] : [];
};

const normalizePermissions = (user) => {
  if (!user) return [];

  const backendPermissions = Array.from(
    new Set(
      (Array.isArray(user?.permissions) ? user.permissions : [])
        .map((permission) => String(permission || "").trim())
        .filter(Boolean),
    ),
  );

  const roles = normalizeRoles(user);
  const permissionRoles = roles.some(
    (role) => FALLBACK_SYSTEM_ROLE_PERMISSIONS[role],
  )
    ? roles.filter((role) => FALLBACK_SYSTEM_ROLE_PERMISSIONS[role])
    : ["staff"];

  return Array.from(
    new Set([
      ...backendPermissions,
      ...permissionRoles.flatMap(
        (role) => FALLBACK_SYSTEM_ROLE_PERMISSIONS[role] || [],
      ),
    ]),
  );
};

const parseJwt = (token) => {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

const isTokenExpired = (token) => {
  if (!token) return true;
  const decoded = parseJwt(token);
  if (!decoded || !decoded.exp) return false;
  return decoded.exp * 1000 < Date.now();
};

const normalizeUser = (user) => {
  if (!user) return null;
  const roles = normalizeRoles(user);
  const permissions = normalizePermissions(user);

  return {
    ...user,
    roles,
    permissions,
    role: user.role || roles[0] || "staff",
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(""); // always string
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    setUser(null);
    setRole("");
    setTenant(null);
    setFacilityPreferences(null);
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    try {
      localStorage.removeItem("token");
      delete api.defaults.headers.common["Authorization"];
    } catch (err) {}
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    let existingToken = null;
    try {
      existingToken = localStorage.getItem("token");
    } catch (err) {}

    // Check if stored token is already expired
    if (existingToken && isTokenExpired(existingToken)) {
      logout();
      setLoading(false);
      return;
    }

    if (existingToken) {
      api.defaults.headers.common["Authorization"] = `Bearer ${existingToken}`;
    }

    if (savedUser) {
      try {
        const parsedUser = normalizeUser(JSON.parse(savedUser));
        setUser(parsedUser);
        setRole(parsedUser.role || parsedUser.roles?.[0] || "staff"); // ✅ always a string
        // try to fetch tenant if available
        if (parsedUser.tenantId) {
          (async () => {
            try {
              const res = await api.get(`/tenants/${parsedUser.tenantId}`);
              // Normalize: API may return { tenant: {...} } or raw tenant
              setTenant(res.data?.tenant || res.data || null);
              await fetchFacilityPreferences();
            } catch (err) {
              // swallow — tenant can be fetched later
              console.error("Failed to fetch tenant in AuthProvider", err);
            }
          })();
        }
      } catch (err) {
        console.error("Failed to parse saved user", err);
        logout();
      }
    }
    setLoading(false);
  }, [logout]);

  // Set up axios interceptor: only log out if the token is genuinely expired or missing
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          const currentToken = localStorage.getItem("token");
          // Only log out if the token is missing or has actually passed its expiration timestamp
          if (!currentToken || isTokenExpired(currentToken)) {
            logout();
          }
        }
        return Promise.reject(error);
      },
    );

    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, [logout]);

  useEffect(() => {}, [role, user]);

  const [facilityPreferences, setFacilityPreferences] = useState(null);

  const fetchFacilityPreferences = useCallback(async () => {
    try {
      const res = await api.get("/facility-preferences");
      setFacilityPreferences(res.data || {});
      return res.data;
    } catch (err) {
      console.error("Failed to fetch facility preferences", err);
      setFacilityPreferences({});
      return {};
    }
  }, []);
  const login = useCallback(
    (data) => {
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

      const normalizedUserData = normalizeUser(userData);
      const normalizedRoles = normalizeRoles(normalizedUserData);
      const nextRole =
        normalizedUserData?.role || normalizedRoles[0] || detectedRole;

      setUser(normalizedUserData);
      setRole(nextRole);
      // fetch tenant for global state if present
      if (normalizedUserData && normalizedUserData.tenantId) {
        (async () => {
          try {
            const res = await api.get(
              `/tenants/${normalizedUserData.tenantId}`,
            );
            setTenant(res.data?.tenant || res.data || null);
            // Also fetch facility preferences on login
            await fetchFacilityPreferences();
          } catch (err) {
            console.error("Failed to fetch tenant after login", err);
            setTenant(null);
          }
        })();
      } else {
        setTenant(null);
      }

      localStorage.setItem("user", JSON.stringify(normalizedUserData));
      localStorage.setItem("role", nextRole);
    },
    [fetchFacilityPreferences],
  );

  // Allow manual refresh of tenant data
  const refreshTenant = useCallback(async () => {
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
  }, [user]);

  const updateCurrentUser = useCallback((partialUser) => {
    if (!partialUser) return;

    setUser((prev) => {
      const nextUser = normalizeUser({ ...(prev || {}), ...partialUser });
      localStorage.setItem("user", JSON.stringify(nextUser));
      if (nextUser.role) {
        localStorage.setItem("role", nextUser.role);
        setRole(nextUser.role);
      }
      return nextUser;
    });
  }, []);

  const normalizedRole = String(role || "").toLowerCase();
  const isPatient = normalizedRole === "patient";
  const roles = normalizeRoles(user);
  const permissions = normalizePermissions(user);
  const hasRole = useCallback(
    (targetRole) => roles.includes(normalizeRole(targetRole)),
    [roles],
  );
  const can = useCallback(
    (permission) => permissions.includes(permission),
    [permissions],
  );
  const isOwner = hasRole("owner");
  const isAdmin = hasRole("admin") || isOwner;
  const isStaff = Boolean(user) && !isPatient;

  const contextValue = useMemo(
    () => ({
      user,
      role,
      roles,
      permissions,
      tenant,
      refreshTenant,
      facilityPreferences,
      fetchFacilityPreferences,
      isPatient,
      isStaff,
      isAdmin,
      isOwner,
      hasRole,
      can,
      login,
      logout,
      updateCurrentUser,
      loading,
    }),
    [
      user,
      role,
      roles,
      permissions,
      tenant,
      refreshTenant,
      facilityPreferences,
      fetchFacilityPreferences,
      isPatient,
      isStaff,
      isAdmin,
      isOwner,
      hasRole,
      can,
      login,
      logout,
      updateCurrentUser,
      loading,
    ],
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};
