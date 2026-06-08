export const COMMON_STAFF_ROLES = ["staff", "other"];
export const ADMIN_ROLES = ["admin", "superadmin"];
export const SYSTEM_ROLE_OPTIONS = [
  "user",
  ...COMMON_STAFF_ROLES,
  ...ADMIN_ROLES,
];

const toDisplayLabel = (value) =>
  String(value || "")
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => {
      const normalized = part.toLowerCase();
      if (/^\d+[ap]m?$/.test(normalized)) return normalized;
      if (normalized.length <= 2 && /^[a-z]+$/.test(normalized)) {
        return normalized.toUpperCase();
      }
      return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    })
    .join(" ");

const normalizeRoleKey = (role) =>
  String(role || "")
    .trim()
    .toLowerCase();

const hashToHue = (value) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
};

const fallbackRoleColorCache = new Map();

const getFallbackRoleColor = (role) => {
  if (fallbackRoleColorCache.has(role)) {
    return fallbackRoleColorCache.get(role);
  }

  const hue = hashToHue(role);
  const color = `hsl(${hue} 65% 45%)`;
  fallbackRoleColorCache.set(role, color);
  return color;
};

const getTaxonomyDisplayName = (value, emptyFallback = "-") => {
  const normalized = normalizeRoleKey(value);
  if (!normalized) return emptyFallback;
  return toDisplayLabel(normalized);
};

export const getRoleFamilyKey = (role) => {
  const normalizedRole = normalizeRoleKey(role);
  if (!normalizedRole) return "";

  if (
    normalizedRole.startsWith("al_") ||
    normalizedRole.startsWith("il_") ||
    normalizedRole.startsWith("mc_")
  ) {
    return normalizedRole.slice(3);
  }

  return normalizedRole;
};

export const isRoleCompatible = (staffRole, coverageRole) => {
  const staffFamily = getRoleFamilyKey(staffRole);
  const coverageFamily = getRoleFamilyKey(coverageRole);

  if (!staffFamily || !coverageFamily) return false;

  return staffFamily === coverageFamily;
};

export const ROLE_LABEL_MAP = {
  user: "User",
  admin: "Admin",
  superadmin: "Super Admin",
  staff: "Staff",
  other: "Other",
};

const ROLE_COLOR_MAP = {
  user: "#64748b",
  admin: "#7c3aed",
  superadmin: "#5b21b6",
  staff: "#6b7280",
  other: "#64748b",
};

export const ALL_NON_ADMIN_ROLES = [...COMMON_STAFF_ROLES];

export const ALL_USER_ROLES = [...ADMIN_ROLES, ...ALL_NON_ADMIN_ROLES];

export const getRoleDisplayName = (role) => {
  const normalizedRole = normalizeRoleKey(role);
  if (!normalizedRole) return "Unknown";
  return ROLE_LABEL_MAP[normalizedRole] || toDisplayLabel(normalizedRole);
};

export const getRoleColor = (role) => {
  const normalizedRole = normalizeRoleKey(role);
  if (!normalizedRole) return "#6b7280";
  return ROLE_COLOR_MAP[normalizedRole] || getFallbackRoleColor(normalizedRole);
};

export const getUnitAreaDisplayName = (unitArea) =>
  getTaxonomyDisplayName(unitArea, "-");

export const getShiftTypeDisplayName = (shiftType) =>
  getTaxonomyDisplayName(shiftType, "-");

export const getShiftTagDisplayName = (shiftTag) =>
  getTaxonomyDisplayName(shiftTag, "-");

export const getCertificationTagDisplayName = (certificationTag) =>
  getTaxonomyDisplayName(certificationTag, "-");

export const getRoleOptionsFromFacilityPreferences = (
  facilityPreferences,
  { includeSystem = false, includeAdmin = false } = {},
) => {
  const facilityRoles = Array.from(
    new Set(
      (facilityPreferences?.roleFamilies || [])
        .map((role) => normalizeRoleKey(role))
        .filter(Boolean),
    ),
  );

  const roles = [...facilityRoles];

  if (includeSystem) {
    roles.push("user", ...COMMON_STAFF_ROLES);
  }

  if (includeAdmin) {
    roles.push(...ADMIN_ROLES);
  }

  return Array.from(new Set(roles)).map((role) => ({
    value: role,
    label: getRoleDisplayName(role),
  }));
};
