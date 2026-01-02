import { useState, useEffect } from "react";
import {
  TextField,
  Button,
  Typography,
  MenuItem,
  Box,
  Paper,
  Stack,
} from "@mui/material";
import axios from "axios";
import { useAuth } from "../../../context/AuthContext";

export default function StaffCreateAndEditForm({ staff, onSuccess }) {
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

        await axios.put(
          `http://localhost:5000/api/v1/auth/${staff._id}`,
          payload,
          { withCredentials: true }
        );
      } else {
        await axios.post(
          "http://localhost:5000/api/v1/auth/signup/staff",
          form,
          { withCredentials: true }
        );
      }

      onSuccess();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Paper
      component="form"
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      sx={{ p: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.02)" }}
      elevation={0}
    >
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
