import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  TextField,
  Select,
  MenuItem,
  Stack,
  Alert,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from "@mui/material";
import { FiRotateCcw, FiX, FiPlus } from "react-icons/fi";
import { IOS, segmentedSx, tint } from "../../../theme/ios";
import { Field, Row, Section, TagEditor, Toggle } from "./PrefsUi";
import { toLabel } from "../../../utils/labels";
import api from "../../../config/api";
import { trackEvent } from "../../../utils/analytics";
import { toast } from "react-toastify";
import { useAuth } from "../../../context/AuthContext";
import { useGuideTour } from "../../../context/GuideTourContext";
import { Navigate, useNavigate } from "react-router-dom";
import GuideHelpButton from "../../Shared/GuideHelpButton";
import FacilityGeofenceMap from "./FacilityGeofenceMap";

const SCHEDULING_PATTERNS = [
  { value: "balance", label: "Balance (fairness-based)" },
  { value: "4_on_4_off", label: "4 On / 4 Off" },
  { value: "2_2_3", label: "2-2-3 (Pitman)" },
  { value: "panama", label: "Panama (28-day cycle)" },
  { value: "fixed_5_2", label: "Fixed 5/2 (Mon–Fri)" },
  { value: "rotating_3", label: "Rotating 3 shifts/week" },
  { value: "custom", label: "Custom (coverage-driven)" },
];

const TAXONOMY_FIELDS = [
  "roleFamilies",
  "unitAreas",
  "shiftTypes",
  "certificationTags",
];

const IANA_TIMEZONES =
  typeof Intl.supportedValuesOf === "function"
    ? Intl.supportedValuesOf("timeZone")
    : ["UTC"];

const TIME_TRACKING_DEFAULTS = {
  enabled: false,
  mode: "open",
  requireScheduleMatch: true,
  clockInGraceMinutes: 15,
  clockOutGraceMinutes: 30,
  roundingMinutes: 0,
  autoCloseOpenBreakOnClockOut: true,
  geofence: {
    address: "",
    latitude: null,
    longitude: null,
    radiusMeters: 150,
    maxAccuracyMeters: 50,
  },
};

const ACCORDION_BASE_SX = {
  borderRadius: 3,
  border: "1px solid",
  borderColor: "divider",
  boxShadow: 1,
  overflow: "hidden",
  "&:before": { display: "none" },
  "&.Mui-expanded": {
    margin: 0,
  },
};

const ACCORDION_SUMMARY_SX = {
  px: { xs: 2, md: 3 },
  py: 0.75,
  minHeight: 72,
  bgcolor: "grey.50",
  transition: "background-color 120ms ease",
  "&:hover": {
    bgcolor: "grey.100",
  },
  "&.Mui-focusVisible": {
    bgcolor: "grey.50",
    outline: "none",
  },
  "&:focus, &:focus-visible, &:active": {
    outline: "none",
    boxShadow: "none",
  },
  "&.Mui-expanded": {
    minHeight: 72,
  },
  "& .MuiAccordionSummary-content": {
    my: 1,
  },
  "& .MuiAccordionSummary-content.Mui-expanded": {
    my: 1,
  },
};

const ACCORDION_DETAILS_SX = {
  pt: 2,
  px: { xs: 2, md: 3 },
  pb: { xs: 2, md: 3 },
  bgcolor: "background.paper",
};

const toSnakeCase = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

const toDisplayLabel = (value) => {
  const normalized = String(value || "")
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  if (!normalized) return "";

  return normalized
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const to12HourTime = (value) => {
  const raw = String(value || "").trim();
  const match = raw.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);

  if (!match) return raw;

  let hours = Number(match[1]);
  const minutes = match[2];
  const meridiem = hours >= 12 ? "PM" : "AM";

  hours = hours % 12 || 12;

  return `${hours}:${minutes} ${meridiem}`;
};

const normalizeArrayValues = (values) =>
  Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((item) => toSnakeCase(item))
        .filter(Boolean),
    ),
  );

const normalizeTimeTrackingPrefs = (input) => {
  const safe = input && typeof input === "object" ? input : {};

  const normalizedMode = ["open", "geofence"].includes(safe.mode)
    ? safe.mode
    : "open";

  const safeGeofence =
    safe.geofence && typeof safe.geofence === "object" ? safe.geofence : {};

  const normalizedRounding = [0, 5, 6, 10, 15].includes(
    Number(safe.roundingMinutes),
  )
    ? Number(safe.roundingMinutes)
    : TIME_TRACKING_DEFAULTS.roundingMinutes;

  return {
    enabled: Boolean(safe.enabled),
    mode: normalizedMode,
    requireScheduleMatch: true,
    clockInGraceMinutes: Math.max(
      0,
      Number.isFinite(Number(safe.clockInGraceMinutes))
        ? Number(safe.clockInGraceMinutes)
        : TIME_TRACKING_DEFAULTS.clockInGraceMinutes,
    ),
    clockOutGraceMinutes: Math.max(
      0,
      Number.isFinite(Number(safe.clockOutGraceMinutes))
        ? Number(safe.clockOutGraceMinutes)
        : TIME_TRACKING_DEFAULTS.clockOutGraceMinutes,
    ),
    roundingMinutes: normalizedRounding,
    autoCloseOpenBreakOnClockOut: true,
    geofence: {
      address: String(safeGeofence.address || ""),
      latitude:
        safeGeofence.latitude !== null &&
        safeGeofence.latitude !== "" &&
        Number.isFinite(Number(safeGeofence.latitude))
          ? Number(safeGeofence.latitude)
          : null,
      longitude:
        safeGeofence.longitude !== null &&
        safeGeofence.longitude !== "" &&
        Number.isFinite(Number(safeGeofence.longitude))
          ? Number(safeGeofence.longitude)
          : null,
      radiusMeters: Math.max(
        1,
        Number.isFinite(Number(safeGeofence.radiusMeters))
          ? Number(safeGeofence.radiusMeters)
          : TIME_TRACKING_DEFAULTS.geofence.radiusMeters,
      ),
      maxAccuracyMeters: Math.max(
        1,
        Number.isFinite(Number(safeGeofence.maxAccuracyMeters))
          ? Number(safeGeofence.maxAccuracyMeters)
          : TIME_TRACKING_DEFAULTS.geofence.maxAccuracyMeters,
      ),
    },
  };
};

