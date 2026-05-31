const HEALTHCARE_AND_SENIOR_LIVING_ROLES = [
  "doctor",
  "nurse",
  "receptionist",
  "billing",
  "rn",
  "lpn",
  "cna",
  "med_aide",
  "caregiver",
  "activity_aide",
  "dietary_aide",
  "housekeeper",
  "al_doctor",
  "al_nurse",
  "al_receptionist",
  "al_billing",
  "al_rn",
  "al_lpn",
  "al_cna",
  "al_med_aide",
  "al_caregiver",
  "al_activity_aide",
  "al_dietary_aide",
  "al_housekeeper",
  "il_doctor",
  "il_nurse",
  "il_receptionist",
  "il_billing",
  "il_rn",
  "il_lpn",
  "il_cna",
  "il_med_aide",
  "il_caregiver",
  "il_activity_aide",
  "il_dietary_aide",
  "il_housekeeper",
];

const POLICE_ROLES = [
  "police_officer",
  "police_sergeant",
  "police_detective",
  "police_patrol",
  "police_traffic",
];

const WAREHOUSE_AND_LOGISTICS_ROLES = [
  "warehouse_staff",
  "forklift_operator",
  "warehouse_supervisor",
  "delivery_driver",
  "inventory_manager",
  "packer",
  "loader",
];

const SECURITY_SERVICE_ROLES = [
  "security_guard",
  "security_supervisor",
  "patrol_officer",
  "control_room_operator",
];

const RETAIL_ROLES = [
  "cashier",
  "sales_associate",
  "stock_associate",
  "retail_supervisor",
  "retail_manager",
  "customer_service",
];

const HOSPITALITY_ROLES = [
  "front_desk",
  "front_desk_manager",
  "housekeeping_staff",
  "housekeeping_supervisor",
  "chef",
  "cook",
  "server",
  "bartender",
  "host",
  "hospitality_manager",
];

const MANUFACTURING_ROLES = [
  "assembly_line",
  "machine_operator",
  "manufacturing_supervisor",
  "quality_control",
  "technician",
  "manufacturing_manager",
];

const EDUCATION_ROLES = [
  "teacher",
  "teacher_aide",
  "counselor",
  "librarian",
  "custodian",
];

const TRANSPORTATION_ROLES = [
  "driver",
  "bus_driver",
  "truck_driver",
  "dispatcher",
  "transportation_supervisor",
];

const FINANCE_ROLES = [
  "accountant",
  "analyst",
  "finance_manager",
  "clerk",
  "advisor",
];

export const COMMON_STAFF_ROLES = ["staff", "other"];
export const ADMIN_ROLES = ["admin", "superadmin"];

export const INDUSTRY_ROLE_MAP = {
  Healthcare: HEALTHCARE_AND_SENIOR_LIVING_ROLES,
  "Senior Living": HEALTHCARE_AND_SENIOR_LIVING_ROLES,
  Retail: RETAIL_ROLES,
  Hospitality: HOSPITALITY_ROLES,
  Manufacturing: MANUFACTURING_ROLES,
  Education: EDUCATION_ROLES,
  Transportation: TRANSPORTATION_ROLES,
  Finance: FINANCE_ROLES,
  Police: POLICE_ROLES,
  "Warehouse and Logistics": WAREHOUSE_AND_LOGISTICS_ROLES,
  "Security Service": SECURITY_SERVICE_ROLES,
  Other: COMMON_STAFF_ROLES,
};

const normalizeIndustryKey = (industry) =>
  String(industry || "")
    .trim()
    .toLowerCase()
    .replace(/\s*&\s*/g, " and ")
    .replace(/\s+/g, " ");

const INDUSTRY_ALIASES = {
  healthcare: "Healthcare",
  "health care": "Healthcare",
  "senior living": "Senior Living",
  "healthcare and senior living": "Healthcare",
  "assisted living": "Senior Living",
  "independent living": "Senior Living",
  retail: "Retail",
  hospitality: "Hospitality",
  manufacturing: "Manufacturing",
  education: "Education",
  transportation: "Transportation",
  finance: "Finance",
  police: "Police",
  "warehouse and logistics": "Warehouse and Logistics",
  "security service": "Security Service",
  other: "Other",
};

