import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { FiDownload } from "react-icons/fi";
import { Navigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../../config/api";
import { useAuth } from "../../../context/AuthContext";

const PROVIDERS = [
  { value: "gusto", label: "Gusto" },
  { value: "quickbooks", label: "QuickBooks" },
  { value: "rippling", label: "Rippling" },
];

const toDateInputValue = (date) => {
  const offsetDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000,
  );
  return offsetDate.toISOString().slice(0, 10);
};

const getDefaultFromDate = () => {
  const date = new Date();
  date.setDate(1);
  return toDateInputValue(date);
};

const toRangeBoundary = (value, endOfDay = false) => {
  const date = new Date(`${value}T00:00:00`);
  if (endOfDay) date.setHours(23, 59, 59, 999);
  return date.toISOString();
};

const getRangeError = (from, to) => {
  if (!from || !to) return "Choose both a start and end date.";

  const fromDate = new Date(`${from}T00:00:00`);
  const toDate = new Date(`${to}T00:00:00`);
  if (fromDate > toDate) return "Start date must be before end date.";

  const rangeDays = (toDate.getTime() - fromDate.getTime()) / 86400000;
  if (rangeDays > 92) return "Export range cannot exceed 92 days.";
  return "";
};

const getDownloadFilename = (contentDisposition, fallback) => {
  const encodedMatch = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i);
  if (encodedMatch?.[1]) return decodeURIComponent(encodedMatch[1]);

  const filenameMatch = contentDisposition?.match(/filename="?([^";]+)"?/i);
  return filenameMatch?.[1] || fallback;
};

const getBlobErrorMessage = async (error) => {
  const responseData = error?.response?.data;
  if (responseData instanceof Blob) {
    try {
      const payload = JSON.parse(await responseData.text());
      if (payload?.message) return payload.message;
    } catch {
      return "Export could not be generated.";
    }
  }
  return responseData?.message || "Export could not be generated.";
};

export default function PayrollExportsPage() {
  const { can, facilityPreferences } = useAuth();
  const [provider, setProvider] = useState("gusto");
  const [source, setSource] = useState("actual");
  const [from, setFrom] = useState(getDefaultFromDate);
  const [to, setTo] = useState(() => toDateInputValue(new Date()));
  const [downloading, setDownloading] = useState(false);

  const trackingEnabled = Boolean(facilityPreferences?.timeTracking?.enabled);
  const rangeError = useMemo(() => getRangeError(from, to), [from, to]);
  const actualUnavailable = source === "actual" && !trackingEnabled;

  if (!can("staff.view")) return <Navigate to="/dashboard" replace />;

  const handleExport = async () => {
    if (rangeError || actualUnavailable) return;

    setDownloading(true);
    try {
      const response = await api.get(`/exports/payroll/${provider}`, {
        params: {
          source,
          from: toRangeBoundary(from),
          to: toRangeBoundary(to, true),
        },
        responseType: "blob",
      });

      const fallback = `wisershifts-${provider}-${source}-${from}-to-${to}.csv`;
      const filename = getDownloadFilename(
        response.headers["content-disposition"],
        fallback,
      );
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success(`${filename} downloaded.`);
    } catch (error) {
      toast.error(await getBlobErrorMessage(error));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Box sx={{ minHeight: "calc(100vh - 72px)", bgcolor: "grey.50", py: 4 }}>
      <Container maxWidth="md">
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Payroll Exports
          </Typography>
          <Typography sx={{ color: "text.secondary", mt: 0.75 }}>
            Download payroll-ready CSV files for your preferred provider.
          </Typography>
        </Box>

        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
          <Stack spacing={3}>
            <FormControl fullWidth>
              <InputLabel id="payroll-provider-label">Provider</InputLabel>
              <Select
                labelId="payroll-provider-label"
                label="Provider"
                value={provider}
                onChange={(event) => setProvider(event.target.value)}
              >
                {PROVIDERS.map((item) => (
                  <MenuItem key={item.value} value={item.value}>
                    {item.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box>
              <Typography sx={{ fontWeight: 700, mb: 1 }}>
                Hours source
              </Typography>
              <ToggleButtonGroup
                exclusive
                fullWidth
                value={source}
                onChange={(_, value) => value && setSource(value)}
                aria-label="Hours source"
              >
                <ToggleButton value="actual">Actual hours</ToggleButton>
                <ToggleButton value="scheduled">Scheduled hours</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {actualUnavailable && (
              <Alert severity="info">
                Actual-hours exports require time tracking. Choose scheduled
                hours or enable time tracking in Facility Preferences.
              </Alert>
            )}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                fullWidth
                type="date"
                label="From"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                fullWidth
                type="date"
                label="To"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>

            {rangeError && <Alert severity="error">{rangeError}</Alert>}

            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="contained"
                startIcon={
                  downloading ? (
                    <CircularProgress color="inherit" size={17} />
                  ) : (
                    <FiDownload />
                  )
                }
                disabled={
                  downloading || Boolean(rangeError) || actualUnavailable
                }
                onClick={handleExport}
                sx={{ textTransform: "none", fontWeight: 700 }}
              >
                {downloading ? "Preparing CSV..." : "Download CSV"}
              </Button>
            </Box>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