const normalizeTaxonomyPrefs = (inputPrefs) => {
  const safePrefs = inputPrefs || {};
  const next = { ...safePrefs };

  TAXONOMY_FIELDS.forEach((field) => {
    next[field] = normalizeArrayValues(safePrefs[field]);
  });

  next.shiftTypeDefinitions = (
    Array.isArray(safePrefs.shiftTypeDefinitions)
      ? safePrefs.shiftTypeDefinitions
      : []
  )
    .map((definition) => {
      const key = toSnakeCase(definition?.key);
      if (!key) return null;

      const timeSlots = Array.from(
        new Map(
          (Array.isArray(definition?.timeSlots) ? definition.timeSlots : [])
            .map((slot) => {
              const tag = toSnakeCase(slot?.tag);
              const startLocalTime = String(slot?.startLocalTime || "").trim();
              const endLocalTime = String(slot?.endLocalTime || "").trim();

              if (!tag || !startLocalTime || !endLocalTime) return null;

              return [
                tag,
                {
                  tag,
                  label: String(slot?.label || "").trim() || null,
                  startLocalTime,
                  endLocalTime,
                  spansOvernight: Boolean(
                    endLocalTime &&
                    startLocalTime &&
                    endLocalTime <= startLocalTime,
                  ),
                },
              ];
            })
            .filter(Boolean),
        ).values(),
      );

      return {
        key,
        label: String(definition?.label || "").trim() || null,
        timeSlots,
      };
    })
    .filter(Boolean);

  const definitionKeys = next.shiftTypeDefinitions.map((item) => item.key);
  next.shiftTypes = Array.from(
    new Set([...(next.shiftTypes || []), ...definitionKeys]),
  );

  next.timeTracking = normalizeTimeTrackingPrefs(safePrefs.timeTracking);

  return next;
};

// Steps differ by permission since view-only staff can't edit or save anything here.
const getFacilityPreferencesTourSteps = ({ canManageFacilityPreferences }) => {
  if (!canManageFacilityPreferences) {
    return [
      {
        target: "guide-facility-scheduling-pattern",
        title: "Scheduling pattern",
        body: "This is the rotation pattern your facility uses for shift assignments, set by an admin.",
      },
      {
        target: "guide-facility-timezone",
        title: "Facility timezone",
        body: "Once an admin confirms a timezone here, shift-slot times across the app resolve against it.",
      },
    ];
  }

  return [
    {
      target: "guide-facility-scheduling-pattern",
      title: "Scheduling pattern",
      body: "Choose the rotation pattern auto-generate should follow when assigning shifts.",
    },
    {
      target: "guide-facility-timezone",
      title: "Set your facility timezone",
      body: "Pick and save a real timezone here so shift-slot times resolve correctly, instead of relying on each device's local time.",
    },
    {
      target: "guide-facility-taxonomy",
      title: "Define roles, areas, and shift types",
      body: "This taxonomy powers role options across coverage, scheduling, and staff profiles facility-wide.",
    },
    {
      target: "guide-facility-save-btn",
      title: "Save your changes",
      body: "Nothing here takes effect until you save \u2014 including the timezone selection above.",
    },
  ];
};