const toRoleLabel = (role) =>
  String(role || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const normalizeRoleKey = (role) =>
  String(role || "")
    .trim()
    .toLowerCase();

export const getRoleFamilyKey = (role) => {
  const normalizedRole = normalizeRoleKey(role);
  if (!normalizedRole) return "";

  if (normalizedRole.startsWith("al_") || normalizedRole.startsWith("il_")) {
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
  admin: "Admin",
  superadmin: "Super Admin",
  doctor: "Doctor",
  nurse: "Nurse",
  receptionist: "Receptionist",
  billing: "Billing",
  rn: "RN",
  lpn: "LPN",
  cna: "CNA",
  med_aide: "Med Aide",
  caregiver: "Caregiver",
  activity_aide: "Activity Aide",
  dietary_aide: "Dietary Aide",
  housekeeper: "Housekeeper",
  al_doctor: "AL Doctor",
  al_nurse: "AL Nurse",
  al_receptionist: "AL Receptionist",
  al_billing: "AL Billing",
  al_rn: "AL RN",
  al_lpn: "AL LPN",
  al_cna: "AL CNA",
  al_med_aide: "AL Med Aide",
  al_caregiver: "AL Caregiver",
  al_activity_aide: "AL Activity Aide",
  al_dietary_aide: "AL Dietary Aide",
  al_housekeeper: "AL Housekeeper",
  il_doctor: "IL Doctor",
  il_nurse: "IL Nurse",
  il_receptionist: "IL Receptionist",
  il_billing: "IL Billing",
  il_rn: "IL RN",
  il_lpn: "IL LPN",
  il_cna: "IL CNA",
  il_med_aide: "IL Med Aide",
  il_caregiver: "IL Caregiver",
  il_activity_aide: "IL Activity Aide",
  il_dietary_aide: "IL Dietary Aide",
  il_housekeeper: "IL Housekeeper",
  police_officer: "Police Officer",
  police_sergeant: "Police Sergeant",
  police_detective: "Police Detective",
  police_patrol: "Police Patrol",
  police_traffic: "Police Traffic",
  warehouse_staff: "Warehouse Staff",
  forklift_operator: "Forklift Operator",
  warehouse_supervisor: "Warehouse Supervisor",
  delivery_driver: "Delivery Driver",
  inventory_manager: "Inventory Manager",
  packer: "Packer",
  loader: "Loader",
  security_guard: "Security Guard",
  security_supervisor: "Security Supervisor",
  patrol_officer: "Patrol Officer",
  control_room_operator: "Control Room Operator",
  cashier: "Cashier",
  sales_associate: "Sales Associate",
  stock_associate: "Stock Associate",
  retail_supervisor: "Retail Supervisor",
  retail_manager: "Retail Manager",
  customer_service: "Customer Service",
  front_desk: "Front Desk",
  front_desk_manager: "Front Desk Manager",
  housekeeping_staff: "Housekeeping Staff",
  housekeeping_supervisor: "Housekeeping Supervisor",
  chef: "Chef",
  cook: "Cook",
  server: "Server",
  bartender: "Bartender",
  host: "Host",
  hospitality_manager: "Hospitality Manager",
  assembly_line: "Assembly Line",
  machine_operator: "Machine Operator",
  manufacturing_supervisor: "Manufacturing Supervisor",
  quality_control: "Quality Control",
  technician: "Technician",
  manufacturing_manager: "Manufacturing Manager",
  teacher: "Teacher",
  teacher_aide: "Teacher Aide",
  counselor: "Counselor",
  librarian: "Librarian",
  custodian: "Custodian",
  driver: "Driver",
  bus_driver: "Bus Driver",
  truck_driver: "Truck Driver",
  dispatcher: "Dispatcher",
  transportation_supervisor: "Transportation Supervisor",
  accountant: "Accountant",
  analyst: "Analyst",
  finance_manager: "Finance Manager",
  clerk: "Clerk",
  advisor: "Advisor",
  staff: "Staff",
  other: "Other",
};

const ROLE_COLOR_MAP = {
  admin: "#7c3aed",
  superadmin: "#5b21b6",

  // Healthcare & Senior Living
  doctor: "#0ea5a4",
  nurse: "#f97316",
  receptionist: "#2563eb",
  billing: "#f59e0b",
  rn: "#14b8a6",
  lpn: "#fb923c",
  cna: "#fdba74",
  med_aide: "#a855f7",
  caregiver: "#10b981",
  activity_aide: "#22c55e",
  dietary_aide: "#f59e0b",
  housekeeper: "#64748b",
  al_doctor: "#0ea5a4",
  al_nurse: "#f97316",
  al_receptionist: "#2563eb",
  al_billing: "#f59e0b",
  al_rn: "#14b8a6",
  al_lpn: "#fb923c",
  al_cna: "#fdba74",
  al_med_aide: "#a855f7",
  al_caregiver: "#10b981",
  al_activity_aide: "#22c55e",
  al_dietary_aide: "#f59e0b",
  al_housekeeper: "#64748b",
  il_doctor: "#0ea5a4",
  il_nurse: "#f97316",
  il_receptionist: "#2563eb",
  il_billing: "#f59e0b",
  il_rn: "#14b8a6",
  il_lpn: "#fb923c",
  il_cna: "#fdba74",
  il_med_aide: "#a855f7",
  il_caregiver: "#10b981",
  il_activity_aide: "#22c55e",
  il_dietary_aide: "#f59e0b",
  il_housekeeper: "#64748b",

  // Police
  police_officer: "#1d4ed8",
  police_sergeant: "#1e40af",
  police_detective: "#0f766e",
  police_patrol: "#0284c7",
  police_traffic: "#2563eb",

  // Warehouse & Logistics
  warehouse_staff: "#0891b2",
  forklift_operator: "#0ea5e9",
  warehouse_supervisor: "#0369a1",
  delivery_driver: "#0f766e",
  inventory_manager: "#155e75",
  packer: "#06b6d4",
  loader: "#22d3ee",

  // Security Service
  security_guard: "#475569",
  security_supervisor: "#334155",
  patrol_officer: "#1f2937",
  control_room_operator: "#0f172a",

  // Retail
  cashier: "#dc2626",
  sales_associate: "#ef4444",
  stock_associate: "#f97316",
  retail_supervisor: "#b91c1c",
  retail_manager: "#991b1b",
  customer_service: "#fb7185",

  // Hospitality
  front_desk: "#a16207",
  front_desk_manager: "#854d0e",
  housekeeping_staff: "#4b5563",
  housekeeping_supervisor: "#374151",
  chef: "#ea580c",
  cook: "#f97316",
  server: "#eab308",
  bartender: "#c026d3",
  host: "#db2777",
  hospitality_manager: "#7c2d12",

  // Manufacturing
  assembly_line: "#6b7280",
  machine_operator: "#4b5563",
  manufacturing_supervisor: "#374151",
  quality_control: "#10b981",
  technician: "#0ea5e9",
  manufacturing_manager: "#111827",

  // Education
  teacher: "#2563eb",
  teacher_aide: "#3b82f6",
  counselor: "#14b8a6",
  librarian: "#8b5cf6",
  custodian: "#64748b",

  // Transportation
  driver: "#0284c7",
  bus_driver: "#0369a1",
  truck_driver: "#0c4a6e",
  dispatcher: "#1e40af",
  transportation_supervisor: "#1d4ed8",

  // Finance
  accountant: "#16a34a",
  analyst: "#0ea5e9",
  finance_manager: "#15803d",
  clerk: "#65a30d",
  advisor: "#0891b2",

  // Common
  staff: "#6b7280",
  other: "#64748b",
};

export const ALL_NON_ADMIN_ROLES = Array.from(
  new Set([
    ...HEALTHCARE_AND_SENIOR_LIVING_ROLES,
    ...POLICE_ROLES,
    ...WAREHOUSE_AND_LOGISTICS_ROLES,
    ...SECURITY_SERVICE_ROLES,
    ...RETAIL_ROLES,
    ...HOSPITALITY_ROLES,
    ...MANUFACTURING_ROLES,
    ...EDUCATION_ROLES,
    ...TRANSPORTATION_ROLES,
    ...FINANCE_ROLES,
    ...COMMON_STAFF_ROLES,
  ]),
);

export const ALL_USER_ROLES = [...ADMIN_ROLES, ...ALL_NON_ADMIN_ROLES];

export const getRoleDisplayName = (role) => {
  if (!role) return "Unknown";
  return ROLE_LABEL_MAP[role] || toRoleLabel(role);
};

export const getRoleColor = (role) => ROLE_COLOR_MAP[role] || "#6b7280";

export const getRolesForIndustry = (
  industry,
  { includeCommon = true, includeAdmin = false } = {},
) => {
  const normalizedIndustry = normalizeIndustryKey(industry);
  const resolvedIndustry =
    INDUSTRY_ALIASES[normalizedIndustry] || industry || "";
  const industryRoles =
    INDUSTRY_ROLE_MAP[resolvedIndustry] || ALL_NON_ADMIN_ROLES;
  const result = [...industryRoles];

  if (includeCommon) {
    result.push(...COMMON_STAFF_ROLES);
  }

  if (includeAdmin) {
    result.unshift(...ADMIN_ROLES);
  }

  return Array.from(new Set(result));
};

export const getRoleOptionsForIndustry = (industry, options) =>
  getRolesForIndustry(industry, options).map((role) => ({
    value: role,
    label: getRoleDisplayName(role),
  }));
