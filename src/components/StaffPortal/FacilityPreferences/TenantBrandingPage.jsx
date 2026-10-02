import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Link,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { FiSave, FiTrash2, FiUpload } from "react-icons/fi";
import { Navigate } from "react-router-dom";
import api, { API_BASE } from "../../../config/api";
import { useAuth } from "../../../context/AuthContext";

const emptyValues = {
  displayName: "",
  primaryColor: "",
  secondaryColor: "",
  subdomain: "",
};

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

function BrandColorField({ label, value, defaultColor, onChange }) {
  const isValid = !value || HEX_COLOR_PATTERN.test(value);
  const pickerColor = HEX_COLOR_PATTERN.test(value) ? value : defaultColor;

  return (
    <Stack direction="row" spacing={1.25} alignItems="center">
      <TextField
        label={`${label} hex`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={defaultColor}
        error={!isValid}
        helperText={isValid ? " " : "Use a hex value like #2563eb"}
        inputProps={{ maxLength: 7, spellCheck: false }}
        sx={{ width: 190 }}
      />
      <Box
        component="label"
        title={`Choose ${label.toLowerCase()}`}
        sx={{
          width: 48,
          height: 48,
          mb: 2.5,
          flexShrink: 0,
          borderRadius: 1,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: pickerColor,
          cursor: "pointer",
          position: "relative",
          overflow: "hidden",
          "&:focus-within": {
            outline: "2px solid",
            outlineColor: "primary.main",
          },
        }}
      >
        <input
          aria-label={`Choose ${label.toLowerCase()}`}
          type="color"
          value={pickerColor}
          onChange={(event) => onChange(event.target.value)}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            opacity: 0,
            cursor: "pointer",
          }}
        />
      </Box>
    </Stack>
  );
}

const toAssetUrl = (url) =>
  url?.startsWith("/") ? `${API_BASE}${url}` : url || "";

