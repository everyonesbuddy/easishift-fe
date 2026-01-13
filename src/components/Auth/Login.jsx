import { useState } from "react";
import {
  Container,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Paper,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../config/api";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/login/staff", form);

      login(res.data.user);
      navigate("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError(
        err.response?.data?.message || "Invalid credentials, please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const whiteTextField = {
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
            Login
          </Typography>

          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
            variant="outlined"
            sx={whiteTextField}
          />

          <TextField
            label="Password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            required
            variant="outlined"
            sx={whiteTextField}
          />

          <Button
            variant="contained"
            type="submit"
            disabled={loading}
            sx={{
              backgroundColor: "#42a5f5",
              "&:hover": {
                backgroundColor: "#1e88e5",
                boxShadow: "0 0 8px rgba(66,165,245,0.7)",
              },
              py: 1.2,
              fontWeight: 600,
            }}
          >
            {loading ? "Logging in..." : "Login"}
          </Button>

          <Typography
            variant="body2"
            align="center"
            sx={{ color: "black", mt: 2 }}
          >
            Don’t have an account? Contact your hospital admin.
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}
