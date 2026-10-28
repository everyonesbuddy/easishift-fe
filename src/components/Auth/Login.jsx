import { useState } from "react";
import { Alert, Box, Button, TextField, Typography } from "@mui/material";
import { FiCalendar, FiGrid } from "react-icons/fi";
import { Link as RouterLink, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../config/api";
import ForgotPasswordModal from "./ForgotPasswordModal";
import { trackEvent } from "../../utils/analytics";
import { IOS, tint } from "../../theme/ios";

/**
 * Two ways in, same as the mobile app:
 * - Schedulers and owners sign in with email + password.
 * - Staff have no password: they open their personal link, or ask for it
 *   to be sent to the phone/email on their schedule.
 * /login?as=staff (or /my-schedule) opens on the staff side.
 */
export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const who = params.get("as") === "staff" ? "staff" : "scheduler";
  const setWho = (next) => setParams(next === "staff" ? { as: "staff" } : {}, { replace: true });

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  const [contact, setContact] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState("");
  const [linkError, setLinkError] = useState("");
  const [pasted, setPasted] = useState("");
  const [pasteError, setPasteError] = useState("");

  // A full link (https://wisershifts.com/s/…) or just the code at the end.
  const openPasted = (e) => {
    e.preventDefault();
    const text = pasted.trim();
    const match = text.match(/\/s\/([A-Za-z0-9._~-]{16,})/);
    const token = match ? match[1] : /^[A-Za-z0-9._~-]{16,}$/.test(text) ? text : null;
    if (!token) {
      setPasteError("That doesn't look like a WiserShifts link. It looks like wisershifts.com/s/…");
      return;
    }
    // Full load, same as tapping the link (the staff page has no site menu).
    window.location.assign(`/s/${token}`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/login", form);
      const token = res.data?.token;
      if (token) {
        try {
          localStorage.setItem("token", token);
          api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        } catch (storageError) {
          console.warn("Unable to persist the login token", storageError);
        }
      }
      login(res.data.user);
      trackEvent("login", { method: "password" });
      navigate("/home");
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't sign in. Check your email and password.");
    } finally {
      setLoading(false);
    }
  };

  const requestLink = async (e) => {
    e.preventDefault();
    setLinkError("");
    setSending(true);
    try {
      const res = await api.post("/staff-link/request", { contact: contact.trim() });
      setSent(res.data?.message || "If that phone or email is on a schedule, we've sent the link to it.");
      trackEvent("staff_link_request");
    } catch (err) {
      setLinkError(
        err?.response?.status === 429
          ? "Too many tries. Wait a few minutes, then try again."
          : err?.response?.data?.message || "Couldn't send it. Try again.",
      );
    } finally {
      setSending(false);
    }
  };

  const field = {
    "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: IOS.surface },
  };
  const primary = {
    bgcolor: IOS.blue,
    borderRadius: IOS.radius.round,
    py: 1.25,
    fontWeight: 600,
    fontSize: 16,
    textTransform: "none",
    boxShadow: "none",
    "&:hover": { bgcolor: "#0066DB", boxShadow: "none" },
  };

  return (
    <Box sx={{ minHeight: "calc(100vh - 64px)", bgcolor: IOS.canvas, fontFamily: IOS.font, px: 2, py: { xs: 4, sm: 8 } }}>
      <Box sx={{ maxWidth: 440, mx: "auto" }}>
        <Typography sx={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.025em", color: IOS.ink, fontFamily: IOS.font }}>
          {who === "staff" ? "Open your schedule" : "Sign in"}
        </Typography>
        <Typography sx={{ color: IOS.secondary, fontSize: 15, mt: 0.5, mb: 3, fontFamily: IOS.font }}>
          {who === "staff"
            ? "Your scheduler sends you a personal link. No password needed."
            : "For schedulers and owners."}
        </Typography>

        {/* Who are you */}
        <Box role="tablist" aria-label="Who is signing in" sx={{ display: "flex", p: "3px", mb: 3, borderRadius: "10px", bgcolor: IOS.fill }}>
          {[
            { value: "scheduler", label: "I make the schedule", icon: FiGrid },
            { value: "staff", label: "I'm on the schedule", icon: FiCalendar },
          ].map((opt) => {
            const active = who === opt.value;
            const Icon = opt.icon;
            return (
              <Box
                key={opt.value}
                component="button"
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setWho(opt.value)}
                sx={{
                  all: "unset",
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 0.75,
                  cursor: "pointer",
                  py: 1,
                  borderRadius: "8px",
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: IOS.font,
                  color: IOS.ink,
                  bgcolor: active ? "#fff" : "transparent",
                  boxShadow: active ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
                  "&:focus-visible": { boxShadow: `0 0 0 3px ${tint(IOS.blue, 0.35)}` },
                }}
              >
                <Icon size={15} />
                {opt.label}
              </Box>
            );
          })}
        </Box>

        <Box sx={{ bgcolor: IOS.surface, borderRadius: IOS.radius.card, boxShadow: IOS.shadow, border: `1px solid ${IOS.hairline}`, p: { xs: 2.5, sm: 3 } }}>
          {who === "scheduler" ? (
            <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {error && <Alert severity="error" sx={{ borderRadius: "12px" }}>{error}</Alert>}
              <TextField
                label="Email"
                name="email"
                type="email"
                autoComplete="username"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                sx={field}
              />
              <TextField
                label="Password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                sx={field}
              />
              <Button variant="contained" type="submit" disabled={loading} sx={primary}>
                {loading ? "Signing in…" : "Sign in"}
              </Button>
              <Button type="button" onClick={() => setForgotPasswordOpen(true)} sx={{ textTransform: "none", color: IOS.blue, fontWeight: 600 }}>
                Forgot password?
              </Button>
            </Box>
          ) : sent ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Alert severity="success" sx={{ borderRadius: "12px" }}>{sent}</Alert>
              <Typography sx={{ color: IOS.secondary, fontSize: 15 }}>
                Open the text or email and tap the link. On a phone with the WiserShifts app, it opens in the app.
              </Typography>
              <Button onClick={() => setSent("")} sx={{ textTransform: "none", color: IOS.blue, fontWeight: 600 }}>
                Use a different phone or email
              </Button>
            </Box>
          ) : (
            <Box component="form" onSubmit={requestLink} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 17, color: IOS.ink }}>Send me my link</Typography>
              {linkError && <Alert severity="error" sx={{ borderRadius: "12px" }}>{linkError}</Alert>}
              <TextField
                label="Phone or email on your schedule"
                placeholder="(555) 123-4567 or you@email.com"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                autoComplete="email"
                required
                sx={field}
              />
              <Button variant="contained" type="submit" disabled={sending || !contact.trim()} sx={primary}>
                {sending ? "Sending…" : "Send my link"}
              </Button>
              <Typography sx={{ color: IOS.secondary, fontSize: 13, textAlign: "center" }}>
                Not getting it? Ask your scheduler to check your phone number or email.
              </Typography>
            </Box>
          )}
        </Box>

        {who === "staff" && (
          <Box
            component="form"
            onSubmit={openPasted}
            sx={{ mt: 2, bgcolor: IOS.surface, borderRadius: IOS.radius.card, boxShadow: IOS.shadow, border: `1px solid ${IOS.hairline}`, p: { xs: 2.5, sm: 3 }, display: "flex", flexDirection: "column", gap: 2 }}
          >
            <Typography sx={{ fontWeight: 700, fontSize: 17, color: IOS.ink }}>Already have your link?</Typography>
            {pasteError && <Alert severity="error" sx={{ borderRadius: "12px" }}>{pasteError}</Alert>}
            <TextField
              label="Paste it here"
              placeholder="https://wisershifts.com/s/…"
              value={pasted}
              onChange={(e) => {
                setPasted(e.target.value);
                setPasteError("");
              }}
              autoComplete="off"
              sx={field}
            />
            <Button
              variant="text"
              type="submit"
              disabled={!pasted.trim()}
              sx={{ ...primary, bgcolor: IOS.fill, color: IOS.ink, "&:hover": { bgcolor: "rgba(118,118,128,0.2)", boxShadow: "none" } }}
            >
              Open my schedule
            </Button>
          </Box>
        )}

        {who === "scheduler" && (
          <Typography sx={{ color: IOS.secondary, fontSize: 14, textAlign: "center", mt: 3 }}>
            New facility?{" "}
            <Box component={RouterLink} to="/signup-tenant" sx={{ color: IOS.blue, fontWeight: 600, textDecoration: "none" }}>
              Start free
            </Box>
          </Typography>
        )}
      </Box>

      <ForgotPasswordModal open={forgotPasswordOpen} onClose={() => setForgotPasswordOpen(false)} />
    </Box>
  );
}
