import { useEffect, useState } from "react";
import { Alert, Box, Button, CssBaseline, Dialog, DialogActions, DialogContent, DialogTitle, Menu, MenuItem, TextField, Typography } from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import { FiChevronDown } from "react-icons/fi";
import { IOS } from "../../theme/ios";
import hqApi, { getHqToken, setHqToken } from "./hqApi";
import HqPage from "./HqPage";

const theme = createTheme({
  palette: { primary: { main: "#2563eb" }, background: { default: IOS.canvas } },
  typography: { fontFamily: IOS.font },
  shape: { borderRadius: 10 },
});

function Wordmark() {
  return (
    <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
      <Typography sx={{ fontWeight: 800, fontSize: 19, letterSpacing: "-0.02em", color: "#fff" }}>
        Wiser<Box component="span" sx={{ color: "#60A5FA" }}>Shifts</Box>
      </Typography>
      <Typography sx={{ fontWeight: 800, fontSize: 12, letterSpacing: "0.14em", color: "#94A3B8" }}>HQ</Typography>
    </Box>
  );
}

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const next = new URLSearchParams(location.search).get("next") || "/hq";

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await hqApi.post("/hq/auth/login", { email, password });
      setHqToken(res.data.token);
      navigate(next.startsWith("/hq") && !next.startsWith("/hq/login") ? next : "/hq", { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || "Couldn't sign in");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#0F172A", display: "grid", placeItems: "center", px: 2 }}>
      <Box component="form" onSubmit={submit} sx={{ width: "100%", maxWidth: 380 }}>
        <Box sx={{ mb: 3, display: "flex", justifyContent: "center" }}>
          <Wordmark />
        </Box>
        <Box sx={{ bgcolor: "#fff", borderRadius: "18px", p: 3, display: "grid", gap: 2 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 18 }}>Sign in to HQ</Typography>
          <Typography sx={{ color: IOS.secondary, fontSize: 13.5, mt: -1.5 }}>For the WiserShifts team. Workspace logins don't work here.</Typography>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField size="small" label="Email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          <TextField size="small" label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button type="submit" variant="contained" disableElevation disabled={busy || !email || !password} sx={{ borderRadius: "10px", fontWeight: 700, py: 1, textTransform: "none" }}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

function PasswordDialog({ open, onClose }) {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const save = async () => {
    try {
      await hqApi.post("/hq/auth/change-password", { currentPassword: cur, newPassword: next });
      toast.success("Password changed");
      setCur("");
      setNext("");
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't change it");
    }
  };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Change HQ password</DialogTitle>
      <DialogContent sx={{ display: "grid", gap: 2, pt: "8px !important" }}>
        <TextField size="small" type="password" label="Current password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} />
        <TextField size="small" type="password" label="New password (12+ characters)" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disableElevation disabled={!cur || next.length < 12} onClick={save}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}

/** Signed-in HQ: our own top bar (no workspace sidebar), then the tabs. */
function Shell() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [anchor, setAnchor] = useState(null);
  const [pw, setPw] = useState(false);

  useEffect(() => {
    hqApi.get("/hq/auth/me").then((res) => setMe(res.data.user)).catch(() => {});
  }, []);

  const signOut = () => {
    setHqToken("");
    navigate("/hq/login", { replace: true });
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: IOS.canvas }}>
      <Box sx={{ bgcolor: "#0F172A", px: { xs: 2, md: 3 }, height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
        <Wordmark />
        <Button onClick={(e) => setAnchor(e.currentTarget)} endIcon={<FiChevronDown />} sx={{ color: "#E2E8F0", textTransform: "none", fontWeight: 600 }}>
          {me?.name || me?.email || ""}
        </Button>
        <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
          <MenuItem
            onClick={() => {
              setAnchor(null);
              setPw(true);
            }}
          >
            Change password
          </MenuItem>
          <MenuItem onClick={signOut}>Sign out</MenuItem>
        </Menu>
      </Box>
      <Routes>
        <Route path="/hq/:tab?" element={<HqPage />} />
        <Route path="*" element={<Navigate to="/hq" replace />} />
      </Routes>
      <PasswordDialog open={pw} onClose={() => setPw(false)} />
    </Box>
  );
}

function Gate() {
  const location = useLocation();
  if (location.pathname.startsWith("/hq/login")) return <Login />;
  if (!getHqToken()) return <Navigate to={`/hq/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  return <Shell />;
}

/**
 * wisershifts.com/hq: WiserShifts' own command center. A separate app from
 * the workspace product: its own sign-in (HQ accounts only), its own layout,
 * no tenant, and it never shares a session with a workspace login.
 */
export default function HqApp() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Gate />
      </BrowserRouter>
      <ToastContainer />
    </ThemeProvider>
  );
}
