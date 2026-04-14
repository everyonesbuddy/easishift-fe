import { useState, useEffect } from "react";
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

export default function StaffCreateAndEditForm({
  staff,
  onSuccess,
  onClose,
  staffList = [],
}) {
  const { user, role: loggedInRole, tenant } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phoneCountryCode: "",
    phone: "",
    role: "doctor",
  });
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");

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
        role: staff.role,
      });
    }
  }, [staff]);

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
        >
          <MenuItem value="doctor">Doctor</MenuItem>
          <MenuItem value="nurse">Nurse</MenuItem>
          <MenuItem value="rn">RN</MenuItem>
          <MenuItem value="lpn">LPN</MenuItem>
          <MenuItem value="cna">CNA</MenuItem>
          <MenuItem value="med_aide">Med Aide</MenuItem>
          <MenuItem value="caregiver">Caregiver</MenuItem>
          <MenuItem value="activity_aide">Activity Aide</MenuItem>
          <MenuItem value="dietary_aide">Dietary Aide</MenuItem>
          <MenuItem value="housekeeper">Housekeeper</MenuItem>
          <MenuItem value="receptionist">Receptionist</MenuItem>
          <MenuItem value="billing">Billing</MenuItem>
          <MenuItem value="staff">General Staff</MenuItem>
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
