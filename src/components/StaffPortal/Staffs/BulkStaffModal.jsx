import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { toast } from "react-toastify";
import api from "../../../config/api";

const SAMPLE_CSV =
  "name,email,role,userPhone,userPhoneCountryCode\nA,a@x.com,nurse,5551112222,+1\nB,b@x.com,doctor,5553334444,+1";
const MAX_ROWS = 500;

const statusLabel = (status) => {
  const labels = {
    created: "Created",
    skipped_duplicate: "Skipped Duplicate",
    failed_validation: "Failed Validation",
    failed: "Failed",
  };
  return labels[status] || status || "-";
};

export default function BulkStaffModal({ open, onClose, onSuccess }) {
  const [csvInput, setCsvInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);
  const [warning, setWarning] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");

  const rowsToRender = useMemo(() => rows || [], [rows]);

  const resetState = () => {
    setSummary(null);
    setRows([]);
    setWarning("");
  };

  const handleClose = () => {
    setLoading(false);
    setCsvInput("");
    setSelectedFileName("");
    resetState();
    onClose();
  };

  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.setAttribute("download", "bulk-staff-template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleClearUploadedFile = () => {
    setSelectedFileName("");
    setCsvInput("");
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const trimmed = text.trim();

      if (!trimmed) {
        throw new Error("The selected CSV file is empty");
      }

      setCsvInput(text);
      setSelectedFileName(file.name);
      toast.success(`Loaded ${file.name}. Review and click Import Staff to continue.`, {
        position: "top-right",
        autoClose: 2500,
      });
    } catch (err) {
      setSelectedFileName("");
      toast.error(err?.message || "Failed to read CSV file", {
        position: "top-right",
        autoClose: 4000,
      });
    } finally {
      event.target.value = "";
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    resetState();

    try {
      const trimmed = (csvInput || "").trim();
      if (!trimmed) {
        throw new Error("Paste CSV content or upload a CSV file before importing");
      }

      const payload = { csv: trimmed };

      const res = await api.post("/auth/signup/staff/bulk", payload);
      const data = res?.data || {};

      const nextSummary = {
        total: data?.total ?? 0,
        created: data?.created ?? 0,
        skipped: data?.skipped ?? 0,
        failed: data?.failed ?? 0,
      };

      setSummary(nextSummary);
      setRows(Array.isArray(data?.rows) ? data.rows : []);
      setWarning(data?.warning || "");

      if (nextSummary.created > 0) {
        onSuccess?.();
      }

      toast.success(
        `Import complete: ${nextSummary.created} created, ${nextSummary.skipped} skipped, ${nextSummary.failed} failed.`,
        {
        position: "top-right",
        autoClose: 2500,
        },
      );
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "We couldn't complete the staff import";
      toast.error(msg, { position: "top-right", autoClose: 4000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="lg"
      scroll="paper"
    >
      <DialogTitle sx={{ pr: 6 }}>
        Import Staff in Bulk
        <IconButton
          aria-label="Close"
          onClick={handleClose}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 2 }}>
          Upload a .csv file or paste CSV content below. Required columns are
          name, email, and role. Optional columns are userPhone and
          userPhoneCountryCode. Maximum {MAX_ROWS} rows per import.
        </Alert>

        <Box
          display="flex"
          gap={1.5}
          flexWrap="wrap"
          alignItems="center"
          mb={2}
        >
          <Button
            variant="outlined"
            component="label"
            size="small"
            sx={{ textTransform: "none", borderRadius: 2, px: 2 }}
          >
            Upload CSV File
            <input
              hidden
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
            />
          </Button>

          <Button
            variant="text"
            size="small"
            onClick={handleDownloadSample}
            sx={{ textTransform: "none", borderRadius: 2, px: 1.5 }}
          >
            Download Template
          </Button>

          {selectedFileName ? (
            <Button
              variant="outlined"
              color="secondary"
              size="small"
              onClick={handleClearUploadedFile}
              sx={{ textTransform: "none", borderRadius: 2, px: 2 }}
            >
              Remove File
            </Button>
          ) : null}
        </Box>

        {selectedFileName ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Selected file: {selectedFileName}
          </Typography>
        ) : null}

        <TextField
          fullWidth
          multiline
          minRows={8}
          label="CSV Content"
          value={csvInput}
          onChange={(e) => setCsvInput(e.target.value)}
          placeholder={SAMPLE_CSV}
          helperText="You can edit the CSV content before importing."
        />

        {warning ? (
          <Alert severity="warning" sx={{ mt: 2 }}>
            {warning}
          </Alert>
        ) : null}

        {summary ? (
          <Paper variant="outlined" sx={{ mt: 2, p: 2 }}>
            <Typography sx={{ fontWeight: 600, mb: 1 }}>Summary</Typography>
            <Box display="flex" gap={3} flexWrap="wrap">
              <Typography variant="body2">Total: {summary.total}</Typography>
              <Typography variant="body2">
                Created: {summary.created}
              </Typography>
              <Typography variant="body2">
                Skipped: {summary.skipped}
              </Typography>
              <Typography variant="body2">Failed: {summary.failed}</Typography>
            </Box>
          </Paper>
        ) : null}

        {rowsToRender.length > 0 ? (
          <Paper variant="outlined" sx={{ mt: 2, overflow: "hidden" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>CSV Row</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Details</TableCell>
                  <TableCell>User ID</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rowsToRender.map((row, index) => (
                  <TableRow key={`${row?.email || "row"}-${index}`}>
                    <TableCell>{row?.rowNumber ?? index + 1}</TableCell>
                    <TableCell>{row?.email || "-"}</TableCell>
                    <TableCell>{statusLabel(row?.status)}</TableCell>
                    <TableCell>
                      {row?.reason || row?.warning || row?.message || "-"}
                    </TableCell>
                    <TableCell>{row?.userId || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        ) : null}
      </DialogContent>

      <DialogActions>
        <Button
          variant="text"
          onClick={handleClose}
          disabled={loading}
          sx={{ textTransform: "none", borderRadius: 2, px: 2 }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          sx={{ textTransform: "none", borderRadius: 2, px: 2.5 }}
        >
          {loading ? "Importing Staff..." : "Import Staff"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
