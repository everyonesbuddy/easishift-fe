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
  Typography,
} from "@mui/material";
import api from "../../config/api";

export default function ForgotPasswordModal({ open, onClose }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      await api.post("/auth/forgot-password", { email });
      setSuccess(true);
      setEmail("");
      // Close after 3 seconds
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 3000);
    } catch (err) {
      console.error("Forgot password error:", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to send reset email",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setError("");
    setSuccess(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Reset your password</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ mt: 2 }}>
          {success ? (
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="body2">
                If this email exists in our system, you'll receive a password
                reset link shortly. Check your inbox and spam folder.
              </Typography>
            </Alert>
          ) : (
            <>
              <Typography
                variant="body2"
                sx={{ color: "text.secondary", mb: 2 }}
              >
                Enter your email address and we'll send you a link to reset your
                password.
              </Typography>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                required
                disabled={loading}
                variant="outlined"
              />
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          {success ? "Close" : "Cancel"}
        </Button>
        {!success && (
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading || !email.trim()}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
