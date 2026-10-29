import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Container,
  FormControlLabel,
  FormHelperText,
  Link,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import api from "../../config/api";
import { useAuth } from "../../context/AuthContext";
import { trackEvent } from "../../utils/analytics";

const TERMS_VERSION = "1.0";

const isEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const browserTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
};

const fieldSx = {
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

/**
 * Free signup: your name, your facility, email, password. Everything else
 * (facility type, shifts, staff) happens in /setup right after.
 */
export default function SignupTenant() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    facilityName: "",
    email: "",
    password: "",
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  // Bot checks (the server rejects these): when the form opened, and a
  // field people never see that bots fill in.
  const [startedAt] = useState(() => Date.now());
  const [website, setWebsite] = useState("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const errors = {
    name: !form.name.trim() ? "Enter your name" : "",
    facilityName: !form.facilityName.trim() ? "Enter your facility's name" : "",
    email: !isEmail(form.email.trim()) ? "Enter a valid email" : "",
    password: form.password.length < 8 ? "Use at least 8 characters" : "",
    terms: !termsAccepted ? "Please accept the terms to continue" : "",
  };
  const isValid = Object.values(errors).every((value) => !value);

  const update = (key) => (event) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setTouched(true);
    setError("");
    if (!isValid) return;

    setSubmitting(true);
    try {
      const res = await api.post("/auth/signup", {
        name: form.name.trim(),
        facilityName: form.facilityName.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        timezone: browserTimezone(),
        termsAccepted: true,
        termsVersion: TERMS_VERSION,
        formStartedAt: startedAt,
        website,
      });
      const token = res.data?.token;
      if (token) {
        localStorage.setItem("token", token);
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      }
      login(res.data.user);
      trackEvent("sign_up", { method: "password" });
      navigate("/setup");
    } catch (err) {
      console.error("Signup error:", err);
      setError(
        err.response?.data?.message ||
          "Couldn't create your account. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const show = (key) => touched && errors[key];

  return (
    <Container maxWidth="sm">
      <Paper
        elevation={6}
        sx={{
          mt: 8,
          mb: 6,
          p: 4,
          backgroundColor: "rgba(0,0,0,0.05)",
          borderRadius: 3,
        }}
      >
        <Box
          component="form"
          onSubmit={handleSubmit}
          noValidate
          sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}
        >
          {/* Hidden from people (and screen readers); bots fill it in. */}
          <Box
            aria-hidden="true"
            sx={{ position: "absolute", left: "-10000px", top: "auto", width: 1, height: 1, overflow: "hidden" }}
          >
            <label htmlFor="signup-website">Website</label>
            <input
              id="signup-website"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </Box>
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="h4" sx={{ color: "black", fontWeight: 700 }}>
              Start free
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Free for 1 scheduler and up to 15 staff. No card needed.
            </Typography>
          </Box>

          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Your name"
            value={form.name}
            onChange={update("name")}
            autoComplete="name"
            error={Boolean(show("name"))}
            helperText={show("name") || " "}
            sx={fieldSx}
            required
          />
          <TextField
            label="Facility name"
            value={form.facilityName}
            onChange={update("facilityName")}
            autoComplete="organization"
            error={Boolean(show("facilityName"))}
            helperText={show("facilityName") || " "}
            sx={fieldSx}
            required
          />
          <TextField
            label="Work email"
            type="email"
            value={form.email}
            onChange={update("email")}
            autoComplete="email"
            error={Boolean(show("email"))}
            helperText={show("email") || " "}
            sx={fieldSx}
            required
          />
          <TextField
            label="Password"
            type="password"
            value={form.password}
            onChange={update("password")}
            autoComplete="new-password"
            error={Boolean(show("password"))}
            helperText={show("password") || "At least 8 characters"}
            sx={fieldSx}
            required
          />

          <Box>
            <FormControlLabel
              control={
                <Checkbox
                  checked={termsAccepted}
                  onChange={(event) => setTermsAccepted(event.target.checked)}
                  sx={{ color: "black", "&.Mui-checked": { color: "black" } }}
                />
              }
              label={
                <Typography variant="body2" sx={{ color: "black" }}>
                  I agree to the{" "}
                  <Link
                    component={RouterLink}
                    to="/terms-and-conditions"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Terms and Conditions
                  </Link>
                  ,{" "}
                  <Link
                    component={RouterLink}
                    to="/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Privacy Policy
                  </Link>
                  , and{" "}
                  <Link
                    component={RouterLink}
                    to="/eula"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    End User License Agreement
                  </Link>
                </Typography>
              }
            />
            {show("terms") && (
              <FormHelperText error sx={{ ml: 1.75 }}>
                {errors.terms}
              </FormHelperText>
            )}
          </Box>

          <Button
            type="submit"
            variant="contained"
            disabled={submitting}
            sx={{ py: 1.4, fontWeight: 600, borderRadius: 999 }}
          >
            {submitting ? "Creating your workspace…" : "Create free account"}
          </Button>

          <Typography variant="body2" align="center" sx={{ color: "black" }}>
            Already have an account?{" "}
            <Link component={RouterLink} to="/login">
              Log in
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}