export default function FacilityPreferencesPage() {
  const { tenant, logout, can, fetchFacilityPreferences } = useAuth();
  const navigate = useNavigate();
  const canManageFacilityPreferences = can("facility_preferences.manage");
  const canViewFacilityPreferences =
    can("facility_preferences.view") || canManageFacilityPreferences;
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingTenant, setDeletingTenant] = useState(false);
  const { startTourIfUnseen } = useGuideTour();
  const facilityTourSteps = useMemo(
    () => getFacilityPreferencesTourSteps({ canManageFacilityPreferences }),
    [canManageFacilityPreferences],
  );

  useEffect(() => {
    // Wait for the loading gate to clear so target elements actually exist in the DOM.
    if (loading || !canViewFacilityPreferences) return;
    startTourIfUnseen("facility-preferences", facilityTourSteps);
    // Only ever auto-launched once per user via localStorage — intentionally minimal deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, canViewFacilityPreferences]);

  const [slotInputsByShiftType, setSlotInputsByShiftType] = useState({});
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [usageData, setUsageData] = useState({ rules: [], staff: [] });
  const [pendingRemove, setPendingRemove] = useState(null); // { field, value, label, note }
  const [newShiftType, setNewShiftType] = useState("");
  const [activeSection, setActiveSection] = useState("shifts");

  // What uses each role / area / certification / shift, for counts on the
  // chips and a heads-up before removing something in use.
  useEffect(() => {
    if (!canViewFacilityPreferences) return;
    Promise.allSettled([api.get("/staffing-template"), api.get("/staff")]).then(([t, st]) => {
      setUsageData({
        rules: t.status === "fulfilled" ? t.value.data?.rules || [] : [],
        staff: st.status === "fulfilled" && Array.isArray(st.value.data) ? st.value.data : [],
      });
    });
  }, [canViewFacilityPreferences]);

  // Deep links like /facility-preferences#areas.
  useEffect(() => {
    if (loading) return;
    const id = window.location.hash.replace("#", "");
    if (id) document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [loading]);

  useEffect(() => {
    if (!canViewFacilityPreferences) {
      setLoading(false);
      return;
    }

    async function fetchPrefs() {
      try {
        const res = await api.get("/facility-preferences");
        const loaded = normalizeTaxonomyPrefs(res.data);
        setPrefs(loaded);
        setSavedSnapshot(JSON.stringify(loaded));
      } catch (err) {
        console.error(err);
        setError("Failed to load facility preferences");
      } finally {
        setLoading(false);
      }
    }
    fetchPrefs();
  }, [canViewFacilityPreferences]);

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );

  if (!canViewFacilityPreferences) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (field, value) => {
    setPrefs((prev) => ({ ...prev, [field]: value }));
  };

  const handleTimeTrackingChange = (field, value) => {
    setPrefs((prev) => ({
      ...prev,
      timeTracking: {
        ...normalizeTimeTrackingPrefs(prev?.timeTracking),
        [field]: value,
      },
    }));
  };

  const handleGeofenceChange = (field, value) => {
    setPrefs((prev) => ({
      ...prev,
      timeTracking: {
        ...normalizeTimeTrackingPrefs(prev?.timeTracking),
        geofence: {
          ...normalizeTimeTrackingPrefs(prev?.timeTracking).geofence,
          [field]: value,
        },
      },
    }));
  };

  const getShiftTypeDefinition = (shiftTypeKey) => {
    const key = toSnakeCase(shiftTypeKey);
    return (prefs.shiftTypeDefinitions || []).find((item) => item.key === key);
  };

  const handleRemoveShiftSlot = (shiftTypeKey, slotIndex) => {
    const key = toSnakeCase(shiftTypeKey);
    setPrefs((prev) => ({
      ...prev,
      shiftTypeDefinitions: (prev.shiftTypeDefinitions || []).map(
        (definition) => {
          if (definition.key !== key) return definition;
          return {
            ...definition,
            timeSlots: (definition.timeSlots || []).filter(
              (_, idx) => idx !== slotIndex,
            ),
          };
        },
      ),
    }));
  };

  const addTag = (field, raw) => {
    const value = toSnakeCase(raw);
    if (!value) return false;
    if ((prefs[field] || []).includes(value)) {
      toast.warning(`${toDisplayLabel(value)} is already in the list`, { autoClose: 1500 });
      return false;
    }
    setPrefs((prev) => ({ ...prev, [field]: [...(prev[field] || []), value] }));
    return true;
  };

  const removeTagNow = (field, value) => {
    setPrefs((prev) => {
      const next = { ...prev, [field]: (prev[field] || []).filter((v) => v !== value) };
      if (field === "shiftTypes") {
        next.shiftTypeDefinitions = (prev.shiftTypeDefinitions || []).filter((d) => d.key !== value);
      }
      return next;
    });
  };

  const usageFor = (field, value) => {
    const key = toSnakeCase(value);
    const rules = usageData.rules.filter((r) => {
      if (field === "roleFamilies") return toSnakeCase(r.role) === key;
      if (field === "unitAreas") return toSnakeCase(r.unitArea) === key;
      if (field === "certificationTags") return (r.requiredCertificationTags || []).some((c) => toSnakeCase(c) === key);
      if (field === "shiftTypes") return toSnakeCase(r.shiftType) === key;
      return false;
    }).length;
    const staff = usageData.staff.filter((m) => {
      if (field === "roleFamilies") return (m.roles?.length ? m.roles : [m.role]).some((r) => toSnakeCase(r) === key);
      if (field === "unitAreas") return (m.allowedAreas || []).some((a) => toSnakeCase(a) === key);
      if (field === "certificationTags") return (m.certificationTags || []).some((c) => toSnakeCase(c) === key);
      return false;
    }).length;
    return { rules, staff };
  };

  const usageNote = (field) => (value) => {
    const { staff } = usageFor(field, value);
    return staff ? `${staff} staff` : "";
  };

  const askRemove = (field, value) => {
    const { rules, staff } = usageFor(field, value);
    if (!rules && !staff) {
      removeTagNow(field, value);
      return;
    }
    const parts = [];
    if (staff) parts.push(`${staff} staff ${staff === 1 ? "is" : "are"} tagged with it`);
    if (rules) parts.push(`${rules} Weekly Needs row${rules === 1 ? " uses" : "s use"} it`);
    setPendingRemove({ field, value, label: toLabel(value), note: parts.join(" and ") });
  };

  const addShiftType = () => {
    if (addTag("shiftTypes", newShiftType) !== false) setNewShiftType("");
  };

  const addSlot = (shiftTypeKey) => {
    const key = toSnakeCase(shiftTypeKey);
    const input = slotInputsByShiftType[key] || {};
    const start = String(input.startLocalTime || "").trim();
    const end = String(input.endLocalTime || "").trim();
    if (!start || !end) {
      toast.warning("Pick a start and end time", { autoClose: 1500 });
      return;
    }
    const name = String(input.name || "").trim();
    const tag = toSnakeCase(name) || `${key}_${start.replace(":", "")}_${end.replace(":", "")}`;
    setPrefs((prev) => {
      const defs = [...(prev.shiftTypeDefinitions || [])];
      const i = defs.findIndex((d) => d.key === key);
      const slot = { tag, label: name || null, startLocalTime: start, endLocalTime: end, spansOvernight: end <= start };
      if (i === -1) defs.push({ key, label: null, timeSlots: [slot] });
      else {
        if ((defs[i].timeSlots || []).some((x) => x.tag === tag || (x.startLocalTime === start && x.endLocalTime === end))) {
          toast.warning("That time is already listed", { autoClose: 1500 });
          return prev;
        }
        defs[i] = { ...defs[i], timeSlots: [...(defs[i].timeSlots || []), slot] };
      }
      return { ...prev, shiftTypeDefinitions: defs };
    });
    setSlotInputsByShiftType((prev) => ({ ...prev, [key]: { name: "", startLocalTime: "", endLocalTime: "" } }));
  };

  const setSlotField = (shiftTypeKey, field, value) => {
    const key = toSnakeCase(shiftTypeKey);
    setSlotInputsByShiftType((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), [field]: value } }));
  };

  const slotUsage = (shiftTypeKey, tag) =>
    usageData.rules.filter((r) => toSnakeCase(r.shiftType) === shiftTypeKey && toSnakeCase(r.shiftTag) === tag).length;

  const discardChanges = () => {
    if (savedSnapshot) setPrefs(JSON.parse(savedSnapshot));
    setError("");
  };

  const handleSave = async () => {
    if (prefs.timeTracking?.mode === "geofence") {
      const geofence = prefs.timeTracking.geofence || {};
      const hasValidCoordinates =
        Number.isFinite(geofence.latitude) &&
        geofence.latitude >= -90 &&
        geofence.latitude <= 90 &&
        Number.isFinite(geofence.longitude) &&
        geofence.longitude >= -180 &&
        geofence.longitude <= 180;
      const hasValidLimits =
        Number.isFinite(geofence.radiusMeters) &&
        geofence.radiusMeters >= 1 &&
        geofence.radiusMeters <= 5000 &&
        Number.isFinite(geofence.maxAccuracyMeters) &&
        geofence.maxAccuracyMeters >= 1 &&
        geofence.maxAccuracyMeters <= 500;

      if (
        !geofence.address?.trim() ||
        !hasValidCoordinates ||
        !hasValidLimits
      ) {
        const message =
          "Confirm a facility address and valid geofence location, radius, and accuracy limits before saving.";
        setError(message);
        toast.warning(message);
        return;
      }
    }

    setSaving(true);
    setError("");
    try {
      const payload = normalizeTaxonomyPrefs(prefs);

      const res = await api.post("/facility-preferences", payload);
      trackEvent("facility_settings_saved");
      const saved = normalizeTaxonomyPrefs(res.data);
      setPrefs(saved);
      setSavedSnapshot(JSON.stringify(saved));
      fetchFacilityPreferences?.();
      toast.success("Facility preferences saved", {
        position: "top-right",
        autoClose: 2000,
      });
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || err?.message || "Failed to save facility preferences");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    setError("");
    try {
      const res = await api.delete("/facility-preferences/reset");
      const reset = normalizeTaxonomyPrefs(res.data);
      setPrefs(reset);
      setSavedSnapshot(JSON.stringify(reset));
      fetchFacilityPreferences?.();
      setResetDialogOpen(false);
      toast.info("Facility preferences reset to defaults", {
        position: "top-right",
        autoClose: 2500,
      });
    } catch (err) {
      console.error(err);
      setError("Failed to reset facility preferences");
    } finally {
      setResetting(false);
    }
  };

  const handleDeleteTenant = async () => {
    const tenantId = tenant?._id || tenant?.id;

    if (!tenantId) {
      setError("Unable to determine tenant account to delete");
      setDeleteDialogOpen(false);
      return;
    }

    setDeletingTenant(true);
    setError("");

    try {
      const res = await api.delete(`/tenants/${tenantId}`);

      toast.success(
        res.data?.message ||
          "Facility account and related data deleted successfully",
        {
          position: "top-right",
          autoClose: 3000,
        },
      );

      logout();
      navigate("/", { replace: true });
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.data?.message || "Failed to delete facility account",
      );
    } finally {
      setDeletingTenant(false);
      setDeleteDialogOpen(false);
    }
  };

  const dirty = Boolean(savedSnapshot) && JSON.stringify(prefs) !== savedSnapshot;
  const readOnly = !canManageFacilityPreferences;
  const tt = prefs.timeTracking || TIME_TRACKING_DEFAULTS;
  const shiftKeys = prefs.shiftTypes || [];
  const NAV = [
    { id: "shifts", label: "Shift times" },
    { id: "roles", label: "Roles" },
    { id: "areas", label: "Unit areas" },
    { id: "certifications", label: "Certifications" },
    { id: "facility", label: "Facility" },
    { id: "time-tracking", label: "Time tracking" },
    { id: "notifications", label: "Notifications" },
    { id: "advanced", label: "Advanced" },
    ...(canManageFacilityPreferences && can("tenant.delete") ? [{ id: "danger", label: "Delete account" }] : []),
  ];
  const goTo = (id) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `#${id}`);
  };
  const selectSx = {
    minWidth: 220,
    borderRadius: "10px",
    bgcolor: IOS.canvas,
    fontSize: 14,
    "& fieldset": { border: "none" },
    "&:hover": { bgcolor: "#EDEDF0" },
    "& .MuiSelect-select": { py: "8px" },
  };
  const unit = (text) => (
    <Typography component="span" sx={{ fontSize: 14, color: IOS.secondary, ml: 1 }}>
      {text}
    </Typography>
  );

  return (
    <Box sx={{ bgcolor: IOS.canvas, minHeight: "100%", px: { xs: 2, md: 4 }, py: { xs: 3, md: 4 } }}>
      <Box sx={{ maxWidth: 1080, mx: "auto" }}>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 2, mb: 3 }}>
          <Box>
            <Typography
              component="h1"
              sx={{ fontSize: { xs: 26, md: 32 }, fontWeight: 700, letterSpacing: "-0.02em", color: IOS.ink, display: "flex", alignItems: "center", gap: 1 }}
            >
              Facility Preferences
              <GuideHelpButton tourId="facility-preferences" tourSteps={facilityTourSteps} />
            </Typography>
            <Typography sx={{ color: IOS.secondary, fontSize: 15, mt: 0.5, maxWidth: 640 }}>
              The building blocks of your schedule: shift times, roles, areas and certifications. Weekly Needs and staff
              profiles pick from these lists.
            </Typography>
          </Box>
          {canManageFacilityPreferences && (
            <Button
              startIcon={<FiRotateCcw size={15} />}
              onClick={() => setResetDialogOpen(true)}
              sx={{ borderRadius: "10px", color: IOS.redText, "&:hover": { bgcolor: tint(IOS.red, 0.08) } }}
            >
              Reset to defaults
            </Button>
          )}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: "12px" }}>
            {error}
          </Alert>
        )}
        {readOnly && (
          <Alert severity="info" sx={{ mb: 2, borderRadius: "12px" }}>
            You can look at these settings but only the owner or a scheduler can change them.
          </Alert>
        )}

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "190px minmax(0, 1fr)" }, gap: { xs: 3, md: 4 }, alignItems: "start" }}>
          {/* Section nav */}
          <Box component="nav" aria-label="Sections" sx={{ display: { xs: "none", md: "block" }, position: "sticky", top: 88 }}>
            {NAV.map((item) => (
              <Box
                key={item.id}
                component="button"
                type="button"
                onClick={() => goTo(item.id)}
                sx={{
                  all: "unset",
                  boxSizing: "border-box",
                  display: "block",
                  width: "100%",
                  cursor: "pointer",
                  px: 1.5,
                  py: 0.9,
                  borderRadius: "10px",
                  fontSize: 14,
                  fontWeight: 600,
                  color: item.id === "danger" ? IOS.redText : activeSection === item.id ? IOS.ink : IOS.secondary,
                  bgcolor: activeSection === item.id ? "rgba(0,0,0,0.05)" : "transparent",
                  "&:hover": { bgcolor: "rgba(0,0,0,0.04)", color: item.id === "danger" ? IOS.redText : IOS.ink },
                  "&:focus-visible": { boxShadow: `0 0 0 3px ${tint(IOS.blue, 0.3)}` },
                }}
              >
                {item.label}
              </Box>
            ))}
          </Box>

          <Stack spacing={4} sx={{ minWidth: 0 }}>
            {/* ── Shift times ── */}
            <Box data-guide-id="guide-facility-taxonomy">
              <Section
                id="shifts"
                title="Shift times"
                description="Your shifts and their hours. Each time you add here becomes a row in Weekly Needs."
              >
                {shiftKeys.length === 0 && (
                  <Typography sx={{ px: 2.5, py: 2, color: IOS.tertiary, fontSize: 14 }}>No shifts yet. Add one below, like Day or Night.</Typography>
                )}
                {shiftKeys.map((shiftTypeKey, si) => {
                  const definition = getShiftTypeDefinition(shiftTypeKey);
                  const slots = [...(definition?.timeSlots || [])].sort((x, y) => x.startLocalTime.localeCompare(y.startLocalTime));
                  const input = slotInputsByShiftType[toSnakeCase(shiftTypeKey)] || {};
                  return (
                    <Box key={shiftTypeKey} sx={{ px: { xs: 2, md: 2.5 }, py: 2, borderTop: si === 0 ? "none" : `1px solid ${IOS.separator}` }}>
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 1 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: 16, color: IOS.ink }}>{definition?.label || toDisplayLabel(shiftTypeKey)}</Typography>
                        {!readOnly && (
                          <Button
                            size="small"
                            onClick={() => askRemove("shiftTypes", shiftTypeKey)}
                            sx={{ color: IOS.secondary, borderRadius: "8px", "&:hover": { color: IOS.redText, bgcolor: tint(IOS.red, 0.08) } }}
                          >
                            Remove shift
                          </Button>
                        )}
                      </Box>
                      {slots.length === 0 ? (
                        <Typography sx={{ fontSize: 14, color: IOS.orangeText, mb: 1 }}>Add the hours for this shift.</Typography>
                      ) : (
                        <Box sx={{ borderRadius: IOS.radius.cell, bgcolor: IOS.canvas, mb: 1.25, overflow: "hidden" }}>
                          {slots.map((slot, idx) => {
                            const used = slotUsage(toSnakeCase(shiftTypeKey), slot.tag);
                            const originalIndex = (definition?.timeSlots || []).indexOf(slot);
                            return (
                              <Box
                                key={slot.tag}
                                sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 1.5, py: 1, borderTop: idx === 0 ? "none" : `1px solid ${IOS.hairline}` }}
                              >
                                <Typography sx={{ fontSize: 15, fontWeight: 600, color: IOS.ink, fontVariantNumeric: "tabular-nums", minWidth: 170 }}>
                                  {to12HourTime(slot.startLocalTime)} – {to12HourTime(slot.endLocalTime)}
                                </Typography>
                                {slot.label && !slot.label.toLowerCase().startsWith(toDisplayLabel(shiftTypeKey).toLowerCase()) && <Typography sx={{ fontSize: 13, color: IOS.secondary }}>{slot.label}</Typography>}
                                {slot.spansOvernight && (
                                  <Box component="span" sx={{ fontSize: 11, fontWeight: 700, color: "#5856D6", bgcolor: tint("#5856D6", 0.12), px: 0.75, py: 0.25, borderRadius: "6px" }}>
                                    Overnight
                                  </Box>
                                )}
                                {used > 0 && <Typography sx={{ fontSize: 12, color: IOS.secondary }}>in Weekly Needs</Typography>}
                                <Box sx={{ flex: 1 }} />
                                {!readOnly && (
                                  <Tooltip title={used ? "Used in Weekly Needs: remove it there first" : "Remove"}>
                                    <span>
                                      <IconButton
                                        size="small"
                                        aria-label={`Remove ${to12HourTime(slot.startLocalTime)} to ${to12HourTime(slot.endLocalTime)}`}
                                        disabled={used > 0}
                                        onClick={() => handleRemoveShiftSlot(shiftTypeKey, originalIndex)}
                                        sx={{ color: IOS.tertiary, "&:hover": { color: IOS.red, bgcolor: tint(IOS.red, 0.08) } }}
                                      >
                                        <FiX size={15} />
                                      </IconButton>
                                    </span>
                                  </Tooltip>
                                )}
                              </Box>
                            );
                          })}
                        </Box>
                      )}
                      {!readOnly && (
                        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
                          <Field
                            type="time"
                            aria-label={`${toDisplayLabel(shiftTypeKey)} start time`}
                            value={input.startLocalTime || ""}
                            onChange={(e) => setSlotField(shiftTypeKey, "startLocalTime", e.target.value)}
                            sx={{ width: 130 }}
                          />
                          <Typography sx={{ color: IOS.secondary }}>to</Typography>
                          <Field
                            type="time"
                            aria-label={`${toDisplayLabel(shiftTypeKey)} end time`}
                            value={input.endLocalTime || ""}
                            onChange={(e) => setSlotField(shiftTypeKey, "endLocalTime", e.target.value)}
                            sx={{ width: 130 }}
                          />
                          <Field
                            placeholder="Name (optional)"
                            aria-label={`${toDisplayLabel(shiftTypeKey)} time name`}
                            value={input.name || ""}
                            onChange={(e) => setSlotField(shiftTypeKey, "name", e.target.value)}
                            sx={{ width: 170 }}
                          />
                          <Button
                            onClick={() => addSlot(shiftTypeKey)}
                            disabled={!input.startLocalTime || !input.endLocalTime}
                            startIcon={<FiPlus size={14} />}
                            sx={{ borderRadius: "10px", px: 2, color: IOS.blue, bgcolor: tint(IOS.blue, 0.1), "&:hover": { bgcolor: tint(IOS.blue, 0.16) } }}
                          >
                            Add time
                          </Button>
                        </Box>
                      )}
                    </Box>
                  );
                })}
                {!readOnly && (
                  <Box sx={{ px: { xs: 2, md: 2.5 }, py: 2, bgcolor: "#FBFBFD", borderTop: `1px solid ${IOS.separator}`, display: "flex", gap: 1, maxWidth: "100%" }}>
                    <Field
                      placeholder="New shift, e.g. Day, Evening, Night"
                      aria-label="New shift name"
                      value={newShiftType}
                      onChange={(e) => setNewShiftType(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addShiftType();
                        }
                      }}
                      sx={{ flex: 1, maxWidth: 360, bgcolor: "#fff", border: `1px solid ${IOS.separator}` }}
                    />
                    <Button
                      onClick={addShiftType}
                      disabled={!newShiftType.trim()}
                      startIcon={<FiPlus size={14} />}
                      sx={{ borderRadius: "10px", px: 2, color: IOS.blue, bgcolor: tint(IOS.blue, 0.1), "&:hover": { bgcolor: tint(IOS.blue, 0.16) } }}
                    >
                      Add shift
                    </Button>
                  </Box>
                )}
              </Section>
            </Box>

            {/* ── Roles ── */}
            <Section id="roles" title="Roles" description="The jobs people do here. Staff get one or more roles; Weekly Needs asks for people by role.">
              <TagEditor
                items={prefs.roleFamilies || []}
                format={toLabel}
                placeholder="Add a role, e.g. CNA, Med Tech"
                onAdd={(v) => addTag("roleFamilies", v)}
                onRemove={(v) => askRemove("roleFamilies", v)}
                usage={usageNote("roleFamilies")}
                disabled={readOnly}
                color={IOS.blue}
                emptyText="No roles yet."
              />
            </Section>

            {/* ── Unit areas ── */}
            <Section
              id="areas"
              title="Unit areas"
              description="Optional. Parts of the building, like Memory Care or Assisted Living. Tag staff with the areas they can work, then ask for an area in Weekly Needs."
            >
              <TagEditor
                items={prefs.unitAreas || []}
                format={toLabel}
                placeholder="Add an area, e.g. Memory Care"
                onAdd={(v) => addTag("unitAreas", v)}
                onRemove={(v) => askRemove("unitAreas", v)}
                usage={usageNote("unitAreas")}
                disabled={readOnly}
                color={IOS.green}
                emptyText="No unit areas. Everyone can work anywhere."
              />
            </Section>

            {/* ── Certifications ── */}
            <Section
              id="certifications"
              title="Certifications"
              description="Optional. Skills a shift may require, like Med Pass or CPR. Only staff tagged with them are offered those shifts."
            >
              <TagEditor
                items={prefs.certificationTags || []}
                format={toLabel}
                placeholder="Add a certification, e.g. Med Pass"
                onAdd={(v) => addTag("certificationTags", v)}
                onRemove={(v) => askRemove("certificationTags", v)}
                usage={usageNote("certificationTags")}
                disabled={readOnly}
                color={IOS.purple}
                emptyText="No certifications."
              />
            </Section>

            {/* ── Facility ── */}
            <Section id="facility" title="Facility">
              <Box data-guide-id="guide-facility-timezone">
                <Row
                  first
                  label="Time zone"
                  help={
                    prefs.facilityTimezoneConfirmed
                      ? "Shift times are read in this time zone."
                      : "Not confirmed yet. Save a time zone so shift times don't depend on each device's clock."
                  }
                >
                  <Autocomplete
                    options={IANA_TIMEZONES}
                    value={prefs.facilityTimezone || "UTC"}
                    onChange={(_, value) => handleChange("facilityTimezone", value || "UTC")}
                    disableClearable
                    disabled={readOnly}
                    size="small"
                    renderInput={(params) => <TextField {...params} placeholder="America/New_York" inputProps={{ ...params.inputProps, "aria-label": "Time zone" }} />}
                    sx={{
                      width: { xs: "100%", sm: 280 },
                      "& .MuiOutlinedInput-root": { borderRadius: "10px", bgcolor: IOS.canvas, "& fieldset": { border: "none" } },
                    }}
                  />
                </Row>
              </Box>
              <Box data-guide-id="guide-facility-scheduling-pattern">
                <Row label="Scheduling pattern" help="The rotation Auto-fill follows when it assigns shifts.">
                  <Select
                    size="small"
                    value={prefs.schedulingPattern || "balance"}
                    onChange={(e) => handleChange("schedulingPattern", e.target.value)}
                    disabled={readOnly}
                    inputProps={{ "aria-label": "Scheduling pattern" }}
                    sx={{ ...selectSx, width: { xs: "100%", sm: 280 } }}
                  >
                    {SCHEDULING_PATTERNS.map((p) => (
                      <MenuItem key={p.value} value={p.value}>
                        {p.label}
                      </MenuItem>
                    ))}
                  </Select>
                </Row>
              </Box>
            </Section>

            {/* ── Time tracking ── */}
            <Section id="time-tracking" title="Time tracking" description="Let staff clock in and out of their shifts.">
              <Row first label="Time tracking" help={tt.enabled ? "Staff can clock in and out." : "Off. Clock in and out is turned off."}>
                <Toggle checked={Boolean(tt.enabled)} onChange={(v) => handleTimeTrackingChange("enabled", v)} disabled={readOnly} label="Time tracking" />
              </Row>
              {tt.enabled && (
                <>
                  <Row label="Where staff can clock in" help={tt.mode === "geofence" ? "Only at the facility. Their location is checked." : "Anywhere. No location check."}>
                    <ToggleButtonGroup
                      exclusive
                      size="small"
                      value={tt.mode || "open"}
                      onChange={(_, v) => v && handleTimeTrackingChange("mode", v)}
                      disabled={readOnly}
                      sx={segmentedSx}
                    >
                      <ToggleButton value="open">Anywhere</ToggleButton>
                      <ToggleButton value="geofence">At the facility</ToggleButton>
                    </ToggleButtonGroup>
                  </Row>
                  {tt.mode === "geofence" && (
                    <Row stack label="Facility location" help="Set the address and how close staff must be.">
                      <FacilityGeofenceMap geofence={tt.geofence} onChange={handleGeofenceChange} disabled={readOnly} />
                      <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap", mt: 1.5 }}>
                        <Box>
                          <Typography sx={{ fontSize: 13, color: IOS.secondary, mb: 0.5 }}>Radius</Typography>
                          <Field
                            type="number"
                            min={1}
                            max={5000}
                            aria-label="Geofence radius in meters"
                            value={tt.geofence?.radiusMeters ?? 150}
                            onChange={(e) => handleGeofenceChange("radiusMeters", Math.max(1, Number(e.target.value) || 1))}
                            disabled={readOnly}
                            sx={{ width: 96 }}
                          />
                          {unit("meters")}
                        </Box>
                        <Box>
                          <Typography sx={{ fontSize: 13, color: IOS.secondary, mb: 0.5 }}>Location accuracy needed</Typography>
                          <Field
                            type="number"
                            min={1}
                            max={500}
                            aria-label="Maximum location accuracy in meters"
                            value={tt.geofence?.maxAccuracyMeters ?? 50}
                            onChange={(e) => handleGeofenceChange("maxAccuracyMeters", Math.max(1, Number(e.target.value) || 1))}
                            disabled={readOnly}
                            sx={{ width: 96 }}
                          />
                          {unit("meters")}
                        </Box>
                      </Box>
                    </Row>
                  )}
                  <Row label="Rounding" help={Number(tt.roundingMinutes) ? `Clock times round to the nearest ${tt.roundingMinutes} minutes.` : "Clock times are saved exactly."}>
                    <Select
                      size="small"
                      value={tt.roundingMinutes ?? 0}
                      onChange={(e) => handleTimeTrackingChange("roundingMinutes", Number(e.target.value))}
                      disabled={readOnly}
                      inputProps={{ "aria-label": "Rounding" }}
                      sx={{ ...selectSx, minWidth: 160 }}
                    >
                      <MenuItem value={0}>No rounding</MenuItem>
                      <MenuItem value={5}>5 minutes</MenuItem>
                      <MenuItem value={6}>6 minutes</MenuItem>
                      <MenuItem value={10}>10 minutes</MenuItem>
                      <MenuItem value={15}>15 minutes</MenuItem>
                    </Select>
                  </Row>
                  <Row label="Clock-in window" help="How early or late someone can clock in around the shift start.">
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Field
                        type="number"
                        min={0}
                        aria-label="Clock-in window in minutes"
                        value={tt.clockInGraceMinutes ?? 15}
                        onChange={(e) => handleTimeTrackingChange("clockInGraceMinutes", Math.max(0, Number(e.target.value) || 0))}
                        disabled={readOnly}
                        sx={{ width: 80, textAlign: "right" }}
                      />
                      {unit("min")}
                    </Box>
                  </Row>
                  <Row label="Clock-out window" help="How early or late someone can clock out around the shift end.">
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Field
                        type="number"
                        min={0}
                        aria-label="Clock-out window in minutes"
                        value={tt.clockOutGraceMinutes ?? 30}
                        onChange={(e) => handleTimeTrackingChange("clockOutGraceMinutes", Math.max(0, Number(e.target.value) || 0))}
                        disabled={readOnly}
                        sx={{ width: 80, textAlign: "right" }}
                      />
                      {unit("min")}
                    </Box>
                  </Row>
                </>
              )}
            </Section>

            {/* ── Notifications ── */}
            <Section id="notifications" title="Notifications">
              <Row first label="Tell staff about open shifts" help="Message staff when a new open shift is posted.">
                <Toggle
                  checked={Boolean(prefs.notifyStaffOnCoveragePost)}
                  onChange={(v) => handleChange("notifyStaffOnCoveragePost", v)}
                  disabled={readOnly}
                  label="Tell staff about open shifts"
                />
              </Row>
              <Row label="Shift reminder" help="How long before a shift staff get a reminder.">
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Field
                    type="number"
                    min={1}
                    aria-label="Shift reminder in hours"
                    value={prefs.shiftReminderLeadHours ?? 24}
                    onChange={(e) => handleChange("shiftReminderLeadHours", parseInt(e.target.value, 10) || 1)}
                    disabled={readOnly}
                    sx={{ width: 80, textAlign: "right" }}
                  />
                  {unit("hours before")}
                </Box>
              </Row>
            </Section>

            {/* ── Advanced ── */}
            <Section id="advanced" title="Advanced" description="Used by Auto-fill when it ranks who should take a shift.">
              <Row first label="Overtime starts at" help="Hours in a week after which a shift counts as overtime.">
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Field
                    type="number"
                    min={1}
                    aria-label="Overtime threshold in hours per week"
                    value={prefs.weeklyOvertimeThresholdHours ?? 40}
                    onChange={(e) => handleChange("weeklyOvertimeThresholdHours", parseInt(e.target.value, 10) || 1)}
                    disabled={readOnly}
                    sx={{ width: 80, textAlign: "right" }}
                  />
                  {unit("hours / week")}
                </Box>
              </Row>
              <Row label="Fairness looks back" help="How many days of past shifts are used to share work out fairly (7 to 90).">
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Field
                    type="number"
                    min={7}
                    max={90}
                    aria-label="Fairness lookback in days"
                    value={prefs.fairnessLookbackDays ?? 28}
                    onChange={(e) => handleChange("fairnessLookbackDays", parseInt(e.target.value, 10) || 7)}
                    disabled={readOnly}
                    sx={{ width: 80, textAlign: "right" }}
                  />
                  {unit("days")}
                </Box>
              </Row>
            </Section>

            {/* ── Danger zone ── */}
            {canManageFacilityPreferences && can("tenant.delete") && (
              <Section id="danger" title="Delete account" tone="danger">
                <Row first label="Delete this facility" help="Permanently removes all staff, schedules, messages and settings. This can't be undone.">
                  <Button
                    onClick={() => setDeleteDialogOpen(true)}
                    disabled={deletingTenant || !tenant}
                    sx={{ borderRadius: "10px", px: 2, color: "#fff", bgcolor: IOS.red, "&:hover": { bgcolor: "#E0352B" } }}
                  >
                    Delete facility
                  </Button>
                </Row>
              </Section>
            )}
          </Stack>
        </Box>

        {/* Save bar */}
        {canManageFacilityPreferences && (
          <Box
            sx={{
              position: "sticky",
              bottom: 16,
              mt: 4,
              ml: { md: "calc(190px + 32px)" },
              zIndex: 5,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              px: 2.5,
              py: 1.5,
              borderRadius: IOS.radius.card,
              bgcolor: "rgba(255,255,255,0.86)",
              backdropFilter: "saturate(180%) blur(20px)",
              border: `1px solid ${IOS.hairline}`,
              boxShadow: dirty ? IOS.shadowRaised : IOS.shadow,
            }}
          >
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: dirty ? IOS.ink : IOS.secondary, display: "flex", alignItems: "center", gap: 1 }}>
              <Box component="span" sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: dirty ? IOS.orange : IOS.green }} />
              {dirty ? "You have unsaved changes" : "All changes saved"}
            </Typography>
            <Stack direction="row" spacing={1}>
              {dirty && (
                <Button onClick={discardChanges} disabled={saving} sx={{ borderRadius: "10px", color: IOS.ink, bgcolor: IOS.fill, px: 2 }}>
                  Discard
                </Button>
              )}
              <Button
                variant="contained"
                disableElevation
                onClick={handleSave}
                disabled={saving || !dirty}
                data-guide-id="guide-facility-save-btn"
                startIcon={saving ? <CircularProgress size={14} color="inherit" /> : null}
                sx={{ borderRadius: "10px", px: 2.5, bgcolor: IOS.blue, "&.Mui-disabled": { bgcolor: IOS.fill, color: IOS.tertiary } }}
              >
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </Stack>
          </Box>
        )}
      </Box>

      <Dialog open={Boolean(pendingRemove)} onClose={() => setPendingRemove(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: "16px" } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Remove {pendingRemove?.label}?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: IOS.secondary }}>
            {pendingRemove?.note}. They keep it for now, but it won't be offered as a choice anymore. Remove it there too if it's no longer used.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPendingRemove(null)} sx={{ borderRadius: "10px" }}>
            Keep
          </Button>
          <Button
            onClick={() => {
              removeTagNow(pendingRemove.field, pendingRemove.value);
              setPendingRemove(null);
            }}
            sx={{ borderRadius: "10px", color: "#fff", bgcolor: IOS.red, px: 2, "&:hover": { bgcolor: "#E0352B" } }}
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reset confirmation dialog */}
      <Dialog
        open={resetDialogOpen}
        onClose={() => !resetting && setResetDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: "16px" } }}
      >
        <DialogTitle>Reset to Defaults?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will remove all customised facility preferences and restore
            schema defaults. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setResetDialogOpen(false)}
            disabled={resetting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleReset}
            color="error"
            variant="contained"
            disabled={resetting}
            startIcon={
              resetting ? <CircularProgress size={14} color="inherit" /> : null
            }
          >
            {resetting ? "Resetting…" : "Reset"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deletingTenant && setDeleteDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: "16px" } }}
      >
        <DialogTitle>Delete Facility Account?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete your tenant account and all related
            data for this facility, including staff accounts, schedules,
            coverage, messages, time off, and preferences. This action cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            disabled={deletingTenant}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteTenant}
            color="error"
            variant="contained"
            disabled={deletingTenant}
          >
            {deletingTenant ? "Deleting..." : "Delete Facility"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
