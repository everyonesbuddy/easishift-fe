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

  const isEditingSelf = staff && staff._id === user._id;
  const disableRoleChange = isEditingSelf && loggedInRole === "admin";

  useEffect(() => {
    if (staff) {
      setForm({
        name: staff.name,
        email: staff.email,
        phoneCountryCode:
          staff.userPhoneCountryCode || staff.phoneCountryCode || "",
        phone: staff.userPhone || staff.phone || "",
        allowedAreas: normalizeStringArray(staff.allowedAreas),
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
      if (staff) {
        // Prevent self-role modification
        const payload = {
          name: form.name,
          email: form.email,
          role: disableRoleChange ? staff.role : form.role,
          allowedAreas: normalizeStringArray(form.allowedAreas),
          allowedShiftTypes: normalizeStringArray(form.allowedShiftTypes),
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
          allowedShiftTypes: normalizeStringArray(form.allowedShiftTypes),
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

        <TextField
          select
          fullWidth
          label="Allowed Unit Areas"
          value={form.allowedAreas}
          onChange={(e) => setForm({ ...form, allowedAreas: e.target.value })}
          SelectProps={{ multiple: true }}
          disabled={!allowedAreaOptions.length}
          helperText={
            allowedAreaOptions.length
              ? "Leave empty to allow any area"
              : "Admin has not configured unit areas yet"
          }
        >
          {allowedAreaOptions.map((area) => (
            <MenuItem key={area} value={area}>
              {area}
            </MenuItem>
          ))}
        </TextField>

        {facilityPreferences?.shiftTypes?.length > 0 && (
          <TextField
            select
            fullWidth
            label="Allowed Shift Types"
            value={form.allowedShiftTypes}
            onChange={(e) =>
              setForm({ ...form, allowedShiftTypes: e.target.value })
            }
            SelectProps={{ multiple: true }}
            helperText="Leave empty to allow any shift type"
          >
            {facilityPreferences.shiftTypes.map((shiftType) => (
              <MenuItem key={shiftType} value={shiftType}>
                {shiftType}
              </MenuItem>
            ))}
          </TextField>
        )}

        <TextField
          select
          fullWidth
          label="Certification Tags"
          value={form.certificationTags}
          onChange={(e) =>
            setForm({ ...form, certificationTags: e.target.value })
          }
          SelectProps={{ multiple: true }}
          disabled={!certificationTagOptions.length}
          helperText={
            certificationTagOptions.length
              ? "Optional staff capabilities"
              : "Admin has not configured certification tags yet"
          }
        >
          {certificationTagOptions.map((tag) => (
            <MenuItem key={tag} value={tag}>
              {tag}
            </MenuItem>
          ))}
        </TextField>

        <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
          <Button variant="contained" fullWidth onClick={handleSubmit}>
            {staff ? "Save Changes" : "Create Staff"}
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}
