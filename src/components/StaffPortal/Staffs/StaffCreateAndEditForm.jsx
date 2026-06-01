import { useState, useEffect, useMemo } from "react";
import {
  TextField,
  Button,
  Typography,
  MenuItem,
  Box,
  Paper,
  Stack,
  IconButton,
  Chip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import api from "../../../config/api";
import { toast } from "react-toastify";
import { useAuth } from "../../../context/AuthContext";
import {
  getRoleOptionsFromFacilityPreferences,
  getRoleOptionsForIndustry,
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

const normalizeStringArray = (values) =>
  Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  );

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

export default function StaffCreateAndEditForm({
  staff,
  onSuccess,
  onClose,
  staffList = [],
}) {
  const { user, role: loggedInRole, tenant, facilityPreferences } = useAuth();

  const canAssignAdminRole = loggedInRole === "admin";

  const facilityRoleOptions = useMemo(
    () => getRoleOptionsFromFacilityPreferences(facilityPreferences),
    [facilityPreferences],
  );

  const roleOptions = useMemo(() => {
    if (facilityRoleOptions.length) return facilityRoleOptions;
    return getRoleOptionsForIndustry(tenant?.industry);
  }, [facilityRoleOptions, tenant?.industry]);

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
        role: staff.role,
      });
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

      const normalizedShiftTypes = slotSpecificShiftValues.length
        ? slotSpecificShiftValues
        : normalizeStringArray(form.allowedShiftTypes).map((value) =>
            normalizeToken(value),
          );

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

        await api.post("/auth/signup/staff", {
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

        {allowedAreaOptions.length > 0 && (
          <MultiChipSelector
            label="Allowed Unit Areas"
            helperText="Click chips to select or remove areas"
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
              ? "Select exact slots, e.g. Day - Day 1 or Day - Day 2"
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
              ? "Click chips to select or remove certifications"
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

        <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
          <Button variant="contained" fullWidth onClick={handleSubmit}>
            {staff ? "Save Changes" : "Create Staff"}
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}
