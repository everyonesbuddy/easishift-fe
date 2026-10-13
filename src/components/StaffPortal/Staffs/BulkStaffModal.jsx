import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { toast } from "react-toastify";
import ExcelJS from "exceljs";
import api from "../../../config/api";
import { useAuth } from "../../../context/AuthContext";
import { parseStaffLines } from "../../../utils/staffPaste";

const SAMPLE_CSV =
  "name,phone,email,role\nKim Tran,555 123 4567,,cna\nJo Diaz,,jo@example.com,med_tech";
const PASTE_PLACEHOLDER =
  "Kim Tran, 555 123 4567, CNA\nJo Diaz, jo@example.com, Med Tech\nSam Lee, (555) 987-6543";
const MAX_ROWS = 500;

const escapeCsvCell = (value) => {
  const text = String(value ?? "");
  if (/[,"\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const toCsvText = (rows) =>
  rows
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(","))
    .join("\n");

const worksheetToCsvText = (worksheet) => {
  const rows = [];
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    const cells = [];
    const values = Array.isArray(row.values) ? row.values.slice(1) : [];
    values.forEach((value) => {
      if (value && typeof value === "object") {
        if ("text" in value && value.text != null) {
          cells.push(String(value.text));
          return;
        }
        if ("result" in value && value.result != null) {
          cells.push(String(value.result));
          return;
        }
      }
      cells.push(value == null ? "" : String(value));
    });
    rows.push(cells);
  });
  return toCsvText(rows);
};

const statusLabel = (status) => {
  const labels = {
    created: "Created",
    skipped_duplicate: "Already added",
    failed_validation: "Needs fixing",
    failed: "Failed",
  };
  return labels[status] || status || "-";
};

export default function BulkStaffModal({ open, onClose, onSuccess }) {
  const { facilityPreferences, hasFeature } = useAuth();
  const canImportFile = hasFeature("import");
  const defaultRole = facilityPreferences?.roleFamilies?.[0];

  const [mode, setMode] = useState("paste");
  const [pasteInput, setPasteInput] = useState("");
  const [csvInput, setCsvInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);
  const [selectedFileName, setSelectedFileName] = useState("");

  const rowsToRender = useMemo(() => rows || [], [rows]);
  const pastedRows = useMemo(
    () => parseStaffLines(pasteInput, defaultRole),
    [pasteInput, defaultRole],
  );

  const resetState = () => {
    setSummary(null);
    setRows([]);
  };

  const handleClose = () => {
    setLoading(false);
    setPasteInput("");
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
    link.setAttribute("download", "staff-template.csv");
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
    if (!file) return;

    try {
      const fileName = file.name || "";
      const isExcelFile = /\.(xlsx|xls)$/i.test(fileName);
      const isCsvFile =
        /\.csv$/i.test(fileName) || /csv/i.test(file.type || "");
      let text = "";

      if (isExcelFile) {
        const workbook = new ExcelJS.Workbook();
        const buffer = await file.arrayBuffer();
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
          throw new Error("The selected Excel file does not contain any sheet");
        }
        text = worksheetToCsvText(worksheet);
      } else if (isCsvFile) {
        text = await file.text();
      } else {
        throw new Error("Upload a CSV or Excel file (.csv, .xlsx, .xls)");
      }

      const trimmed = text.trim();
      if (!trimmed) throw new Error("The selected file is empty");

      setCsvInput(trimmed);
      setSelectedFileName(file.name);
    } catch (err) {
      setSelectedFileName("");
      toast.error(err?.message || "Failed to read file", {
        position: "top-right",
        autoClose: 4000,
      });
    } finally {
      event.target.value = "";
    }
  };

  const sendRequest = () => {
    if (mode === "paste") {
      if (!pastedRows.length) {
        throw new Error("Paste at least one person, one per line");
      }
      if (pastedRows.length > MAX_ROWS) {
        throw new Error(`Add up to ${MAX_ROWS} people at a time`);
      }
      return api.post("/staff/bulk", { rows: pastedRows });
    }

    const trimmed = (csvInput || "").trim();
    if (!trimmed) {
      throw new Error("Upload a spreadsheet or paste CSV content first");
    }
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([trimmed], { type: "text/csv" }),
      selectedFileName.replace(/\.(xlsx|xls)$/i, ".csv") || "staff.csv",
    );
    return api.post("/staff/import", formData);
  };

  const handleSubmit = async () => {
    setLoading(true);
    resetState();

    try {
      const res = await sendRequest();
      const data = res?.data || {};

      const nextSummary = {
        total: data?.total ?? 0,
        created: data?.created ?? 0,
        skipped: data?.skipped ?? 0,
        failed: data?.failed ?? 0,
      };

      setSummary(nextSummary);
      setRows(Array.isArray(data?.rows) ? data.rows : []);

      if (nextSummary.created > 0) {
        onSuccess?.();
        if (mode === "paste" && !nextSummary.skipped && !nextSummary.failed) {
          setPasteInput("");
        }
      }

      toast.success(
        `Added ${nextSummary.created}. ${nextSummary.skipped} skipped, ${nextSummary.failed} need fixing.`,
        { position: "top-right", autoClose: 3000 },
      );
    } catch (err) {
      // Plan limits (402) open the upgrade dialog instead.
      if (err?.response?.status === 402) return;
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "We couldn't add these staff";
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
        Add Several Staff
        <IconButton
          aria-label="Close"
          onClick={handleClose}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Tabs
          value={mode}
          onChange={(_, value) => {
            setMode(value);
            resetState();
          }}
          sx={{ mb: 2 }}
        >
          <Tab value="paste" label="Paste a list" sx={{ textTransform: "none" }} />
          <Tab
            value="file"
            sx={{ textTransform: "none" }}
            label={
              <Box display="flex" alignItems="center" gap={1}>
                Import a spreadsheet
                {!canImportFile && <Chip size="small" label="Starter" />}
              </Box>
            }
          />
        </Tabs>

        {mode === "paste" ? (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              One person per line: name, then a mobile number or email, then
              their role. Without a role they're added as{" "}
              {String(defaultRole || "your first role").replace(/_/g, " ")}.
              You can paste straight from a spreadsheet.
            </Alert>
            <TextField
              fullWidth
              multiline
              minRows={8}
              label="Staff list"
              value={pasteInput}
              onChange={(e) => setPasteInput(e.target.value)}
              placeholder={PASTE_PLACEHOLDER}
              helperText={
                pastedRows.length
                  ? `${pastedRows.length} ${pastedRows.length === 1 ? "person" : "people"} ready to add`
                  : " "
              }
            />
          </>
        ) : (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              Upload a .csv/.xlsx/.xls file with columns name, phone, email and
              role (a phone or an email is enough). Common column names like
              "Mobile" or "Position" work too. Maximum {MAX_ROWS} rows.
              {!canImportFile &&
                " Spreadsheet import is on Starter and up; pasting a list is free."}
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
                Upload File
                <input
                  hidden
                  type="file"
                  accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
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
              helperText="You can edit the content before importing."
            />
          </>
        )}

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
                  <TableCell>Row</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rowsToRender.map((row, index) => (
                  <TableRow key={`${row?.rowNumber || "row"}-${index}`}>
                    <TableCell>{row?.rowNumber ?? index + 1}</TableCell>
                    <TableCell>{row?.name || "-"}</TableCell>
                    <TableCell>{statusLabel(row?.status)}</TableCell>
                    <TableCell>{row?.reason || "-"}</TableCell>
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
          {loading ? "Adding..." : "Add Staff"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
