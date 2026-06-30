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
import ExcelJS from "exceljs";
import api from "../../../config/api";
import { useAuth } from "../../../context/AuthContext";

const SAMPLE_CSV =
  "name,email,role,userPhone,userPhoneCountryCode,profilePicture,allowedAreas,allowedShiftTypes,certificationTags\nA,a@x.com,nurse,5551112222,+1,https://example.com/a.jpg,AL|IL,day|evening,med-pass|bilingual\nB,b@x.com,doctor,5553334444,+1,,IL,day,rn";
const MAX_ROWS = 500;

const escapeCsvCell = (value) => {
  const text = String(value ?? "");
  if (/[,"\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const parseCsvText = (text) => {
  const rows = [];
  let row = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ",") {
      row.push(current);
      current = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  return rows;
};

const toCsvText = (rows) =>
  rows
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(","))
    .join("\n");

const normalizeToken = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

const normalizePipeSeparatedTokens = (value) =>
  String(value || "")
    .split("|")
    .map((token) => normalizeToken(token))
    .filter(Boolean)
    .join("|");

const normalizeCsvFields = (csvText) => {
  const rows = parseCsvText(csvText);
  if (!rows.length) {
    return "";
  }

  const header = rows[0].map((cell) =>
    String(cell || "")
      .trim()
      .toLowerCase(),
  );
  const roleIndex = header.indexOf("role");
  const allowedAreasIndex = header.indexOf("allowedareas");
  const certificationTagsIndex = header.indexOf("certificationtags");

  const normalizedRows = rows.map((row, rowIndex) => {
    const nextRow = [...row];

    if (rowIndex === 0) {
      return nextRow;
    }

    if (roleIndex >= 0) {
      nextRow[roleIndex] = normalizeToken(nextRow[roleIndex]);
    }

    if (allowedAreasIndex >= 0) {
      nextRow[allowedAreasIndex] = normalizePipeSeparatedTokens(
        nextRow[allowedAreasIndex],
      );
    }

    if (certificationTagsIndex >= 0) {
      nextRow[certificationTagsIndex] = normalizePipeSeparatedTokens(
        nextRow[certificationTagsIndex],
      );
    }

    return nextRow;
  });

  return toCsvText(normalizedRows);
};

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
    skipped_duplicate: "Skipped Duplicate",
    failed_validation: "Failed Validation",
    failed: "Failed",
  };
  return labels[status] || status || "-";
};

export default function BulkStaffModal({
  open,
  onClose,
  onSuccess,
  staffList = [],
}) {
  const { tenant } = useAuth();

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

      if (!trimmed) {
        throw new Error("The selected file is empty");
      }

      setCsvInput(trimmed);
      setSelectedFileName(file.name);
      toast.success(
        `Loaded ${file.name}. Review and click Import Staff to continue.`,
        {
          position: "top-right",
          autoClose: 2500,
        },
      );
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

  const handleSubmit = async () => {
    setLoading(true);
    resetState();

    try {
      const trimmed = (csvInput || "").trim();
      if (!trimmed) {
        throw new Error(
          "Paste CSV content or upload a CSV/Excel file before importing",
        );
      }

      const normalizedCsv = normalizeCsvFields(trimmed);

      if (!normalizedCsv.trim()) {
        throw new Error(
          "Input must include a header row and at least one data row",
        );
      }

      if (normalizedCsv !== trimmed) {
        setCsvInput(normalizedCsv);
      }

      const seatLimit = Number(tenant?.seatLimit);
      const hasSeatLimit = Number.isFinite(seatLimit) && seatLimit > 0;

      if (hasSeatLimit) {
        const existingStaffCount = Array.isArray(staffList)
          ? staffList.length
          : 0;
        const lines = normalizedCsv
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean);
        const incomingStaffCount = Math.max(lines.length - 1, 0);

        if (incomingStaffCount <= 0) {
          throw new Error("CSV must include at least one data row");
        }

        const availableSeats = Math.max(seatLimit - existingStaffCount, 0);

        if (existingStaffCount >= seatLimit) {
          throw new Error(
            `Staff seat limit reached (${existingStaffCount}/${seatLimit}). Upgrade your plan to add more staff.`,
          );
        }

        if (incomingStaffCount > availableSeats) {
          throw new Error(
            `Import exceeds seat limit. You can add up to ${availableSeats} more staff but CSV contains ${incomingStaffCount} row(s).`,
          );
        }
      }

      const payload = { csv: normalizedCsv };

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
          Upload a .csv/.xlsx/.xls file or paste CSV content below. Required
          columns are name, email, and role. Optional columns are userPhone and
          userPhoneCountryCode, profilePicture, allowedAreas, allowedShiftTypes,
          and certificationTags. Use | to separate multiple values in array
          fields. Role, allowedAreas, and certificationTags are normalized to
          lowercase underscore format (for example, resident aide becomes
          resident_aide). Maximum {MAX_ROWS} rows per import.
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
          helperText="You can edit the CSV or Excel content before importing."
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
