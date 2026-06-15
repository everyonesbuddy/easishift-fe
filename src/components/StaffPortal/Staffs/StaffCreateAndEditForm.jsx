import { useState, useEffect, useMemo } from "react";
import {
  Alert,
  TextField,
  Button,
  Typography,
  MenuItem,
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
import api from "../../../config/api";
import { toast } from "react-toastify";
import { useAuth } from "../../../context/AuthContext";
import {
  getRoleOptionsFromFacilityPreferences,
  getRoleDisplayName,
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

const buildTimeSlotLabel = (slot) => {
  const tag = normalizeToken(slot?.tag);
  const label = String(slot?.label || "").trim();
  const start = String(slot?.startLocalTime || "").trim();
  const end = String(slot?.endLocalTime || "").trim();

  const displayName = label || toDisplayLabel(tag);
  if (start && end) {
    return `${displayName} (${start}-${end})`;
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

const MultiChipSelector = ({
  label,
  helperText,
  options,
  values,
  onChange,
  getOptionValue,
  getOptionLabel,
}) => {
  const selectedValues = normalizeStringArray(values);

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
      <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
        {label}
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", mb: 1 }}
      >
        {helperText}
      </Typography>

      {!options.length ? (
        <Typography variant="caption" color="text.secondary">
          No options configured yet
        </Typography>
      ) : (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {options.map((option) => {
            const value = getOptionValue(option);
            const selected = selectedValues.includes(value);

            return (
              <Chip
                key={value}
                label={getOptionLabel(option)}
                clickable
                color={selected ? "primary" : "default"}
                variant={selected ? "filled" : "outlined"}
                onClick={() => toggleValue(option)}
              />
            );
          })}
        </Stack>
      )}
    </Box>
  );
};

const SectionCard = ({ eyebrow, title, description, children }) => (
  <Paper
    variant="outlined"
    sx={{
      p: { xs: 1.5, sm: 2 },
      borderRadius: 2.5,
      borderColor: "#dbeafe",
      backgroundColor: "#f8fbff",
    }}
  >
    <Stack spacing={1.5}>
      <Box>
        <Typography
          variant="overline"
          sx={{ color: "primary.main", fontWeight: 700, letterSpacing: 0.8 }}
        >
          {eyebrow}
        </Typography>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
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
  const { user, role: loggedInRole, facilityPreferences, tenant } = useAuth();

  const canAssignAdminRole = loggedInRole === "admin";

  const facilityRoleOptions = useMemo(
    () => getRoleOptionsFromFacilityPreferences(facilityPreferences),
    [facilityPreferences],
  );

  const roleOptions = useMemo(() => {
    return facilityRoleOptions;
  }, [facilityRoleOptions]);

  const selectableRoleOptions = useMemo(() => {
    const options = canAssignAdminRole
      ? [...roleOptions, { value: "admin", label: getRoleDisplayName("admin") }]
      : roleOptions;

    const dedupedOptions = Array.from(
      new Map(options.map((item) => [item.value, item])).values(),
    );

    if (
      !staff?.role ||
      dedupedOptions.some((item) => item.value === staff.role)
    ) {
      return dedupedOptions;
    }

    return [
      ...dedupedOptions,
      { value: staff.role, label: getRoleDisplayName(staff.role) },
    ];
  }, [roleOptions, staff?.role, canAssignAdminRole]);

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
    emailNotificationsEnabled: true,
    smsNotificationsEnabled: true,
    role: "",
  });
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");

  const allowedAreaOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...(facilityPreferences?.unitAreas || []),
          ...(Array.isArray(form?.allowedAreas) ? form.allowedAreas : []),
        ]),
      ),
    [facilityPreferences?.unitAreas, form?.allowedAreas],
  );

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
  const disableRoleChange = isEditingSelf && loggedInRole === "admin";
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
        emailNotificationsEnabled: true,
        smsNotificationsEnabled: true,
        role: staff.role,
      });

      fetchStaffPreferences(staff._id || staff.id);
    }
  }, [staff]);

  useEffect(() => {
    if (staff) return;

    setForm((prev) => {
      if (!roleOptions.length) {
        if (prev.role) return prev;
        return { ...prev, role: "staff" };
      }

      if (prev.role && roleOptions.some((item) => item.value === prev.role)) {
        return prev;
      }

      return { ...prev, role: roleOptions[0].value };
    });
  }, [roleOptions, staff]);

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

      const preferencesPayload = {
        preferredDaysOfWeek: normalizedPreferredDays,
        emailNotificationsEnabled: !!form.emailNotificationsEnabled,
        smsNotificationsEnabled: !!form.smsNotificationsEnabled,
      };

      if (staff) {
        // Prevent self-role modification
        const payload = {
          name: form.name,
          email: form.email,
          role: disableRoleChange ? staff.role : form.role,
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
          role: form.role,
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
        p: 3,
        borderRadius: 2,
        backgroundColor: "rgba(255,255,255,0.02)",
        position: "relative",
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

          <TextField
            select
            fullWidth
            label="Role"
            value={form.role}
            disabled={disableRoleChange}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            SelectProps={{
              MenuProps: {
                PaperProps: {
                  sx: { maxHeight: 480 },
                },
              },
            }}
          >
            {selectableRoleOptions.map((item) => (
              <MenuItem key={item.value} value={item.value}>
                {item.label}
              </MenuItem>
            ))}
          </TextField>
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
            <MultiChipSelector
              label="Allowed Unit Areas"
              helperText="Leave empty to allow any area. Once areas are selected, this staff member is limited to those areas."
              options={allowedAreaOptions}
              values={form.allowedAreas}
              onChange={(value) => setForm({ ...form, allowedAreas: value })}
              getOptionValue={(option) => option}
              getOptionLabel={(option) =>
                areaLabelLookup.get(option) || toDisplayLabel(option)
              }
            />
          )}

          <MultiChipSelector
            label="Allowed Shift Time Slots"
            helperText={
              shiftSlotOptions.length
                ? "Leave empty to allow any time slot. Selecting chips restricts this staff member to those exact shift slots."
                : "No shift definitions configured yet. Define shift type time slots in Facility Preferences to use this."
            }
            options={shiftSlotOptions}
            values={form.allowedShiftTags}
            onChange={(value) => setForm({ ...form, allowedShiftTags: value })}
            getOptionValue={(option) => option.value}
            getOptionLabel={(option) =>
              shiftSlotLabelLookup.get(option.value) || option.label
            }
          />

          <MultiChipSelector
            label="Certification Tags"
            helperText={
              certificationTagOptions.length
                ? "Leave empty if no certification restriction is needed. Selecting certifications limits staff to coverages requiring those tags."
                : "No certification tags configured yet — add them in Facility Preferences"
            }
            options={certificationTagOptions}
            values={form.certificationTags}
            onChange={(value) => setForm({ ...form, certificationTags: value })}
            getOptionValue={(option) => option}
            getOptionLabel={(option) =>
              certificationLabelLookup.get(option) || toDisplayLabel(option)
            }
          />
        </SectionCard>

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

        <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
          <Button variant="contained" fullWidth onClick={handleSubmit}>
            {staff ? "Save Changes" : "Create Staff"}
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}
