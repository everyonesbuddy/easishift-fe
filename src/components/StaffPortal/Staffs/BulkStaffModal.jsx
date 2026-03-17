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
  const [csvInput, setCsvInput] = useState(SAMPLE_CSV);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);
  const [warning, setWarning] = useState("");

  const rowsToRender = useMemo(() => rows || [], [rows]);

  const resetState = () => {
    setSummary(null);
    setRows([]);
    setWarning("");
  };

  const handleClose = () => {
    setLoading(false);
    resetState();
    onClose();
  };

  const handleSubmit = async () => {
    setLoading(true);
    resetState();

    try {
      const trimmed = (csvInput || "").trim();
      if (!trimmed) {
        throw new Error("Please provide CSV content");
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

      toast.success("Bulk staff request processed", {
        position: "top-right",
        autoClose: 2500,
      });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Bulk staff request failed";
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
        Bulk Add Staff
        <IconButton
          aria-label="Close"
          onClick={handleClose}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <TextField
          fullWidth
          multiline
          minRows={8}
          label="CSV"
          value={csvInput}
          onChange={(e) => setCsvInput(e.target.value)}
          placeholder={SAMPLE_CSV}
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
                  <TableCell>#</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Message</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rowsToRender.map((row, index) => (
                  <TableRow key={`${row?.email || "row"}-${index}`}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{row?.name || "-"}</TableCell>
                    <TableCell>{row?.email || "-"}</TableCell>
                    <TableCell>{row?.role || "-"}</TableCell>
                    <TableCell>{statusLabel(row?.status)}</TableCell>
                    <TableCell>{row?.message || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        ) : null}
      </DialogContent>

      <DialogActions>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? "Submitting..." : "Submit Bulk Request"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
