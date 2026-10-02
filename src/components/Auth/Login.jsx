import { useEffect, useState } from "react";
import {
  Container,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Paper,
  InputAdornment,
  CircularProgress,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api, { API_BASE } from "../../config/api";
import ForgotPasswordModal from "./ForgotPasswordModal";
import {
  getWorkspaceDomainLabel,
  getTenantLoginUrl,
  isRootWorkspaceHost,
  isTenantWorkspaceHost,
} from "../../utils/tenantWorkspace";

const LAST_WORKSPACE_KEY = "lastWorkspace";

const readLastWorkspace = () => {
  try {
    return JSON.parse(localStorage.getItem(LAST_WORKSPACE_KEY) || "null");
  } catch {
    return null;
  }
};

export default function Login() {
  const { login, publicBranding, publicBrandingLoading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [workspace, setWorkspace] = useState(
    () => readLastWorkspace()?.subdomain || "",
  );
  const [lastWorkspace, setLastWorkspace] = useState(readLastWorkspace);
  const isWorkspaceFinder = isRootWorkspaceHost();
  const normalizedWorkspace = workspace.trim().toLowerCase();
  const isRememberedWorkspace =
    normalizedWorkspace &&
    normalizedWorkspace === lastWorkspace?.subdomain?.toLowerCase();

  useEffect(() => {
    if (publicBranding?.logoUrl?.startsWith("/")) {
      setBrandLogoUrl(`${API_BASE}${publicBranding.logoUrl}`);
      return;
    }
    setBrandLogoUrl(publicBranding?.logoUrl || "");
  }, [publicBranding]);
  const [brandLogoUrl, setBrandLogoUrl] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const continueToWorkspace = async (requestedSubdomain) => {
    const subdomain = String(requestedSubdomain || "")
      .trim()
      .toLowerCase();
    setError("");

    if (
      !/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(subdomain) ||
      subdomain.includes("--")
    ) {
      setError(
        "Enter a valid workspace name using letters, numbers, or single hyphens.",
      );
      return;
    }

    setLoading(true);
    try {
      const response = await api.get("/public/tenant-branding", {
        params: { subdomain },
      });
      const branding = response.data?.branding;
      if (!branding) throw new Error("Workspace not found");

      const rememberedWorkspace = {
        subdomain,
        displayName: branding.displayName || branding.name || subdomain,
      };
      try {
        localStorage.setItem(
          LAST_WORKSPACE_KEY,
          JSON.stringify(rememberedWorkspace),
        );
      } catch (storageError) {
        console.warn("Unable to remember the last workspace", storageError);
      }
      setLastWorkspace(rememberedWorkspace);
      window.location.assign(getTenantLoginUrl(subdomain));
    } catch (err) {
      setError(
        err.response?.status === 404
          ? "We couldn't find that workspace. Check the name and try again."
          : err.response?.data?.message ||
              "Unable to find that workspace right now.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isWorkspaceFinder) {
      await continueToWorkspace(workspace);
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/login/staff", form);

      // if server returns a token, persist it and attach to api defaults
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
      navigate("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError(
        err.response?.data?.message || "Invalid credentials, please try again.",
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

  if (isTenantWorkspaceHost() && publicBrandingLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 12 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isTenantWorkspaceHost() && !publicBranding) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Alert severity="error">
          This workspace could not be loaded. Check the address or return to the
          workspace finder.
        </Alert>
      </Container>
    );
  }

  if (isWorkspaceFinder) {
    return (
      <Container maxWidth="sm" sx={{ py: { xs: 7, md: 12 } }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 5 },
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
          }}
        >
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}
          >
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 750, mb: 1 }}>
                Find your workspace
              </Typography>
              <Typography color="text.secondary">
                Enter your organization&apos;s workspace name to continue.
              </Typography>
            </Box>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              autoFocus
              label="Workspace name"
              value={workspace}
              onChange={(event) =>
                setWorkspace(
                  event.target.value.toLowerCase().replace(/\s/g, ""),
                )
              }
              placeholder="test-hospital"
              autoComplete="organization"
              inputProps={{
                maxLength: 40,
                "aria-label": "Workspace subdomain",
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    .{getWorkspaceDomainLabel()}
                  </InputAdornment>
                ),
              }}
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading || !workspace.trim()}
            >
              {loading
                ? "Finding workspace..."
                : isRememberedWorkspace
                  ? `Continue to ${lastWorkspace.displayName || lastWorkspace.subdomain}`
                  : "Continue"}
            </Button>
          </Box>
        </Paper>
      </Container>
    );
  }

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
          {brandLogoUrl && (
            <Box
              component="img"
              src={brandLogoUrl}
              alt={publicBranding?.displayName || "Facility logo"}
              sx={{
                maxWidth: 220,
                maxHeight: 72,
                objectFit: "contain",
                mx: "auto",
              }}
            />
          )}

          <Typography variant="h4" sx={{ color: "black" }} align="center">
            {publicBranding?.displayName || "Login"}
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
              backgroundColor: publicBranding?.primaryColor || "#42a5f5",
              "&:hover": {
                backgroundColor: publicBranding?.secondaryColor || "#1e88e5",
                boxShadow: "none",
              },
              borderRadius: 999,
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
            Don’t have an account? Contact your facility admin.
          </Typography>

          <Box
            sx={{
              display: "flex",
              gap: 1,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Button
              type="button"
              sx={{
                textTransform: "none",
                color: publicBranding?.primaryColor || "#42a5f5",
                fontWeight: 600,
              }}
              onClick={() => setForgotPasswordOpen(true)}
            >
              Forgot password?
            </Button>
          </Box>
        </Box>
      </Paper>

      <ForgotPasswordModal
        open={forgotPasswordOpen}
        onClose={() => setForgotPasswordOpen(false)}
      />
    </Container>
  );
}
