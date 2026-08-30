import { useState, useEffect, useMemo } from "react";
import {
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  Button,
  Typography,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Box,
  Paper,
  Stack,
  IconButton,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  FormControlLabel,
  Switch,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import api from "../../../config/api";
import { toast } from "react-toastify";
import { useAuth } from "../../../context/AuthContext";
import {
  getRoleOptionsFromFacilityPreferences,
  getRoleDisplayName,
  getUserRoles,
  isSystemRole,
  SYSTEM_ROLE_OPTIONS,
} from "../../../constants/industryRoles";

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const PHONE_COUNTRY_CODES = [
  { code: "+1", label: "US/CA (+1)" },
  { code: "+44", label: "UK (+44)" },
  { code: "+234", label: "Nigeria (+234)" },
  { code: "+353", label: "Ireland (+353)" },
  { code: "+61", label: "Australia (+61)" },
  { code: "+64", label: "New Zealand (+64)" },
  { code: "+27", label: "South Africa (+27)" },
  { code: "+91", label: "India (+91)" },
  { code: "+49", label: "Germany (+49)" },
  { code: "+33", label: "France (+33)" },
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const normalizeStringArray = (values) =>
  Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  );

const normalizeNumberArray = (values) =>
  Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6),
    ),
  ).sort((a, b) => a - b);

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

const normalizeToken = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

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

const buildTimeSlotLabel = (slot) => {
  const tag = normalizeToken(slot?.tag);
  const label = String(slot?.label || "").trim();
  const start = String(slot?.startLocalTime || "").trim();
  const end = String(slot?.endLocalTime || "").trim();

  const displayName = label || toDisplayLabel(tag);
  if (start && end) {
    return `${displayName} (${to12HourTime(start)}-${to12HourTime(end)})`;
  }

  return displayName;
};

const extractStaffIdFromResponse = (data) =>
  data?.user?._id ||
  data?.user?.id ||
  data?.staff?._id ||
  data?.staff?.id ||
  data?._id ||
  data?.id ||
  null;

const SELECTOR_ACCORDION_SX = {
  borderRadius: 3,
  border: "1px solid",
  borderColor: "rgba(191, 219, 254, 0.95)",
  boxShadow: "0 10px 30px rgba(15, 23, 42, 0.05)",
  bgcolor: "background.paper",
  "&:before": { display: "none" },
  "&.Mui-expanded": { margin: 0 },
};

const SELECTOR_SUMMARY_SX = {
  px: { xs: 1.75, sm: 2.25 },
  py: 1,
  minHeight: 68,
  bgcolor: "rgba(248, 250, 252, 0.96)",
  borderBottom: "1px solid",
  borderBottomColor: "rgba(226, 232, 240, 0.9)",
  transition: "background-color 140ms ease, transform 140ms ease",
  "&:hover": {
    bgcolor: "rgba(241, 245, 249, 1)",
  },
  "&.Mui-expanded": {
    minHeight: 68,
    bgcolor: "rgba(248, 250, 252, 1)",
  },
  "& .MuiAccordionSummary-content": {
    my: 0,
  },
  "& .MuiAccordionSummary-content.Mui-expanded": {
    my: 0,
  },
};

const SELECTOR_DETAILS_SX = {
  p: { xs: 1.75, sm: 2.25 },
  bgcolor: "white",
};

