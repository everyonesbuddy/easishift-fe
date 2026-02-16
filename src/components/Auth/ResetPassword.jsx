import React, { useState } from "react";
import {
  Container,
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
} from "@mui/material";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../../config/api";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <Container maxWidth="sm">
        <Paper
          elevation={6}
          sx={{
            mt: 10,
            p: 4,
            backgroundColor: "rgba(255,255,255,0.05)",
            borderRadius: 3,
            textAlign: "center",
          }}
        >
          <Alert severity="error">
            Invalid or missing reset token. Please request a new password reset.
          </Alert>
          <Button
            variant="contained"
            sx={{ mt: 2 }}
            onClick={() => navigate("/login")}
          >
            Back to Login
          </Button>
        </Paper>
      </Container>
    );
  }

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
      setError("Passwords do not match");
      return;
    }

    // Validate password length
    if (formData.newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/reset-password", {
        token,
        newPassword: formData.newPassword,
      });

      setSuccess(true);
      setFormData({ newPassword: "", confirmPassword: "" });

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      console.error("Reset password error:", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to reset password",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Paper
        elevation={6}
        sx={{
          mt: 10,
          p: 4,
          backgroundColor: "rgba(255,255,255,0.05)",
          borderRadius: 3,
        }}
      >
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 3,
          }}
        >
          <Typography variant="h4" sx={{ color: "black" }} align="center">
            Reset your password
          </Typography>

          {success && (
            <Alert severity="success">
              Password reset successful! Redirecting to login...
            </Alert>
          )}

          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="New Password"
            name="newPassword"
            type="password"
            value={formData.newPassword}
            onChange={handleChange}
            required
            disabled={loading || success}
            variant="outlined"
            sx={{
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: "black" },
                "&:hover fieldset": { borderColor: "#000000" },
                "&.Mui-focused fieldset": { borderColor: "#000000" },
                color: "black",
              },
              "& .MuiInputLabel-root": {
                color: "black",
                "&.Mui-focused": { color: "#000000" },
              },
            }}
          />

          <TextField
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            disabled={loading || success}
            variant="outlined"
            sx={{
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: "black" },
                "&:hover fieldset": { borderColor: "#000000" },
                "&.Mui-focused fieldset": { borderColor: "#000000" },
                color: "black",
              },
              "& .MuiInputLabel-root": {
                color: "black",
                "&.Mui-focused": { color: "#000000" },
              },
            }}
          />

          <Button
            variant="contained"
            type="submit"
            disabled={loading || success}
            sx={{
              backgroundColor: "#42a5f5",
              "&:hover": {
                backgroundColor: "#1e88e5",
                boxShadow: "0 0 8px rgba(66,165,245,0.7)",
              },
              py: 1.2,
              fontWeight: 600,
            }}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? "Resetting..." : "Reset Password"}
          </Button>

          <Button
            onClick={() => navigate("/login")}
            sx={{ textTransform: "none", color: "black" }}
          >
            Back to Login
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