export default function TenantBrandingPage() {
  const { can, updatePublicBranding } = useAuth();
  const canManageBranding = can("tenant.settings");
  const [values, setValues] = useState(emptyValues);
  const [branding, setBranding] = useState(null);
  const [originalSubdomain, setOriginalSubdomain] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [error, setError] = useState("");
  const [availability, setAvailability] = useState("");

  const applyBranding = useCallback(
    (nextBranding) => {
      if (!nextBranding) return;
      updatePublicBranding(nextBranding);
      const subdomain = nextBranding.subdomain || "";
      setBranding(nextBranding);
      setOriginalSubdomain(subdomain);
      setValues({
        displayName: nextBranding.displayName || "",
        primaryColor: nextBranding.primaryColor || "",
        secondaryColor: nextBranding.secondaryColor || "",
        subdomain,
      });
      setAvailability("");
    },
    [updatePublicBranding],
  );

  useEffect(() => {
    if (!canManageBranding) {
      setLoading(false);
      return;
    }

    api
      .get("/tenants/me/branding")
      .then((res) => applyBranding(res.data?.branding))
      .catch((err) =>
        setError(
          err.response?.data?.message || "Failed to load tenant branding",
        ),
      )
      .finally(() => setLoading(false));
  }, [applyBranding, canManageBranding]);

  const checkSubdomain = async () => {
    const subdomain = values.subdomain.trim().toLowerCase();
    if (!subdomain) {
      setAvailability("Enter a subdomain to check.");
      return false;
    }
    if (subdomain === originalSubdomain) {
      setAvailability("This is your current subdomain.");
      return true;
    }

    try {
      const res = await api.get("/public/subdomain-availability", {
        params: { subdomain },
      });
      const isAvailable = res.data?.available === true;
      setAvailability(
        isAvailable
          ? `${subdomain} is available.`
          : res.data?.reason || "That subdomain is unavailable.",
      );
      return isAvailable;
    } catch (err) {
      setAvailability(
        err.response?.data?.message ||
          "Could not check subdomain availability.",
      );
      return false;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const subdomain = values.subdomain.trim().toLowerCase();
      if (originalSubdomain && !subdomain) {
        setError("An assigned subdomain cannot be removed.");
        return;
      }
      if (subdomain && subdomain !== originalSubdomain) {
        const available = await checkSubdomain();
        if (!available) {
          setError("Choose an available subdomain before saving.");
          return;
        }
      }

      const payload = {
        displayName: values.displayName.trim() || null,
        primaryColor: values.primaryColor.trim() || null,
        secondaryColor: values.secondaryColor.trim() || null,
      };
      if (subdomain) payload.subdomain = subdomain;

      const res = await api.patch("/tenants/me/branding", payload);
      applyBranding(res.data?.branding);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save tenant branding");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Logo must be a PNG, JPEG, or WebP image.");
      return;
    }
    if (file.size > 512 * 1024) {
      setError("Logo must be 512 KB or smaller.");
      return;
    }

    setLogoBusy(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const res = await api.put("/tenants/me/logo", formData);
      applyBranding(res.data?.branding);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to upload logo");
    } finally {
      setLogoBusy(false);
    }
  };

  const handleLogoDelete = async () => {
    setLogoBusy(true);
    setError("");
    try {
      const res = await api.delete("/tenants/me/logo");
      applyBranding(res.data?.branding);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to remove logo");
    } finally {
      setLogoBusy(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!canManageBranding) return <Navigate to="/dashboard" replace />;

  if (error && !branding) {
    return (
      <Box sx={{ maxWidth: 900, mx: "auto", p: { xs: 2, md: 4 } }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  const logoUrl = toAssetUrl(branding?.logoUrl);
  const inputSx = { maxWidth: { xs: "100%", sm: 420 } };

  return (
    <Box sx={{ maxWidth: 980, mx: "auto", p: { xs: 2, md: 4 } }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
            Tenant Branding
          </Typography>
          <Typography color="text.secondary">
            Configure the name, colors, logo, and portal address shown to your
            team.
          </Typography>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}

        <Box sx={{ borderBottom: 1, borderColor: "divider", pb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
            Logo
          </Typography>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "flex-start", sm: "center" }}
          >
            <Avatar
              variant="rounded"
              src={logoUrl || undefined}
              alt={branding?.displayName || branding?.name || "Tenant logo"}
              sx={{
                width: 144,
                height: 88,
                bgcolor: "grey.100",
                color: "text.secondary",
              }}
            >
              {(branding?.displayName || branding?.name || "T").slice(0, 1)}
            </Avatar>
            <Stack direction="row" spacing={1}>
              <Button
                component="label"
                variant="outlined"
                startIcon={<FiUpload />}
                disabled={logoBusy}
              >
                {logoBusy ? "Working..." : "Upload logo"}
                <input
                  hidden
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleLogoUpload}
                />
              </Button>
              {logoUrl && (
                <Button
                  color="error"
                  variant="outlined"
                  startIcon={<FiTrash2 />}
                  onClick={handleLogoDelete}
                  disabled={logoBusy}
                >
                  Remove
                </Button>
              )}
            </Stack>
          </Stack>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 1 }}
          >
            PNG, JPEG, or WebP; maximum 512 KB.
          </Typography>
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: "divider", pb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
            Brand identity
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Display name"
              value={values.displayName}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  displayName: event.target.value,
                }))
              }
              inputProps={{ maxLength: 80 }}
              helperText={`Shown on the branded login page; defaults to ${branding?.name || "your facility name"}.`}
              sx={inputSx}
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <BrandColorField
                label="Primary color"
                value={values.primaryColor}
                defaultColor="#2563eb"
                onChange={(primaryColor) =>
                  setValues((prev) => ({ ...prev, primaryColor }))
                }
              />
              <BrandColorField
                label="Secondary color"
                value={values.secondaryColor}
                defaultColor="#1e40af"
                onChange={(secondaryColor) =>
                  setValues((prev) => ({ ...prev, secondaryColor }))
                }
              />
            </Stack>
            <TextField
              label="Portal subdomain"
              value={values.subdomain}
              onChange={(event) => {
                setValues((prev) => ({
                  ...prev,
                  subdomain: event.target.value,
                }));
                setAvailability("");
              }}
              inputProps={{ maxLength: 40 }}
              helperText={
                branding?.appUrl
                  ? `Portal URL: ${branding.appUrl}`
                  : "Your portal URL is configured by the deployment domain settings."
              }
              sx={inputSx}
            />
            {branding?.appUrl && (
              <Link
                href={branding.appUrl}
                target="_blank"
                rel="noreferrer"
                sx={{ width: "fit-content" }}
              >
                Open tenant portal
              </Link>
            )}
            <Box>
              <Button
                variant="outlined"
                onClick={checkSubdomain}
                disabled={!values.subdomain.trim()}
              >
                Check availability
              </Button>
              {availability && (
                <Typography
                  role="status"
                  variant="body2"
                  color={
                    availability.endsWith(" is available.") ||
                    availability === "This is your current subdomain."
                      ? "success.main"
                      : "text.secondary"
                  }
                  sx={{ mt: 1 }}
                >
                  {availability}
                </Typography>
              )}
            </Box>
          </Stack>
        </Box>

        <Box
          sx={{
            display: "flex",
            justifyContent: { xs: "stretch", sm: "flex-end" },
          }}
        >
          <Button
            variant="contained"
            startIcon={<FiSave />}
            onClick={handleSave}
            disabled={saving}
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            {saving ? "Saving..." : "Save branding"}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}
