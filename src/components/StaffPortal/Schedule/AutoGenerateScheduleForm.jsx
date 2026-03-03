import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Stack,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import api from "../../../config/api";
import { toast } from "react-toastify";

const roles = [
  "doctor",
  "nurse",
  "rn",
  "lpn",
  "cna",
  "med_aide",
  "caregiver",
  "activity_aide",
  "dietary_aide",
  "housekeeper",
  "receptionist",
  "billing",
  "staff",
  "other",
];

const roleLabels = {
  doctor: "Doctor",
  nurse: "Nurse",
  rn: "RN",
  lpn: "LPN",
  cna: "CNA",
  med_aide: "Med Aide",
  caregiver: "Caregiver",
  activity_aide: "Activity Aide",
  dietary_aide: "Dietary Aide",
  housekeeper: "Housekeeper",
  receptionist: "Receptionist",
  billing: "Billing",
  staff: "Staff",
  other: "Other",
};

export default function AutoGenerateScheduleForm({ onSuccess, onClose }) {
  const [coverages, setCoverages] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedRole, setSelectedRole] = useState(""); // optional role filter
  const [fetching, setFetching] = useState(false);

  const toastOptions = {
    position: "top-right",
    autoClose: 3500,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
  };

  // Fetch unfilled coverages when component mounts or role changes
  useEffect(() => {
    async function loadCoverages() {
      setFetching(true);
      try {
        const res = await api.get("/coverage/unfilled-auto", {
          params: selectedRole ? { role: selectedRole } : {},
        });

        // Filter out past coverages
        const now = new Date();
        const upcoming = (Array.isArray(res.data) ? res.data : []).filter(
          (cov) => new Date(cov.endTime) >= now,
        );

        setCoverages(upcoming);
        setSelectedIds([]);
      } catch (err) {
        console.error(err);
        setCoverages([]);
      } finally {
        setFetching(false);
      }
    }

    loadCoverages();
  }, [selectedRole]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleSubmit = async () => {
    if (!selectedIds.length) {
      setErrorMsg("Select at least one coverage.");
      toast.info("Select at least one coverage and try AI-generate again.", {
        ...toastOptions,
        autoClose: 3000,
      });
      return;
    }

    setErrorMsg("");
    setLoading(true);

    try {
      const res = await api.post("/schedules/auto-generate", {
        coverageIds: selectedIds,
      });

      const data = res.data || {};
      const generatedCount = data.generatedCount ?? 0;
      const coverageResults = Array.isArray(data.coverageResults)
        ? data.coverageResults
        : [];

      const selectedCoverageMap = new Map(
        coverages
          .filter((cov) => selectedIds.includes(cov._id))
          .map((cov) => [cov._id, cov]),
      );

      const toNumberOrNull = (value) => {
        const n = Number(value);
        return Number.isFinite(n) ? n : null;
      };

      const findSourceCoverage = (item) => {
        const resultId = item?.coverageId || item?._id || item?.id;
        if (resultId && selectedCoverageMap.has(resultId)) {
          return selectedCoverageMap.get(resultId);
        }

        const resultStart = new Date(item?.startTime || "").getTime();
        const resultEnd = new Date(item?.endTime || "").getTime();
        if (!Number.isFinite(resultStart) || !Number.isFinite(resultEnd)) {
          return null;
        }

        return (
          coverages.find((cov) => {
            const sameRole = (cov?.role || "") === (item?.role || "");
            const covStart = new Date(cov?.startTime || "").getTime();
            const covEnd = new Date(cov?.endTime || "").getTime();
            return sameRole && covStart === resultStart && covEnd === resultEnd;
          }) || null
        );
      };

      const statusLabelMap = {
        filled: "Scheduled",
        partially_filled: "Partially Scheduled",
        already_filled: "Already Full",
        skipped: "Skipped",
      };

      const formatDatePart = (value) => {
        if (!value) return "Unknown date";
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return "Unknown date";
        return parsed.toLocaleDateString();
      };

      const formatTimePart = (value) => {
        if (!value) return "--:--";
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return "--:--";
        return parsed.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      };

      const coverageLines = coverageResults.slice(0, 3).map((item) => {
        const sourceCoverage = findSourceCoverage(item);
        const role = roleLabels[item?.role] || item?.role || "Role";
        const dateValue =
          item?.startTime ||
          sourceCoverage?.startTime ||
          item?.date ||
          sourceCoverage?.date;
        const dateText = formatDatePart(dateValue);
        const startText = formatTimePart(item?.startTime);
        const endText = formatTimePart(item?.endTime);
        const status = statusLabelMap[item?.status] || "Processed";
        const reason = item?.message;

        const requiredFromResult = toNumberOrNull(item?.requiredCount);
        const requiredFromSource = toNumberOrNull(
          sourceCoverage?.requiredCount,
        );
        const required = requiredFromResult ?? requiredFromSource;

        const startFilledFromResult = toNumberOrNull(
          item?.alreadyAssignedCount,
        );
        const startFilledFromSource = toNumberOrNull(
          sourceCoverage?.assignedCount,
        );
        const startFilled = startFilledFromResult ?? startFilledFromSource;

        const startRemainingFromSource = toNumberOrNull(
          sourceCoverage?.remaining,
        );
        const startRemaining =
          startRemainingFromSource ??
          (required != null && startFilled != null
            ? Math.max(0, required - startFilled)
            : null);

        const assignedNow = toNumberOrNull(item?.assignedCount) ?? 0;

        const endFilled =
          startFilled != null ? startFilled + assignedNow : null;

        const endRemainingFromResult = toNumberOrNull(item?.unfilledCount);
        const endRemaining =
          endRemainingFromResult ??
          (required != null && endFilled != null
            ? Math.max(0, required - endFilled)
            : null);

        const startState =
          required != null && startFilled != null && startRemaining != null
            ? `Started: required ${required}, filled ${startFilled}, remaining ${startRemaining}`
            : "Started: state unavailable";

        const endState =
          required != null && endFilled != null && endRemaining != null
            ? `Ended: required ${required}, filled ${endFilled}, remaining ${endRemaining}`
            : "Ended: state unavailable";

        return `• ${role} — ${status}\n  ${dateText} | ${startText}-${endText}\n  ${startState}\n  ${endState}${reason ? `\n  ${reason}` : ""}`;
      });

      if (coverageResults.length > 3) {
        coverageLines.push(`• +${coverageResults.length - 3} more item(s)`);
      }

      const consolidatedMessage = coverageLines.length
        ? coverageLines.join("\n\n")
        : "Auto-scheduling completed.";

      const toastMethod = generatedCount > 0 ? toast.success : toast.info;
      toastMethod(consolidatedMessage, {
        ...toastOptions,
        autoClose: 8500,
        style: {
          whiteSpace: "pre-line",
          width: "min(92vw, 760px)",
          maxWidth: "760px",
          lineHeight: 1.5,
        },
      });

      onSuccess?.();
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
      const backend = err.response?.data;
      const message = backend?.message || "Failed to auto-generate.";
      const hint = backend?.hint;
      const errorCode = backend?.errorCode;

      const fullMessage = [errorCode ? `[${errorCode}]` : null, message, hint]
        .filter(Boolean)
        .join(" ");

      setErrorMsg(fullMessage);
      toast.error(fullMessage, { ...toastOptions, autoClose: 5500 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper
      sx={{
        p: { xs: 1.5, md: 3 },
        borderRadius: 2,
        backgroundColor: "rgba(255,255,255,0.02)",
        position: "relative",
      }}
      elevation={0}
    >
      {onClose && (
        <IconButton
          aria-label="Close"
          onClick={onClose}
          sx={{ position: "absolute", top: 8, right: 8 }}
        >
          <CloseIcon />
        </IconButton>
      )}
      <Typography
        variant="h6"
        sx={{ mb: 1.5, fontSize: { xs: "1rem", md: "1.25rem" } }}
      >
        AI Generated Schedule
      </Typography>

      <Typography
        variant="body2"
        sx={{
          mb: 1.5,
          color: "gray",
          fontSize: { xs: "0.8rem", md: "0.95rem" },
        }}
      >
        Use AI to automatically assign staff to selected coverage windows.
      </Typography>

      {/* <Typography
        variant="caption"
        sx={{ color: "text.secondary", display: "block", mb: 0.5 }}
      >
        AI scheduling assigns staff based on your selected unfilled coverages
        and availability.
      </Typography> */}

      <Stack spacing={1.25}>
        {/* Role selection */}
        <FormControl fullWidth>
          <InputLabel>Role (optional)</InputLabel>
          <Select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            <MenuItem value="">All Roles</MenuItem>
            {roles.map((r) => (
              <MenuItem key={r} value={r}>
                {roleLabels[r] || r}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {fetching ? (
          <Typography sx={{ color: "gray" }}>Loading coverages...</Typography>
        ) : coverages.length === 0 ? (
          <Typography sx={{ mb: 1.5, color: "gray" }}>
            No unfilled coverages available.
          </Typography>
        ) : (
          <Box
            sx={{
              maxHeight: { xs: "60vh", md: 320 },
              overflowY: "auto",
              pr: 0.5,
            }}
          >
            {coverages
              .slice()
              .sort((a, b) => {
                // Move items with remaining === 0 to the bottom
                const aZero = a.remaining === 0;
                const bZero = b.remaining === 0;
                if (aZero === bZero) return 0;
                return aZero ? 1 : -1;
              })
              .map((cov) => {
                const dateStr = new Date(cov.date).toLocaleDateString("en-US", {
                  timeZone: "UTC",
                });
                const startStr = new Date(cov.startTime).toLocaleTimeString(
                  [],
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                  },
                );
                const endStr = new Date(cov.endTime).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                const selected = selectedIds.includes(cov._id);
                const isZero = cov.remaining === 0;

                return (
                  <Paper
                    key={cov._id}
                    onClick={() => !isZero && toggleSelect(cov._id)}
                    elevation={selected ? 6 : 0}
                    sx={{
                      p: { xs: 0.75, md: 1 },
                      my: 0.5,
                      display: "flex",
                      flexDirection: { xs: "column", sm: "row" },
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: isZero ? "default" : "pointer",
                      borderRadius: 1,
                      backgroundColor: selected
                        ? "rgba(25,118,210,0.06)"
                        : isZero
                          ? "rgba(255,255,255,0.01)"
                          : "transparent",
                      border: "1px solid rgba(255,255,255,0.03)",
                      opacity: isZero ? 0.65 : 1,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        width: "100%",
                      }}
                    >
                      <Checkbox
                        size="small"
                        checked={selected}
                        onChange={() => toggleSelect(cov._id)}
                        onClick={(e) => e.stopPropagation()}
                        disabled={isZero}
                      />

                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          minWidth: 0,
                          mr: 1,
                        }}
                      >
                        <Typography
                          sx={{
                            fontWeight: 600,
                            fontSize: { xs: 12, md: 13 },
                            lineHeight: 1,
                          }}
                          noWrap
                        >
                          {dateStr} · {roleLabels[cov.role] || cov.role}
                        </Typography>
                        <Typography
                          sx={{ fontSize: { xs: 12, md: 13 }, color: "gray" }}
                          noWrap
                        >
                          {startStr} — {endStr}
                          {cov.location ? ` · ${cov.location}` : ""}
                        </Typography>
                      </Box>
                    </Box>

                    <Box
                      sx={{
                        display: "flex",
                        gap: 2,
                        alignItems: "center",
                        mt: { xs: 1, sm: 0 },
                      }}
                    >
                      <Box sx={{ textAlign: "right" }}>
                        <Typography
                          variant="caption"
                          sx={{ color: "gray", display: "block" }}
                        >
                          Required
                        </Typography>
                        <Typography
                          sx={{ fontWeight: 700, fontSize: { xs: 13, md: 14 } }}
                        >
                          {cov.requiredCount}
                        </Typography>
                      </Box>

                      <Box sx={{ textAlign: "right" }}>
                        <Typography
                          variant="caption"
                          sx={{ color: "gray", display: "block" }}
                        >
                          Remaining
                        </Typography>
                        <Typography
                          sx={{
                            fontWeight: 700,
                            fontSize: { xs: 13, md: 14 },
                            color: isZero
                              ? "text.secondary"
                              : cov.remaining === 0
                                ? "error.main"
                                : "success.main",
                          }}
                        >
                          {cov.remaining}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                );
              })}
          </Box>
        )}

        {errorMsg && <Typography color="error">{errorMsg}</Typography>}

        <Button
          variant="contained"
          color="warning"
          fullWidth
          onClick={handleSubmit}
          disabled={loading || fetching}
        >
          {loading ? <CircularProgress size={22} /> : "Generate with AI"}
        </Button>
      </Stack>
    </Paper>
  );
}
