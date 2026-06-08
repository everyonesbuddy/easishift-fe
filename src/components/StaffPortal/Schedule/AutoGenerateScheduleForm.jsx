import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { toast } from "react-toastify";

import api from "../../../config/api";
import { useAuth } from "../../../context/AuthContext";
import {
  getRoleDisplayName,
  getRoleOptionsFromFacilityPreferences,
  getShiftTagDisplayName,
  getShiftTypeDisplayName,
  getUnitAreaDisplayName,
  isRoleCompatible,
} from "../../../constants/industryRoles";

const toastOptions = {
  position: "top-right",
  autoClose: 3500,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
};

const formatDatePart = (value) => {
  if (!value) return "Unknown date";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown date";
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatTimePart = (value) => {
  if (!value) return "--:--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--:--";
  return parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const formatDateTimeWindow = (startTime, endTime) =>
  `${formatDatePart(startTime)} | ${formatTimePart(startTime)} - ${formatTimePart(endTime)}`;

const getWarningChips = (warnings) => {
  if (!warnings) return [];
  const chips = [];

  if (Number(warnings.overtimeMinutes) > 0) {
    chips.push({ key: "overtime", label: "Overtime risk", color: "warning" });
  }
  if (Number(warnings.consecutiveDaysIfAssigned) >= 5) {
    chips.push({ key: "streak", label: "Consecutive days", color: "warning" });
  }
  if (Number(warnings.weekendShiftCount) > 0) {
    chips.push({ key: "weekend", label: "Weekend load", color: "default" });
  }

  return chips;
};

export default function AutoGenerateScheduleForm({ onSuccess, onClose }) {
  const { facilityPreferences } = useAuth();

  const [coverages, setCoverages] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedRole, setSelectedRole] = useState("");
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [draftRuns, setDraftRuns] = useState([]);
  const [activeRunId, setActiveRunId] = useState("");
  const [activeRunDetail, setActiveRunDetail] = useState(null);
  const [loadingDraftRuns, setLoadingDraftRuns] = useState(false);
  const [loadingDraftDetail, setLoadingDraftDetail] = useState(false);
  const [actionLoading, setActionLoading] = useState("");

  const roleOptions = useMemo(
    () => getRoleOptionsFromFacilityPreferences(facilityPreferences),
    [facilityPreferences],
  );

  const selectableCoverageIds = useMemo(
    () =>
      coverages
        .filter((cov) => Number(cov.spotsRemaining) > 0)
        .map((cov) => cov._id),
    [coverages],
  );

  const selectedSelectableCount = useMemo(
    () => selectedIds.filter((id) => selectableCoverageIds.includes(id)).length,
    [selectedIds, selectableCoverageIds],
  );

  const allSelectableSelected =
    selectableCoverageIds.length > 0 &&
    selectedSelectableCount === selectableCoverageIds.length;
  const hasSomeSelectableSelected =
    selectedSelectableCount > 0 && !allSelectableSelected;

  const activeAssignments = activeRunDetail?.assignments || [];

  const loadCoverages = async () => {
    setFetching(true);
    try {
      const res = await api.get("/coverage/unfilled-auto");
      const now = new Date();
      const upcoming = (Array.isArray(res.data) ? res.data : [])
        .filter(
          (cov) =>
            new Date(cov.endTime) >= now &&
            (!selectedRole || isRoleCompatible(selectedRole, cov.role)),
        )
        .map((cov) => {
          const requiredCount = Number(cov.requiredCount) || 0;
          const assignedCount = Number(cov.assignedCount);
          const directRemaining = Number(cov.remaining);
          const computedRemaining = Number.isFinite(assignedCount)
            ? Math.max(0, requiredCount - assignedCount)
            : Math.max(0, requiredCount);

          return {
            ...cov,
            spotsRemaining: Number.isFinite(directRemaining)
              ? Math.max(0, directRemaining)
              : computedRemaining,
          };
        });

      setCoverages(upcoming);
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
      setCoverages([]);
    } finally {
      setFetching(false);
    }
  };

  const loadDraftRuns = async () => {
    setLoadingDraftRuns(true);
    try {
      const res = await api.get("/schedules/draft-runs", {
        params: { status: "draft", limit: 25 },
      });
      const runs = Array.isArray(res.data) ? res.data : [];
      setDraftRuns(runs);
      if (!activeRunId && runs[0]?._id) setActiveRunId(runs[0]._id);
      if (activeRunId && !runs.some((run) => run._id === activeRunId)) {
        setActiveRunId(runs[0]?._id || "");
      }
    } catch (err) {
      console.error(err);
      setDraftRuns([]);
      setActiveRunId("");
      setActiveRunDetail(null);
    } finally {
      setLoadingDraftRuns(false);
    }
  };

  const loadDraftDetail = async (runId) => {
    if (!runId) {
      setActiveRunDetail(null);
      return;
    }
    setLoadingDraftDetail(true);
    try {
      const res = await api.get(`/schedules/draft-runs/${runId}`);
      setActiveRunDetail(res.data || null);
    } catch (err) {
      console.error(err);
      setActiveRunDetail(null);
    } finally {
      setLoadingDraftDetail(false);
    }
  };

  useEffect(() => {
    loadCoverages();
  }, [selectedRole]);

  useEffect(() => {
    loadDraftRuns();
  }, []);

  useEffect(() => {
    loadDraftDetail(activeRunId);
  }, [activeRunId]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleToggleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds((prev) =>
        Array.from(new Set([...prev, ...selectableCoverageIds])),
      );
      return;
    }
    setSelectedIds((prev) =>
      prev.filter((id) => !selectableCoverageIds.includes(id)),
    );
  };

  const handleSubmit = async () => {
    if (!selectedIds.length) {
      setErrorMsg("Select at least one coverage.");
      return;
    }

    setErrorMsg("");
    setLoading(true);
    try {
      await api.post("/schedules/auto-generate", { coverageIds: selectedIds });
      toast.success("Draft created successfully.", toastOptions);
      await Promise.all([loadCoverages(), loadDraftRuns()]);
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
      const message =
        err.response?.data?.message || "Failed to create AI draft.";
      setErrorMsg(message);
      toast.error(message, toastOptions);
    } finally {
      setLoading(false);
    }
  };

  const handlePublishDraft = async () => {
    if (!activeRunId) return;
    setActionLoading("publish");
    try {
      await api.post(`/schedules/draft-runs/${activeRunId}/publish`);
      toast.success("Draft published.", toastOptions);
      await Promise.all([loadDraftRuns(), loadCoverages()]);
      onSuccess?.();
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message || "Failed to publish draft.",
        toastOptions,
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleDiscardDraft = async () => {
    if (!activeRunId) return;
    setActionLoading("discard");
    try {
      await api.post(`/schedules/draft-runs/${activeRunId}/discard`);
      toast.info("Draft discarded.", toastOptions);
      await loadDraftRuns();
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message || "Failed to discard draft run.",
        toastOptions,
      );
    } finally {
      setActionLoading("");
    }
  };

  return (
    <Paper
      sx={{ p: { xs: 1.5, md: 3 }, borderRadius: 2, position: "relative" }}
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

      <Typography variant="h6" sx={{ mb: 1.5 }}>
        AI Draft Planner
      </Typography>

      <Stack spacing={2}>
        {errorMsg && <Alert severity="error">{errorMsg}</Alert>}

        <FormControl fullWidth>
          <InputLabel>Role (optional)</InputLabel>
          <Select
            value={selectedRole}
            label="Role (optional)"
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            <MenuItem value="">All Roles</MenuItem>
            {roleOptions.map((item) => (
              <MenuItem key={item.value} value={item.value}>
                {item.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {fetching ? (
          <Typography>Loading coverages...</Typography>
        ) : (
          <>
            <FormControlLabel
              control={
                <Checkbox
                  checked={allSelectableSelected}
                  indeterminate={hasSomeSelectableSelected}
                  onChange={(e) => handleToggleSelectAll(e.target.checked)}
                />
              }
              label={`Select all (${selectedSelectableCount}/${selectableCoverageIds.length})`}
            />

            <Box sx={{ maxHeight: 260, overflowY: "auto" }}>
              {coverages.map((cov) => {
                const selected = selectedIds.includes(cov._id);
                const isZero = Number(cov.spotsRemaining) <= 0;
                return (
                  <Paper
                    key={cov._id}
                    variant="outlined"
                    sx={{
                      p: 1,
                      mb: 0.75,
                      opacity: isZero ? 0.65 : 1,
                      cursor: isZero ? "default" : "pointer",
                    }}
                    onClick={() => !isZero && toggleSelect(cov._id)}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Checkbox
                        checked={selected}
                        onChange={() => toggleSelect(cov._id)}
                        disabled={isZero}
                      />
                      <Typography sx={{ fontSize: 13 }}>
                        {formatDatePart(cov.date || cov.startTime)} ·{" "}
                        {getRoleDisplayName(cov.role)} ·{" "}
                        {formatTimePart(cov.startTime)}-
                        {formatTimePart(cov.endTime)}
                        {cov.unitArea
                          ? ` · ${getUnitAreaDisplayName(cov.unitArea)}`
                          : ""}
                        {cov.shiftType
                          ? ` · ${getShiftTypeDisplayName(cov.shiftType)}`
                          : ""}
                        {cov.shiftTag
                          ? ` · ${getShiftTagDisplayName(cov.shiftTag)}`
                          : ""}
                      </Typography>
                    </Box>
                  </Paper>
                );
              })}
            </Box>

            <Button
              variant="contained"
              color="warning"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <CircularProgress size={20} />
              ) : (
                "Create Draft with AI"
              )}
            </Button>
          </>
        )}

        <Divider />

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="subtitle2">Open Draft Runs</Typography>
          <Button
            size="small"
            variant="outlined"
            onClick={loadDraftRuns}
            disabled={loadingDraftRuns}
          >
            Refresh
          </Button>
        </Box>

        {draftRuns.map((run) => (
          <Paper
            key={run._id}
            variant="outlined"
            sx={{ p: 1 }}
            onClick={() => setActiveRunId(run._id)}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                Draft created {formatDatePart(run.createdAt)}
              </Typography>
              <Chip
                size="small"
                label={String(run.status || "draft").toUpperCase()}
                color="warning"
              />
            </Box>
          </Paper>
        ))}

        {activeRunId && (
          <Paper variant="outlined" sx={{ p: 1.25 }}>
            {loadingDraftDetail ? (
              <CircularProgress size={18} />
            ) : (
              <Stack spacing={1}>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={handleDiscardDraft}
                    disabled={Boolean(actionLoading)}
                  >
                    {actionLoading === "discard"
                      ? "Discarding..."
                      : "Discard Draft"}
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handlePublishDraft}
                    disabled={
                      Boolean(actionLoading) || !activeAssignments.length
                    }
                  >
                    {actionLoading === "publish"
                      ? "Publishing..."
                      : "Publish to Schedule"}
                  </Button>
                </Stack>

                {activeAssignments.map((assignment) => {
                  const warningChips = getWarningChips(assignment.warnings);
                  return (
                    <Paper
                      key={assignment._id}
                      variant="outlined"
                      sx={{ p: 1 }}
                    >
                      <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
                        {assignment.staffId?.name || "Unassigned"} ·{" "}
                        {getRoleDisplayName(assignment.role)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDateTimeWindow(
                          assignment.startTime,
                          assignment.endTime,
                        )}
                      </Typography>
                      {warningChips.length > 0 && (
                        <Stack
                          direction="row"
                          spacing={0.5}
                          flexWrap="wrap"
                          useFlexGap
                          sx={{ mt: 0.75 }}
                        >
                          {warningChips.map((chip) => (
                            <Chip
                              key={`${assignment._id}-${chip.key}`}
                              size="small"
                              label={chip.label}
                              color={chip.color}
                              variant="outlined"
                            />
                          ))}
                        </Stack>
                      )}
                    </Paper>
                  );
                })}
              </Stack>
            )}
          </Paper>
        )}
      </Stack>
    </Paper>
  );
}
