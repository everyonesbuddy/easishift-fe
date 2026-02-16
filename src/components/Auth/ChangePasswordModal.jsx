import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Box,
} from "@mui/material";
import api from "../../config/api";
import { toast } from "react-toastify";

export default function ChangePasswordModal({ open, onClose }) {
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate passwords match
    if (formData.newPassword !== formData.confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    // Validate password length
    if (formData.newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    // Validate not same as current
    if (formData.currentPassword === formData.newPassword) {
      setError("New password must be different from current password");
      return;
    }

    setLoading(true);
    try {
      await api.patch("/auth/change-password", {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });

      toast.success("Password changed successfully!", {
        position: "top-right",
        autoClose: 3000,
      });

      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      onClose();
    } catch (err) {
      console.error("Change password error:", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to change password",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setError("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Change password</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Current Password"
            name="currentPassword"
            type="password"
            value={formData.currentPassword}
            onChange={handleChange}
            required
            disabled={loading}
            fullWidth
            variant="outlined"
          />

          <TextField
            label="New Password"
            name="newPassword"
            type="password"
            value={formData.newPassword}
            onChange={handleChange}
            required
            disabled={loading}
            fullWidth
            variant="outlined"
          />

          <TextField
            label="Confirm New Password"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            disabled={loading}
            fullWidth
            variant="outlined"
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={
            loading ||
            !formData.currentPassword.trim() ||
            !formData.newPassword.trim() ||
            !formData.confirmPassword.trim()
          }
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? "Changing..." : "Change Password"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
