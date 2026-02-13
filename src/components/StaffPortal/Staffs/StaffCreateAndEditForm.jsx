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

export default function StaffCreateAndEditForm({ staff, onSuccess, onClose }) {
  const { user, role: loggedInRole } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "doctor",
  });

  const isEditingSelf = staff && staff._id === user._id;
  const disableRoleChange = isEditingSelf && loggedInRole === "admin";

  useEffect(() => {
    if (staff) {
      setForm({
        name: staff.name,
        email: staff.email,
        password: "",
        role: staff.role,
      });
    }
  }, [staff]);

  const handleSubmit = async () => {
    try {
      if (staff) {
        // Prevent self-role modification
        const payload = {
          ...form,
          role: disableRoleChange ? staff.role : form.role,
        };

        await api.put(`/auth/${staff._id}`, payload);
        toast.success("Staff updated", {
          position: "top-right",
          autoClose: 2500,
        });
      } else {
        await api.post("/auth/signup/staff", form);
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
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />

        {!staff && (
          <TextField
            fullWidth
            label="Password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        )}

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
          <MenuItem value="receptionist">Receptionist</MenuItem>
          <MenuItem value="billing">Billing</MenuItem>
          <MenuItem value="staff">General Staff</MenuItem>
        </TextField>

        <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
          <Button variant="contained" fullWidth onClick={handleSubmit}>
            {staff ? "Save Changes" : "Create Staff"}
          </Button>

          <Button variant="outlined" fullWidth onClick={() => onSuccess(false)}>
            Cancel
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}