const MultiChipSelector = ({
  label,
  helperText,
  options,
  values,
  onChange,
  getOptionValue,
  getOptionLabel,
  getOptionGroup,
  hideLabel = false,
  disabled = false,
}) => {
  const selectedValues = normalizeStringArray(values);

  const groupedVisibleOptions = useMemo(() => {
    const groupMap = new Map();

    options.forEach((option) => {
      const group = (getOptionGroup ? getOptionGroup(option) : "") || "Other";
      if (!groupMap.has(group)) {
        groupMap.set(group, []);
      }
      groupMap.get(group).push(option);
    });

    return Array.from(groupMap.entries());
  }, [options, getOptionGroup]);

  const toggleValue = (option) => {
    const value = getOptionValue(option);
    if (!value) return;

    const isSelected = selectedValues.includes(value);
    const nextValues = isSelected
      ? selectedValues.filter((item) => item !== value)
      : [...selectedValues, value];

    onChange(normalizeStringArray(nextValues));
  };

  return (
    <Box>
      {!hideLabel ? (
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          {label}
        </Typography>
      ) : null}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", mb: 1 }}
      >
        {helperText}
      </Typography>

      {selectedValues.length > 0 && (
        <Stack
          direction="row"
          spacing={0.75}
          flexWrap="wrap"
          useFlexGap
          sx={{ mb: 1 }}
        >
          {selectedValues.map((selectedValue) => (
            <Chip
              key={selectedValue}
              size="small"
              color="primary"
              label={toDisplayLabel(selectedValue)}
              onDelete={() =>
                onChange(
                  selectedValues.filter((item) => item !== selectedValue),
                )
              }
            />
          ))}
        </Stack>
      )}

      {!options.length ? (
        <Typography variant="caption" color="text.secondary">
          No options configured yet
        </Typography>
      ) : (
        <Box
          sx={{
            maxHeight: 220,
            overflowY: "auto",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            p: 1,
            bgcolor: "background.paper",
          }}
        >
          <Stack spacing={1.25}>
            {groupedVisibleOptions.map(([groupLabel, groupOptions]) => (
              <Box key={groupLabel}>
                {getOptionGroup ? (
                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      mb: 0.75,
                      fontWeight: 700,
                      color: "text.secondary",
                    }}
                  >
                    {groupLabel}
                  </Typography>
                ) : null}
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {groupOptions.map((option) => {
                    const value = getOptionValue(option);
                    const selected = selectedValues.includes(value);

                    return (
                      <Chip
                        key={value}
                        label={getOptionLabel(option)}
                        clickable
                        disabled={disabled}
                        color={selected ? "primary" : "default"}
                        variant={selected ? "filled" : "outlined"}
                        onClick={() => !disabled && toggleValue(option)}
                      />
                    );
                  })}
                </Stack>
              </Box>
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
};

const SectionCard = ({ eyebrow, title, description, children }) => (
  <Paper
    variant="outlined"
    sx={{
      p: { xs: 1.75, sm: 2.25 },
      borderRadius: 3,
      borderColor: "rgba(191, 219, 254, 0.95)",
      background:
        "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,251,255,0.96) 100%)",
      boxShadow: "0 12px 30px rgba(15, 23, 42, 0.06)",
    }}
  >
    <Stack spacing={2}>
      <Box
        sx={{
          pb: 1,
          borderBottom: "1px solid",
          borderColor: "rgba(226, 232, 240, 0.9)",
        }}
      >
        <Typography
          variant="overline"
          sx={{ color: "primary.main", fontWeight: 800, letterSpacing: 1 }}
        >
          {eyebrow}
        </Typography>
        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
          {title}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ maxWidth: 760 }}
        >
          {description}
        </Typography>
      </Box>
      {children}
    </Stack>
  </Paper>
);

export default function StaffCreateAndEditForm({
  staff,
  onSuccess,
  onClose,
  staffList = [],
}) {
  const { user, can, facilityPreferences, tenant } = useAuth();

  const canAssignOwnerRole = can("roles.manage");

  const facilityRoleOptions = useMemo(
    () => getRoleOptionsFromFacilityPreferences(facilityPreferences),
    [facilityPreferences],
  );

  const systemRoleOptions = useMemo(
    () =>
      SYSTEM_ROLE_OPTIONS.filter(
        (systemRole) =>
          systemRole !== "staff" &&
          (systemRole !== "owner" || canAssignOwnerRole),
      ).map((systemRole) => ({
        value: systemRole,
        label: getRoleDisplayName(systemRole),
      })),
    [canAssignOwnerRole],
  );

  const [form, setForm] = useState({
    name: "",
    email: "",
    phoneCountryCode: "",
    phone: "",
    allowedAreas: [],
    allowedShiftTags: [],
    allowedShiftTypes: [],
    certificationTags: [],
    preferredDaysOfWeek: [],
    avoidDaysOfWeek: [],
    preferredShiftTypes: [],
    targetHoursPerWeek: "",
    maxShiftsPerWeek: "",
    maxConsecutiveDays: "",
    wantsOvertime: false,
    rotationCadence: "none",
    rotationScope: "all_days",
    rotationAnchorDate: "",
    emailNotificationsEnabled: true,
    smsNotificationsEnabled: true,
    roles: [],
  });
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");

  const allowedAreaOptions = useMemo(
    () => Array.from(new Set(facilityPreferences?.unitAreas || [])),
    [facilityPreferences?.unitAreas],
  );

  const preferenceShiftTypeOptions = useMemo(() => {
    const configured = Array.from(
      new Set((facilityPreferences?.shiftTypes || []).filter(Boolean)),
    );
    return configured.length ? configured : ["day", "evening", "night"];
  }, [facilityPreferences?.shiftTypes]);

  const certificationTagOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...(facilityPreferences?.certificationTags || []),
          ...(Array.isArray(form?.certificationTags)
            ? form.certificationTags
            : []),
        ]),
      ),
    [facilityPreferences?.certificationTags, form?.certificationTags],
  );

  const shiftSlotOptions = useMemo(() => {
    const optionsByTag = new Map();

    (facilityPreferences?.shiftTypeDefinitions || []).forEach((definition) => {
      const shiftType = normalizeToken(definition?.key);
      if (!shiftType) return;

      const shiftTypeLabel =
        String(definition?.label || "").trim() || toDisplayLabel(shiftType);

      const slots = Array.isArray(definition?.timeSlots)
        ? definition.timeSlots
        : [];

      slots.forEach((slot) => {
        const tag = normalizeToken(slot?.tag);
        if (!tag) return;

        optionsByTag.set(tag, {
          value: tag,
          label: buildTimeSlotLabel(slot),
          shiftType,
          shiftTypeLabel,
        });
      });
    });

    (Array.isArray(form?.allowedShiftTags)
      ? form.allowedShiftTags
      : []
    ).forEach((rawTag) => {
      const tag = normalizeToken(rawTag);
      if (!tag || optionsByTag.has(tag)) return;

      optionsByTag.set(tag, {
        value: tag,
        label: toDisplayLabel(tag),
        shiftType: "",
        shiftTypeLabel: "",
      });
    });

    return Array.from(optionsByTag.values());
  }, [facilityPreferences?.shiftTypeDefinitions, form?.allowedShiftTags]);

  const shiftSlotTypeLookup = useMemo(() => {
    const lookup = new Map();
    shiftSlotOptions.forEach((option) => {
      lookup.set(option.value, option.shiftType);
    });
    return lookup;
  }, [shiftSlotOptions]);

  const areaLabelLookup = useMemo(
    () =>
      new Map(
        allowedAreaOptions.map((value) => [value, toDisplayLabel(value)]),
      ),
    [allowedAreaOptions],
  );

  const certificationLabelLookup = useMemo(
    () =>
      new Map(
        certificationTagOptions.map((value) => [value, toDisplayLabel(value)]),
      ),
    [certificationTagOptions],
  );

  const shiftSlotLabelLookup = useMemo(() => {
    const lookup = new Map();
    shiftSlotOptions.forEach((option) => {
      lookup.set(
        option.value,
        option.shiftTypeLabel
          ? `${option.shiftTypeLabel} - ${option.label}`
          : option.label,
      );
    });
    return lookup;
  }, [shiftSlotOptions]);

  const isEditingSelf = staff && staff._id === user._id;
  const disableRoleChange = Boolean(isEditingSelf);
  const hasFacilityRole = form.roles.some((roleValue) =>
    facilityRoleOptions.some((option) => option.value === roleValue),
  );
  const hasTagRestrictions =
    form.allowedAreas.length > 0 ||
    form.allowedShiftTags.length > 0 ||
    form.certificationTags.length > 0;

  const fetchStaffPreferences = async (staffId) => {
    if (!staffId) return;

    try {
      const res = await api.get(`/preferences/${staffId}`);
      const data = res.data || {};

      setForm((prev) => ({
        ...prev,
        preferredDaysOfWeek: normalizeNumberArray(data.preferredDaysOfWeek),
        avoidDaysOfWeek: normalizeNumberArray(data.avoidDaysOfWeek),
        preferredShiftTypes: normalizeStringArray(data.preferredShiftTypes),
        targetHoursPerWeek:
          data.targetHoursPerWeek === null ||
          data.targetHoursPerWeek === undefined
            ? ""
            : data.targetHoursPerWeek,
        maxShiftsPerWeek:
          data.maxShiftsPerWeek === null || data.maxShiftsPerWeek === undefined
            ? ""
            : data.maxShiftsPerWeek,
        maxConsecutiveDays:
          data.maxConsecutiveDays === null ||
          data.maxConsecutiveDays === undefined
            ? ""
            : data.maxConsecutiveDays,
        wantsOvertime: !!data.wantsOvertime,
        rotationCadence: data.rotationCadence || "none",
        rotationScope: data.rotationScope || "all_days",
        rotationAnchorDate: data.rotationAnchorDate
          ? String(data.rotationAnchorDate).slice(0, 10)
          : "",
        emailNotificationsEnabled: data.emailNotificationsEnabled ?? true,
        smsNotificationsEnabled: data.smsNotificationsEnabled ?? true,
      }));
    } catch (err) {
      console.error("Failed to fetch staff preferences", err);
    }
  };

  const saveStaffPreferences = async (staffId, preferencesPayload) => {
    if (!staffId) return;
    await api.post(`/preferences/${staffId}`, preferencesPayload);
  };

  useEffect(() => {
    if (staff) {
      const savedShiftTags = normalizeStringArray(staff.allowedShiftTags);
      const derivedShiftTags =
        savedShiftTags.length > 0
          ? savedShiftTags
          : normalizeStringArray(staff.allowedShiftTypes)
              .map((value) => {
                const colonIndex = value.indexOf(":");
                return colonIndex !== -1 ? value.slice(colonIndex + 1) : value;
              })
              .filter(Boolean);

      setForm({
        name: staff.name,
        email: staff.email,
        phoneCountryCode:
          staff.userPhoneCountryCode || staff.phoneCountryCode || "",
        phone: staff.userPhone || staff.phone || "",
        allowedAreas: normalizeStringArray(staff.allowedAreas),
        allowedShiftTags: derivedShiftTags,
        allowedShiftTypes: normalizeStringArray(staff.allowedShiftTypes),
        certificationTags: normalizeStringArray(staff.certificationTags),
        preferredDaysOfWeek: [],
        avoidDaysOfWeek: [],
        preferredShiftTypes: [],
        targetHoursPerWeek: "",
        maxShiftsPerWeek: "",
        maxConsecutiveDays: "",
        wantsOvertime: false,
        rotationCadence: "none",
        rotationScope: "all_days",
        rotationAnchorDate: "",
        emailNotificationsEnabled: true,
        smsNotificationsEnabled: true,
        roles: getUserRoles(staff),
      });

      fetchStaffPreferences(staff._id || staff.id);
    }
  }, [staff]);

  useEffect(() => {
    if (staff) return;

    setForm((prev) => {
      if (!facilityRoleOptions.length) {
        if (prev.roles.length) return prev;
        return { ...prev, roles: [] };
      }

      if (
        prev.roles.some((roleValue) =>
          facilityRoleOptions.some((item) => item.value === roleValue),
        )
      ) {
        return prev;
      }

      return { ...prev, roles: [facilityRoleOptions[0].value] };
    });
  }, [facilityRoleOptions, staff]);

  const handleSubmit = async () => {
    setEmailError("");
    setPhoneError("");

    const normalizedPhone = (form.phone || "").trim();
    const normalizedPhoneCountryCode = (form.phoneCountryCode || "").trim();

    if (!validateEmail(form.email)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    if (
      (normalizedPhone && !normalizedPhoneCountryCode) ||
      (!normalizedPhone && normalizedPhoneCountryCode)
    ) {
      setPhoneError("Please provide both country code and phone number");
      return;
    }

    try {
      const normalizedShiftTags = normalizeStringArray(
        form.allowedShiftTags,
      ).map((value) => normalizeToken(value));

      const slotSpecificShiftValues = Array.from(
        new Set(
          normalizedShiftTags.map((tag) => {
            const shiftType = shiftSlotTypeLookup.get(tag);
            return shiftType ? `${shiftType}:${tag}` : tag;
          }),
        ),
      );

      // If the user cleared all shift tags, send an empty array so the backend
      // removes the restrictions. Only fall back to the raw allowedShiftTypes
      // field when the facility has no time-slot definitions at all (legacy path).
      const normalizedShiftTypes =
        slotSpecificShiftValues.length > 0
          ? slotSpecificShiftValues
          : normalizedShiftTags.length === 0 && shiftSlotOptions.length > 0
            ? []
            : normalizeStringArray(form.allowedShiftTypes).map((value) =>
                normalizeToken(value),
              );

      const normalizedPreferredDays = normalizeNumberArray(
        form.preferredDaysOfWeek,
      );
      const normalizedAssignedRoles = normalizeStringArray(form.roles);

      if (!normalizedAssignedRoles.length) {
        toast.error(
          "Select at least one system permission or facility/job role.",
          {
            position: "top-right",
            autoClose: 3500,
          },
        );
        return;
      }

      const preferencesPayload = {
        preferredDaysOfWeek: normalizedPreferredDays,
        avoidDaysOfWeek: normalizeNumberArray(form.avoidDaysOfWeek),
        preferredShiftTypes: normalizeStringArray(form.preferredShiftTypes),
        targetHoursPerWeek:
          form.targetHoursPerWeek === "" || form.targetHoursPerWeek == null
            ? null
            : Number(form.targetHoursPerWeek),
        maxShiftsPerWeek:
          form.maxShiftsPerWeek === "" || form.maxShiftsPerWeek == null
            ? null
            : Number(form.maxShiftsPerWeek),
        maxConsecutiveDays:
          form.maxConsecutiveDays === "" || form.maxConsecutiveDays == null
            ? null
            : Number(form.maxConsecutiveDays),
        wantsOvertime: !!form.wantsOvertime,
        rotationCadence: form.rotationCadence || "none",
        rotationScope: form.rotationScope || "all_days",
        rotationAnchorDate:
          form.rotationCadence === "biweekly" && form.rotationAnchorDate
            ? form.rotationAnchorDate
            : null,
        emailNotificationsEnabled: !!form.emailNotificationsEnabled,
        smsNotificationsEnabled: !!form.smsNotificationsEnabled,
      };

      if (staff) {
        // Prevent self-role modification
        const nextRoles = disableRoleChange
          ? getUserRoles(staff)
          : normalizedAssignedRoles;
        const payload = {
          name: form.name,
          email: form.email,
          roles: nextRoles,
          allowedAreas: normalizeStringArray(form.allowedAreas),
          allowedShiftTags: normalizedShiftTags,
          allowedShiftTypes: normalizedShiftTypes,
          certificationTags: normalizeStringArray(form.certificationTags),
        };

        if (normalizedPhone && normalizedPhoneCountryCode) {
          payload.userPhoneCountryCode = normalizedPhoneCountryCode;
          payload.userPhone = normalizedPhone;
          payload.phoneCountryCode = normalizedPhoneCountryCode;
          payload.phone = normalizedPhone;
        }

        await api.put(`/auth/${staff._id}`, payload);
        await saveStaffPreferences(staff._id || staff.id, preferencesPayload);
        toast.success("Staff updated", {
          position: "top-right",
          autoClose: 2500,
        });
      } else {
        const seatLimit = Number(tenant?.seatLimit);
        const hasSeatLimit = Number.isFinite(seatLimit) && seatLimit > 0;
        const existingStaffCount = Array.isArray(staffList)
          ? staffList.length
          : 0;

        if (hasSeatLimit && existingStaffCount >= seatLimit) {
          toast.error(
            `Staff seat limit reached (${existingStaffCount}/${seatLimit}). Upgrade your plan to add more staff.`,
            { position: "top-right", autoClose: 4000 },
          );
          return;
        }

        const res = await api.post("/auth/signup/staff", {
          name: form.name,
          email: form.email,
          roles: normalizedAssignedRoles,
          allowedAreas: normalizeStringArray(form.allowedAreas),
          allowedShiftTags: normalizedShiftTags,
          allowedShiftTypes: normalizedShiftTypes,
          certificationTags: normalizeStringArray(form.certificationTags),
          ...(normalizedPhone && normalizedPhoneCountryCode
            ? {
                userPhoneCountryCode: normalizedPhoneCountryCode,
                userPhone: normalizedPhone,
                phoneCountryCode: normalizedPhoneCountryCode,
                phone: normalizedPhone,
              }
            : {}),
        });

        const createdStaffId = extractStaffIdFromResponse(res?.data);

        if (createdStaffId) {
          await saveStaffPreferences(createdStaffId, preferencesPayload);
        }

        toast.success("Staff created", {
          position: "top-right",
          autoClose: 2500,
        });
      }

      onSuccess();
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.message || "Failed to save staff";
      toast.error(msg, { position: "top-right", autoClose: 4000 });
    }
  };

  return (
    <Paper
      component="form"
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      sx={{
        p: { xs: 2, sm: 2.5, md: 3 },
        borderRadius: 4,
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(248,250,252,0.92) 100%)",
        border: "1px solid rgba(226, 232, 240, 0.95)",
        boxShadow: "0 24px 60px rgba(15, 23, 42, 0.08)",
        position: "relative",
        backdropFilter: "blur(8px)",
      }}
      elevation={0}
    >
      {onClose && (
        <IconButton
          aria-label="Close"
          onClick={onClose}
          sx={{ position: "absolute", top: 8, right: 8 }}
        >
          <CloseIcon />
        </IconButton>
      )}
      <Typography variant="h6" sx={{ mb: 2 }}>
        {staff ? "Edit Staff Member" : "Add Staff Member"}
      </Typography>

      <Stack spacing={2}>
        <SectionCard
          eyebrow="Staff Info"
          title="Basic Information"
          description="Core details used to identify the staff member and assign their role."
        >
          <TextField
            fullWidth
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <TextField
            fullWidth
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => {
              setForm({ ...form, email: e.target.value });
              setEmailError("");
            }}
            error={!!emailError}
            helperText={emailError}
          />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              select
              fullWidth
              label="Country Code"
              value={form.phoneCountryCode}
              onChange={(e) => {
                setForm({ ...form, phoneCountryCode: e.target.value });
                setPhoneError("");
              }}
            >
              <MenuItem value="">Select code</MenuItem>
              {PHONE_COUNTRY_CODES.map((item) => (
                <MenuItem key={item.code} value={item.code}>
                  {item.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              label="Phone Number"
              value={form.phone}
              onChange={(e) => {
                setForm({ ...form, phone: e.target.value });
                setPhoneError("");
              }}
              error={!!phoneError}
              helperText={phoneError}
              inputProps={{ inputMode: "tel" }}
            />
          </Stack>

          <Stack spacing={2}>
            <MultiChipSelector
              label="System permissions"
              helperText="Optional access roles. Scheduler can manage schedules; Admin can manage staff and facility operations. Only owners can assign Owner."
              options={systemRoleOptions}
              values={form.roles.filter((roleValue) => isSystemRole(roleValue))}
              onChange={(nextSystemRoles) => {
                const facilityRoles = form.roles.filter(
                  (roleValue) => !isSystemRole(roleValue),
                );
                setForm({
                  ...form,
                  roles: normalizeStringArray([
                    ...nextSystemRoles,
                    ...facilityRoles,
                  ]),
                });
              }}
              getOptionValue={(option) => option.value}
              getOptionLabel={(option) => option.label}
              hideLabel={false}
              disabled={disableRoleChange}
            />

            <MultiChipSelector
              label="Facility/job roles"
              helperText="Select schedulable job roles. A user can have a system permission role, a facility role, or both."
              options={facilityRoleOptions}
              values={form.roles.filter(
                (roleValue) => !isSystemRole(roleValue),
              )}
              onChange={(nextFacilityRoles) => {
                const systemRoles = form.roles.filter((roleValue) =>
                  isSystemRole(roleValue),
                );
                setForm({
                  ...form,
                  roles: normalizeStringArray([
                    ...systemRoles,
                    ...nextFacilityRoles,
                  ]),
                });
              }}
              getOptionValue={(option) => option.value}
              getOptionLabel={(option) => option.label}
              hideLabel={false}
              disabled={disableRoleChange}
            />
          </Stack>
        </SectionCard>

        <SectionCard
          eyebrow="Coverage Rules"
          title="Tagging and Restrictions"
          description="Use tags only when this staff member should be limited to specific areas, time slots, or certifications."
        >
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              color={hasTagRestrictions ? "warning" : "success"}
              variant={hasTagRestrictions ? "filled" : "outlined"}
              label={
                hasTagRestrictions ? "Restricted by tags" : "Floating staff"
              }
            />
            <Chip
              variant="outlined"
              label={`${form.allowedAreas.length} area tag${form.allowedAreas.length === 1 ? "" : "s"}`}
            />
            <Chip
              variant="outlined"
              label={`${form.allowedShiftTags.length} shift tag${form.allowedShiftTags.length === 1 ? "" : "s"}`}
            />
            <Chip
              variant="outlined"
              label={`${form.certificationTags.length} certification tag${form.certificationTags.length === 1 ? "" : "s"}`}
            />
          </Stack>

          <Alert severity={hasTagRestrictions ? "warning" : "info"}>
            {hasTagRestrictions
              ? "This staff member is restricted to coverages that match the selected tags. Leaving a tag group empty means no restriction from that group, but any selected tags will limit matching shifts."
              : "This staff member is currently untagged, which means they are treated as floating and can work any role-compatible coverage across areas and time slots."}
          </Alert>

          {allowedAreaOptions.length > 0 && (
            <Accordion disableGutters sx={SELECTOR_ACCORDION_SX}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ width: "100%" }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      Allowed Unit Areas
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={`${form.allowedAreas.length} selected`}
                  />
                </Stack>
              </AccordionSummary>
              <AccordionDetails sx={SELECTOR_DETAILS_SX}>
                <MultiChipSelector
                  helperText="Leave empty to allow any area. Once areas are selected, this staff member is limited to those areas."
                  options={allowedAreaOptions}
                  values={form.allowedAreas}
                  onChange={(value) =>
                    setForm({ ...form, allowedAreas: value })
                  }
                  getOptionValue={(option) => option}
                  getOptionLabel={(option) =>
                    areaLabelLookup.get(option) || toDisplayLabel(option)
                  }
                  hideLabel
                />
              </AccordionDetails>
            </Accordion>
          )}

          <Accordion disableGutters sx={SELECTOR_ACCORDION_SX}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ width: "100%" }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    Allowed Shift Time Slots
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  variant="outlined"
                  label={`${form.allowedShiftTags.length} selected`}
                />
              </Stack>
            </AccordionSummary>
            <AccordionDetails sx={SELECTOR_DETAILS_SX}>
              <MultiChipSelector
                helperText={
                  shiftSlotOptions.length
                    ? "Leave empty to allow any time slot. Selecting chips restricts this staff member to those exact shift slots."
                    : "No shift definitions configured yet. Define shift type time slots in Facility Preferences to use this."
                }
                options={shiftSlotOptions}
                values={form.allowedShiftTags}
                onChange={(value) =>
                  setForm({ ...form, allowedShiftTags: value })
                }
                getOptionValue={(option) => option.value}
                getOptionLabel={(option) =>
                  shiftSlotLabelLookup.get(option.value) || option.label
                }
                getOptionGroup={(option) => option.shiftTypeLabel || "Other"}
              />
            </AccordionDetails>
          </Accordion>

          <Accordion disableGutters sx={SELECTOR_ACCORDION_SX}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ width: "100%" }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    Certification Tags
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  variant="outlined"
                  label={`${form.certificationTags.length} selected`}
                />
              </Stack>
            </AccordionSummary>
            <AccordionDetails sx={SELECTOR_DETAILS_SX}>
              <MultiChipSelector
                helperText={
                  certificationTagOptions.length
                    ? "Leave empty if no certification restriction is needed. Selecting certifications limits staff to coverages requiring those tags."
                    : "No certification tags configured yet — add them in Facility Preferences"
                }
                options={certificationTagOptions}
                values={form.certificationTags}
                onChange={(value) =>
                  setForm({ ...form, certificationTags: value })
                }
                getOptionValue={(option) => option}
                getOptionLabel={(option) =>
                  certificationLabelLookup.get(option) || toDisplayLabel(option)
                }
              />
            </AccordionDetails>
          </Accordion>
        </SectionCard>

        {hasFacilityRole && (
          <SectionCard
            eyebrow="Staff Preferences"
            title="Availability and Notifications"
            description="These preferences help guide scheduling and how this staff member receives updates."
          >
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                Preferred Work Days
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 1 }}
              >
                Select days this staff member prefers to work.
              </Typography>
              <ToggleButtonGroup
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, minmax(42px, 1fr))",
                  gap: 1,
                }}
              >
                {DAYS.map((day, index) => {
                  const isPreferred = form.preferredDaysOfWeek.includes(index);
                  return (
                    <ToggleButton
                      key={day}
                      value={day}
                      selected={isPreferred}
                      onClick={() => {
                        const nextValues = isPreferred
                          ? form.preferredDaysOfWeek.filter(
                              (item) => item !== index,
                            )
                          : [...form.preferredDaysOfWeek, index];

                        setForm({
                          ...form,
                          preferredDaysOfWeek: normalizeNumberArray(nextValues),
                        });
                      }}
                      sx={{
                        borderRadius: 2,
                        minHeight: 40,
                        fontWeight: 600,
                        bgcolor: isPreferred
                          ? "success.lighter"
                          : "background.paper",
                        color: isPreferred ? "success.dark" : "text.primary",
                        border: isPreferred ? "2px solid" : "1px solid",
                        borderColor: isPreferred ? "success.main" : "divider",
                        "&:hover": {
                          borderColor: "success.light",
                        },
                      }}
                    >
                      {day}
                    </ToggleButton>
                  );
                })}
              </ToggleButtonGroup>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                Days to Avoid
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 1 }}
              >
                Days this staff member would rather not work, if avoidable
              </Typography>
              <ToggleButtonGroup
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, minmax(42px, 1fr))",
                  gap: 1,
                }}
              >
                {DAYS.map((day, index) => {
                  const isAvoided = form.avoidDaysOfWeek.includes(index);
                  return (
                    <ToggleButton
                      key={day}
                      value={day}
                      selected={isAvoided}
                      onClick={() => {
                        const nextValues = isAvoided
                          ? form.avoidDaysOfWeek.filter(
                              (item) => item !== index,
                            )
                          : [...form.avoidDaysOfWeek, index];

                        setForm({
                          ...form,
                          avoidDaysOfWeek: normalizeNumberArray(nextValues),
                        });
                      }}
                      sx={{
                        borderRadius: 2,
                        minHeight: 40,
                        fontWeight: 600,
                        bgcolor: isAvoided
                          ? "error.lighter"
                          : "background.paper",
                        color: isAvoided ? "error.dark" : "text.primary",
                        border: isAvoided ? "2px solid" : "1px solid",
                        borderColor: isAvoided ? "error.main" : "divider",
                        "&:hover": { borderColor: "error.light" },
                      }}
                    >
                      {day}
                    </ToggleButton>
                  );
                })}
              </ToggleButtonGroup>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                Preferred Shift Types
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 1 }}
              >
                Shift types this staff member would prefer
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {preferenceShiftTypeOptions.map((shiftType) => {
                  const isSelected =
                    form.preferredShiftTypes.includes(shiftType);
                  return (
                    <Chip
                      key={shiftType}
                      label={toDisplayLabel(shiftType)}
                      clickable
                      color={isSelected ? "primary" : "default"}
                      variant={isSelected ? "filled" : "outlined"}
                      onClick={() => {
                        const nextValues = isSelected
                          ? form.preferredShiftTypes.filter(
                              (item) => item !== shiftType,
                            )
                          : [...form.preferredShiftTypes, shiftType];

                        setForm({
                          ...form,
                          preferredShiftTypes: normalizeStringArray(nextValues),
                        });
                      }}
                    />
                  );
                })}
              </Stack>
            </Box>

            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: "grey.50",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <FormControlLabel
                sx={{ m: 0, width: "100%" }}
                control={
                  <Switch
                    checked={!!form.wantsOvertime}
                    onChange={(e) =>
                      setForm({ ...form, wantsOvertime: e.target.checked })
                    }
                  />
                }
                label={
                  <Box>
                    <Typography>Open to Overtime</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Projected overtime won't count against this staff member
                      when ranking assignments
                    </Typography>
                  </Box>
                }
              />
            </Box>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                fullWidth
                type="number"
                label="Target Hours / Week"
                value={form.targetHoursPerWeek ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    targetHoursPerWeek:
                      e.target.value === "" ? "" : Number(e.target.value),
                  })
                }
                inputProps={{ min: 0, max: 168 }}
              />
              <TextField
                fullWidth
                type="number"
                label="Max Shifts / Week"
                value={form.maxShiftsPerWeek ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    maxShiftsPerWeek:
                      e.target.value === "" ? "" : Number(e.target.value),
                  })
                }
                inputProps={{ min: 1, max: 7 }}
              />
              <TextField
                fullWidth
                type="number"
                label="Max Consecutive Days"
                value={form.maxConsecutiveDays ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    maxConsecutiveDays:
                      e.target.value === "" ? "" : Number(e.target.value),
                  })
                }
                inputProps={{ min: 1, max: 31 }}
              />
            </Stack>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Rotation
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <FormControl fullWidth>
                  <InputLabel>Cadence</InputLabel>
                  <Select
                    label="Cadence"
                    value={form.rotationCadence || "none"}
                    onChange={(e) =>
                      setForm({ ...form, rotationCadence: e.target.value })
                    }
                  >
                    <MenuItem value="none">None</MenuItem>
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="biweekly">Biweekly</MenuItem>
                  </Select>
                </FormControl>

                {form.rotationCadence && form.rotationCadence !== "none" && (
                  <FormControl fullWidth>
                    <InputLabel>Scope</InputLabel>
                    <Select
                      label="Scope"
                      value={form.rotationScope || "all_days"}
                      onChange={(e) =>
                        setForm({ ...form, rotationScope: e.target.value })
                      }
                    >
                      <MenuItem value="all_days">Every day</MenuItem>
                      <MenuItem value="weekends_only">Weekends only</MenuItem>
                    </Select>
                  </FormControl>
                )}

                {form.rotationCadence === "biweekly" && (
                  <TextField
                    fullWidth
                    type="date"
                    label="Anchor Date"
                    InputLabelProps={{ shrink: true }}
                    value={form.rotationAnchorDate || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        rotationAnchorDate: e.target.value,
                      })
                    }
                    helperText="Defines which week is the 'on' week"
                  />
                )}
              </Stack>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                Notification Preferences
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 1 }}
              >
                Configure email and SMS alerts for this staff member.
              </Typography>
              <Stack spacing={1}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={!!form.emailNotificationsEnabled}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          emailNotificationsEnabled: e.target.checked,
                        })
                      }
                    />
                  }
                  label="Email Notifications"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={!!form.smsNotificationsEnabled}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          smsNotificationsEnabled: e.target.checked,
                        })
                      }
                    />
                  }
                  label="SMS Notifications"
                />
              </Stack>
            </Box>
          </SectionCard>
        )}

        <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
          <Button variant="contained" fullWidth onClick={handleSubmit}>
            {staff ? "Save Changes" : "Create Staff"}
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}
