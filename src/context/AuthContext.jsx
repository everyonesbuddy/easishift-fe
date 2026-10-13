import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import api, { API_BASE } from "../config/api";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);
// Mirrors config/authorization.js on the backend. The backend also sends
// user.permissions, which always wins; this is only a fallback.
const SCHEDULER_PERMISSIONS = [
  "schedule.view",
  "schedule.manage",
  "coverage.view",
  "coverage.manage",
  "staff.view",
  "staff.manage",
  "staff.reset_password",
  "timeoff.review",
  "messages.manage",
  "facility_preferences.view",
  "facility_preferences.manage",
];

const FALLBACK_SYSTEM_ROLE_PERMISSIONS = {
  scheduler: SCHEDULER_PERMISSIONS,
  // "admin" is the old name for scheduler.
  admin: SCHEDULER_PERMISSIONS,
  viewer: [
    "schedule.view",
    "coverage.view",
    "staff.view",
    "facility_preferences.view",
  ],
  owner: [
    ...SCHEDULER_PERMISSIONS,
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
  const permissionRoles = roles.filter(
    (role) => FALLBACK_SYSTEM_ROLE_PERMISSIONS[role],
  );

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
    role: user.role || roles[0] || "owner",
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(""); // always string
  const [tenant, setTenant] = useState(null);
  // Plan, limits and usage from GET /auth/me.
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Branding just saved on the branding page (shown before the next reload).
  const [brandingOverride, setBrandingOverride] = useState(null);

  // White-label colors/logo (Organization plan only).
  const derivedBranding = useMemo(() => {
    const branding = tenant?.branding;
    if (!branding || !session?.plan?.features?.includes("branding")) {
      return null;
    }
    return {
      displayName: branding.displayName || tenant?.name,
      primaryColor: branding.primaryColor || null,
      secondaryColor: branding.secondaryColor || null,
      logoUrl: branding.logoUpdatedAt
        ? `${API_BASE}/api/v1/public/tenants/${tenant._id}/logo?v=${new Date(branding.logoUpdatedAt).getTime()}`
        : null,
    };
  }, [tenant, session]);
  const publicBranding =
    derivedBranding && brandingOverride
      ? {
          ...derivedBranding,
          ...brandingOverride,
          logoUrl: brandingOverride.logoUrl?.startsWith("/")
            ? `${API_BASE}${brandingOverride.logoUrl}`
            : brandingOverride.logoUrl || derivedBranding.logoUrl,
        }
      : derivedBranding;
  const publicBrandingLoading = false;
  const updatePublicBranding = useCallback((branding) => {
    if (branding) setBrandingOverride(branding);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setRole("");
    setTenant(null);
    setSession(null);
    setFacilityPreferences(null);
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    try {
      localStorage.removeItem("token");
      delete api.defaults.headers.common["Authorization"];
    } catch (err) {}
  }, []);

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

  /**
   * GET /auth/me (who you are, plan, limits, usage) + GET /tenants/me.
   * Call after login, after billing changes, and after adding staff.
   */
  const loadSession = useCallback(async () => {
    try {
      const [meRes, tenantRes] = await Promise.all([
        api.get("/auth/me"),
        api.get("/tenants/me"),
      ]);
      const me = meRes.data || {};
      setSession({
        plan: me.plan || null,
        paidPlan: me.paidPlan || "free",
        subscriptionStatus: me.subscriptionStatus || null,
        trialAvailable: Boolean(me.trialAvailable),
        trialPlan: me.trialPlan || "starter",
        trialEndsAt: me.trialEndsAt || null,
        usage: me.usage || null,
        // Over the scheduler limit: non-owner schedulers can only look.
        readOnlyReason: me.readOnlyReason || null,
        // One week can still be published right after a trial ends.
        grace: me.grace || null,
      });
      setTenant(tenantRes.data?.tenant || null);
      if (me.user) {
        const nextUser = normalizeUser(me.user);
        setUser(nextUser);
        localStorage.setItem("user", JSON.stringify(nextUser));
      }
      fetchFacilityPreferences();
      return me;
    } catch (err) {
      console.error("Failed to load session", err);
      // The session is no longer valid (e.g. a staff login from before staff
      // moved to personal links): sign out instead of showing a broken app.
      if (err?.response?.status === 401) logout();
      return null;
    }
  }, [fetchFacilityPreferences, logout]);

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
        // Load workspace, plan and usage
        loadSession();
      } catch (err) {
        console.error("Failed to parse saved user", err);
        logout();
      }
    }
    setLoading(false);
  }, [logout, loadSession]);

  // Set up axios interceptor: only log out if the token is genuinely expired or missing
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        // Plan limits: let the app show the upgrade / free-trial dialog.
        // Only for actions the user took (not background GETs that load a
        // page), so a Free workspace isn't nagged on every screen.
        const method = String(error.config?.method || "get").toLowerCase();
        if (error.response?.status === 402 && method !== "get") {
          window.dispatchEvent(
            new CustomEvent("wisershifts:plan-required", {
              detail: error.response.data || {},
            }),
          );
        }
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
      if (normalizedUserData) {
        loadSession();
      } else {
        setTenant(null);
      }

      localStorage.setItem("user", JSON.stringify(normalizedUserData));
      localStorage.setItem("role", nextRole);
    },
    [loadSession],
  );

  // Allow manual refresh of tenant data
  const refreshTenant = useCallback(async () => {
    if (!user) return null;
    await loadSession();
    return tenant;
  }, [user, loadSession, tenant]);

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
  const hasFeature = useCallback(
    (feature) => Boolean(session?.plan?.features?.includes(feature)),
    [session],
  );
  const isOwner = hasRole("owner");
  const isAdmin = hasRole("admin") || hasRole("scheduler") || isOwner;
  const isStaff = Boolean(user) && !isPatient;

  const contextValue = useMemo(
    () => ({
      user,
      role,
      roles,
      permissions,
      tenant,
      session,
      plan: session?.plan || null,
      usage: session?.usage || null,
      hasFeature,
      refreshSession: loadSession,
      publicBranding,
      publicBrandingLoading,
      updatePublicBranding,
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
      session,
      hasFeature,
      loadSession,
      publicBranding,
      publicBrandingLoading,
      updatePublicBranding,
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
