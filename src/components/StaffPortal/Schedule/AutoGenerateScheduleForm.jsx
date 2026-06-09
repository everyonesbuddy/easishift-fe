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
  TextField,
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

const DRAFT_EDITABLE_STATES = new Set(["proposed", "locked", "removed"]);

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

const toDateTimeLocalInput = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
};

const toIsoFromLocalInput = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const getAssignmentId = (assignment) =>
  String(assignment?.assignmentId || assignment?._id || "");

const isPublishableState = (state) => ["proposed", "locked"].includes(state);

const getWarningChips = (assignment, thresholdHours) => {
  const warnings = assignment?.warnings || {};
  const chips = [];
  const projectedWeekMinutes = Number(warnings.projectedWeekMinutes) || 0;
  const thresholdMinutes = Number(thresholdHours || 40) * 60;
  const closeWindowMinutes = Math.max(0, thresholdMinutes - 4 * 60);

  if (projectedWeekMinutes >= thresholdMinutes) {
    chips.push({ key: "over40", label: "40h+ projected", color: "error" });
  } else if (projectedWeekMinutes >= closeWindowMinutes) {
    chips.push({ key: "near40", label: "Close to 40h", color: "warning" });
  }

  if (Number(warnings.overtimeMinutes) > 0) {
    chips.push({ key: "overtime", label: "Overtime risk", color: "warning" });
  }

  if (Number(warnings.consecutiveDaysIfAssigned) >= 5) {
    chips.push({ key: "streak", label: "Consecutive days", color: "warning" });
  }

  return chips;
};

export default function AutoGenerateScheduleForm({ onSuccess, onClose }) {
  const { facilityPreferences } = useAuth();

  const [coverages, setCoverages] = useState([]);
  const [selectedCoverageIds, setSelectedCoverageIds] = useState([]);
  const [selectedRole, setSelectedRole] = useState("");
  const [fetchingCoverages, setFetchingCoverages] = useState(false);
  const [creatingDraft, setCreatingDraft] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [drafts, setDrafts] = useState([]);
  const [activeDraftId, setActiveDraftId] = useState("");
  const [activeDraft, setActiveDraft] = useState(null);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [loadingDraftDetail, setLoadingDraftDetail] = useState(false);
  const [actionLoading, setActionLoading] = useState("");

  const [staffList, setStaffList] = useState([]);
  const [selectedAssignmentIds, setSelectedAssignmentIds] = useState([]);
  const [editingAssignmentId, setEditingAssignmentId] = useState("");
  const [editForm, setEditForm] = useState({
    staffId: "",
    startTime: "",
    endTime: "",
    notes: "",
    state: "proposed",
    force: false,
  });

  const roleOptions = useMemo(
    () => getRoleOptionsFromFacilityPreferences(facilityPreferences),
    [facilityPreferences],
  );

  const selectableCoverageIds = useMemo(
    () =>
      coverages
        .filter((coverage) => Number(coverage.spotsRemaining) > 0)
        .map((coverage) => coverage._id),
    [coverages],
  );

  const selectedSelectableCount = useMemo(
    () =>
      selectedCoverageIds.filter((id) => selectableCoverageIds.includes(id))
        .length,
    [selectedCoverageIds, selectableCoverageIds],
  );

  const allSelectableSelected =
    selectableCoverageIds.length > 0 &&
    selectedSelectableCount === selectableCoverageIds.length;
  const hasSomeSelectableSelected =
    selectedSelectableCount > 0 && !allSelectableSelected;

  const staffById = useMemo(() => {
    const map = new Map();
    staffList.forEach((staff) => {
      if (staff?._id) {
        map.set(String(staff._id), staff);
      }
    });
    return map;
  }, [staffList]);

  const activeAssignments = useMemo(() => {
    const assignments = Array.isArray(activeDraft?.assignments)
      ? activeDraft.assignments
      : [];
    return [...assignments].sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
  }, [activeDraft]);

  const publishableAssignments = useMemo(
    () =>
      activeAssignments.filter((assignment) =>
        isPublishableState(assignment.state),
      ),
    [activeAssignments],
  );

  const publishableAssignmentIdSet = useMemo(
    () =>
      new Set(
        publishableAssignments.map((assignment) => getAssignmentId(assignment)),
      ),
    [publishableAssignments],
  );

  const selectedPublishableCount = selectedAssignmentIds.filter((id) =>
    publishableAssignmentIdSet.has(id),
  ).length;

  const overtimeThresholdHours =
    Number(activeDraft?.facilityPolicy?.weeklyOvertimeThresholdHours) || 40;

  const allPublishableSelected =
    publishableAssignments.length > 0 &&
    publishableAssignments.every((assignment) =>
      selectedAssignmentIds.includes(getAssignmentId(assignment)),
    );

  const somePublishableSelected =
    selectedPublishableCount > 0 && !allPublishableSelected;

  const assignmentsByDay = useMemo(() => {
    const grouped = new Map();

    activeAssignments.forEach((assignment) => {
      const start = new Date(assignment.startTime);
      const dayLabel = Number.isNaN(start.getTime())
        ? "Unknown date"
        : start.toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
          });

      if (!grouped.has(dayLabel)) {
        grouped.set(dayLabel, []);
      }

      grouped.get(dayLabel).push(assignment);
    });

    return Array.from(grouped.entries()).map(([dayLabel, assignments]) => ({
      dayLabel,
      assignments,
    }));
  }, [activeAssignments]);

  const loadCoverages = async () => {
    setFetchingCoverages(true);
    try {
      const res = await api.get("/coverage/unfilled-auto");
      const now = new Date();
      const upcoming = (Array.isArray(res.data) ? res.data : [])
        .filter(
          (coverage) =>
            new Date(coverage.endTime) >= now &&
            (!selectedRole || isRoleCompatible(selectedRole, coverage.role)),
        )
        .map((coverage) => {
          const requiredCount = Number(coverage.requiredCount) || 0;
          const assignedCount = Number(coverage.assignedCount);
          const directRemaining = Number(coverage.remaining);
          const computedRemaining = Number.isFinite(assignedCount)
            ? Math.max(0, requiredCount - assignedCount)
            : Math.max(0, requiredCount);

          return {
            ...coverage,
            spotsRemaining: Number.isFinite(directRemaining)
              ? Math.max(0, directRemaining)
              : computedRemaining,
          };
        });

      setCoverages(upcoming);
      setSelectedCoverageIds((prev) =>
        prev.filter((id) => upcoming.some((coverage) => coverage._id === id)),
      );
    } catch (err) {
      console.error(err);
      setCoverages([]);
    } finally {
      setFetchingCoverages(false);
    }
  };

  const loadStaff = async () => {
    try {
      const res = await api.get("/auth/users");
      setStaffList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setStaffList([]);
    }
  };

  const loadDrafts = async () => {
    setLoadingDrafts(true);
    try {
      const res = await api.get("/schedules/draft-schedules", {
        params: { status: "all", limit: 25 },
      });
      const list = (Array.isArray(res.data) ? res.data : []).filter((draft) =>
        ["draft", "partially_published"].includes(draft.status),
      );
      setDrafts(list);

      const stillExists = list.some((draft) => draft._id === activeDraftId);
      if (!activeDraftId && list[0]?._id) {
        setActiveDraftId(list[0]._id);
      } else if (activeDraftId && !stillExists) {
        setActiveDraftId(list[0]?._id || "");
      }
    } catch (err) {
      console.error(err);
      setDrafts([]);
      setActiveDraftId("");
      setActiveDraft(null);
    } finally {
      setLoadingDrafts(false);
    }
  };

  const loadDraftDetail = async (draftId) => {
    if (!draftId) {
      setActiveDraft(null);
      setSelectedAssignmentIds([]);
      setEditingAssignmentId("");
      return;
    }

    setLoadingDraftDetail(true);
    try {
      const res = await api.get(`/schedules/draft-schedules/${draftId}`);
      const draft = res.data || null;
      setActiveDraft(draft);

      const publishableIds = (draft?.assignments || [])
        .filter((assignment) => isPublishableState(assignment.state))
        .map((assignment) => getAssignmentId(assignment));
      setSelectedAssignmentIds((prev) =>
        prev.filter((id) => publishableIds.includes(id)),
      );
      setEditingAssignmentId("");
    } catch (err) {
      console.error(err);
      setActiveDraft(null);
      setSelectedAssignmentIds([]);
      setEditingAssignmentId("");
    } finally {
      setLoadingDraftDetail(false);
    }
  };

  useEffect(() => {
    loadCoverages();
  }, [selectedRole]);

  useEffect(() => {
    loadStaff();
    loadDrafts();
  }, []);

  useEffect(() => {
    loadDraftDetail(activeDraftId);
  }, [activeDraftId]);

  const toggleCoverageSelection = (id) => {
    setSelectedCoverageIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleToggleAllCoverageSelection = (checked) => {
    if (checked) {
      setSelectedCoverageIds((prev) =>
        Array.from(new Set([...prev, ...selectableCoverageIds])),
      );
      return;
    }

    setSelectedCoverageIds((prev) =>
      prev.filter((id) => !selectableCoverageIds.includes(id)),
    );
  };

  const handleCreateDraft = async () => {
    if (!selectedCoverageIds.length) {
      setErrorMsg("Select at least one coverage.");
      return;
    }

    setErrorMsg("");
    setCreatingDraft(true);
    try {
      const res = await api.post("/schedules/auto-generate", {
        coverageIds: selectedCoverageIds,
      });

      const newDraftId = res?.data?.draftSchedule?.draftId;
      toast.success("Draft created successfully.", toastOptions);
      await Promise.all([loadCoverages(), loadDrafts()]);
      setSelectedCoverageIds([]);
      if (newDraftId) {
        setActiveDraftId(String(newDraftId));
      }
    } catch (err) {
      console.error(err);
      const message =
        err.response?.data?.message || "Failed to create AI draft.";
      setErrorMsg(message);
      toast.error(message, toastOptions);
    } finally {
      setCreatingDraft(false);
    }
  };

  const beginEditAssignment = (assignment) => {
    const assignmentId = getAssignmentId(assignment);
    setEditingAssignmentId(assignmentId);
    setEditForm({
      staffId: String(assignment?.staffId?._id || assignment?.staffId || ""),
      startTime: toDateTimeLocalInput(assignment?.startTime),
      endTime: toDateTimeLocalInput(assignment?.endTime),
      notes: assignment?.notes || "",
      state: assignment?.state || "proposed",
      force: false,
    });
  };

  const cancelEditAssignment = () => {
    setEditingAssignmentId("");
    setEditForm({
      staffId: "",
      startTime: "",
      endTime: "",
      notes: "",
      state: "proposed",
      force: false,
    });
  };

  const handleSaveAssignment = async () => {
    if (!activeDraftId || !editingAssignmentId) return;

    const payload = {
      staffId: editForm.staffId || undefined,
      notes: editForm.notes,
      state: editForm.state,
      force: editForm.force,
    };

    const startIso = toIsoFromLocalInput(editForm.startTime);
    const endIso = toIsoFromLocalInput(editForm.endTime);

    if (startIso) payload.startTime = startIso;
    if (endIso) payload.endTime = endIso;

    setActionLoading(`save:${editingAssignmentId}`);
    try {
      await api.patch(
        `/schedules/draft-schedules/${activeDraftId}/assignments/${editingAssignmentId}`,
        payload,
      );
      toast.success("Draft assignment updated.", toastOptions);
      await loadDraftDetail(activeDraftId);
      cancelEditAssignment();
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message || "Failed to update draft assignment.",
        toastOptions,
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleStateQuickUpdate = async (assignment, nextState) => {
    const assignmentId = getAssignmentId(assignment);
    if (!activeDraftId || !assignmentId) return;

    setActionLoading(`state:${assignmentId}`);
    try {
      await api.patch(
        `/schedules/draft-schedules/${activeDraftId}/assignments/${assignmentId}`,
        { state: nextState },
      );
      toast.success("Draft updated.", toastOptions);
      await loadDraftDetail(activeDraftId);
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message ||
          "Failed to update draft assignment state.",
        toastOptions,
      );
    } finally {
      setActionLoading("");
    }
  };

  const toggleAssignmentSelection = (assignmentId) => {
    setSelectedAssignmentIds((prev) =>
      prev.includes(assignmentId)
        ? prev.filter((id) => id !== assignmentId)
        : [...prev, assignmentId],
    );
  };

  const handleToggleAllPublishableSelection = (checked) => {
    const publishableIds = publishableAssignments.map((assignment) =>
      getAssignmentId(assignment),
    );

    if (checked) {
      setSelectedAssignmentIds((prev) =>
        Array.from(new Set([...prev, ...publishableIds])),
      );
      return;
    }

    setSelectedAssignmentIds((prev) =>
      prev.filter((id) => !publishableIds.includes(id)),
    );
  };

  const handlePublishSelected = async () => {
    if (!activeDraftId || selectedPublishableCount <= 0) return;

    setActionLoading("publish:selected");
    try {
      await api.post(`/schedules/draft-schedules/${activeDraftId}/publish`, {
        assignmentIds: selectedAssignmentIds.filter((id) =>
          publishableAssignmentIdSet.has(id),
        ),
      });
      toast.success("Selected draft assignments published.", toastOptions);
      await Promise.all([
        loadDraftDetail(activeDraftId),
        loadDrafts(),
        loadCoverages(),
      ]);
      onSuccess?.();
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message ||
          "Failed to publish selected assignments.",
        toastOptions,
      );
    } finally {
      setActionLoading("");
    }
  };

  const handlePublishAll = async () => {
    if (!activeDraftId || publishableAssignments.length <= 0) return;

    setActionLoading("publish:all");
    try {
      await api.post(`/schedules/draft-schedules/${activeDraftId}/publish`);
      toast.success(
        "All publishable draft assignments published.",
        toastOptions,
      );
      await Promise.all([
        loadDraftDetail(activeDraftId),
        loadDrafts(),
        loadCoverages(),
      ]);
      onSuccess?.();
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message || "Failed to publish draft assignments.",
        toastOptions,
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleDiscardDraft = async () => {
    if (!activeDraftId) return;

    setActionLoading("discard");
    try {
      await api.post(`/schedules/draft-schedules/${activeDraftId}/discard`);
      toast.info("Draft discarded.", toastOptions);
      await Promise.all([loadDrafts(), loadCoverages()]);
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message || "Failed to discard draft.",
        toastOptions,
      );
    } finally {
      setActionLoading("");
    }
  };

  return (
    <Paper
      sx={{
        p: { xs: 1.5, md: 2.5 },
        borderRadius: 3,
        position: "relative",
        border: "1px solid",
        borderColor: "#dbeafe",
        background:
          "linear-gradient(180deg, rgba(239,246,255,0.65) 0%, rgba(255,255,255,1) 28%)",
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

      <Box sx={{ mb: 1.5, pr: onClose ? 4 : 0 }}>
        <Typography variant="h6" sx={{ mb: 0.25, fontWeight: 800 }}>
          Draft Schedule Board
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Create drafts from open coverage, edit assignments, review overtime
          risk, and publish selected or all.
        </Typography>
      </Box>

      <Stack spacing={2}>
        {errorMsg && <Alert severity="error">{errorMsg}</Alert>}

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip
            size="small"
            variant="outlined"
            color="primary"
            label={`${selectableCoverageIds.length} open coverage`}
          />
          <Chip
            size="small"
            variant="outlined"
            color="info"
            label={`${drafts.length} active drafts`}
          />
          <Chip
            size="small"
            variant="outlined"
            color="success"
            label={`${publishableAssignments.length} publishable assignments`}
          />
        </Stack>

        <Paper
          variant="outlined"
          sx={{
            p: 1.5,
            borderRadius: 2.5,
            borderColor: "#dbeafe",
            backgroundColor: "#f8fbff",
          }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 1 }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Create Draft from Open Coverage
            </Typography>
            <Chip
              size="small"
              color="primary"
              variant="outlined"
              label={`${selectableCoverageIds.length} open`}
            />
          </Stack>

          <FormControl fullWidth sx={{ mb: 1 }}>
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

          {fetchingCoverages ? (
            <Typography variant="body2">Loading coverages...</Typography>
          ) : (
            <>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={allSelectableSelected}
                    indeterminate={hasSomeSelectableSelected}
                    onChange={(e) =>
                      handleToggleAllCoverageSelection(e.target.checked)
                    }
                  />
                }
                label={`Select all (${selectedSelectableCount}/${selectableCoverageIds.length})`}
              />

              <Box sx={{ maxHeight: 260, overflowY: "auto", pr: 0.5 }}>
                {coverages.map((coverage) => {
                  const selected = selectedCoverageIds.includes(coverage._id);
                  const disabled = Number(coverage.spotsRemaining) <= 0;
                  return (
                    <Paper
                      key={coverage._id}
                      variant="outlined"
                      sx={{
                        p: 1,
                        mb: 0.75,
                        borderRadius: 2,
                        borderColor: selected ? "primary.main" : "divider",
                        borderWidth: selected ? 2 : 1,
                        backgroundColor: selected ? "#eff6ff" : "#fff",
                        opacity: disabled ? 0.65 : 1,
                        cursor: disabled ? "default" : "pointer",
                        "&:hover": {
                          borderColor: selected ? "primary.main" : "#93c5fd",
                          backgroundColor: selected ? "#eff6ff" : "#f8fafc",
                        },
                      }}
                      onClick={() =>
                        !disabled && toggleCoverageSelection(coverage._id)
                      }
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Checkbox
                          checked={selected}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleCoverageSelection(coverage._id);
                          }}
                          disabled={disabled}
                        />
                        <Typography sx={{ fontSize: 13 }}>
                          {formatDatePart(coverage.startTime || coverage.date)}{" "}
                          · {getRoleDisplayName(coverage.role)} ·{" "}
                          {formatTimePart(coverage.startTime)}-
                          {formatTimePart(coverage.endTime)}
                          {coverage.unitArea
                            ? ` · ${getUnitAreaDisplayName(coverage.unitArea)}`
                            : ""}
                          {coverage.shiftType
                            ? ` · ${getShiftTypeDisplayName(coverage.shiftType)}`
                            : ""}
                          {coverage.shiftTag
                            ? ` · ${getShiftTagDisplayName(coverage.shiftTag)}`
                            : ""}
                        </Typography>
                      </Box>
                    </Paper>
                  );
                })}
              </Box>

              <Button
                sx={{ mt: 1 }}
                variant="contained"
                color="warning"
                onClick={handleCreateDraft}
                disabled={creatingDraft}
              >
                {creatingDraft ? (
                  <CircularProgress size={20} />
                ) : (
                  "Create Draft with AI"
                )}
              </Button>
            </>
          )}
        </Paper>

        <Divider />

        <Paper
          variant="outlined"
          sx={{
            p: 1.5,
            borderRadius: 2.5,
            borderColor: "#dbeafe",
            backgroundColor: "#f8fbff",
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            sx={{ mb: 1 }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Draft Schedules
            </Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={loadDrafts}
              disabled={loadingDrafts}
            >
              Refresh
            </Button>
          </Stack>

          {drafts.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No active drafts yet.
            </Typography>
          ) : (
            <Stack spacing={0.75}>
              {drafts.map((draft) => (
                <Paper
                  key={draft._id}
                  variant="outlined"
                  onClick={() => setActiveDraftId(draft._id)}
                  sx={{
                    p: 1,
                    cursor: "pointer",
                    borderRadius: 2,
                    backgroundColor:
                      draft._id === activeDraftId ? "#eff6ff" : "#ffffff",
                    borderColor:
                      draft._id === activeDraftId ? "primary.main" : "divider",
                    borderWidth: draft._id === activeDraftId ? 2 : 1,
                    "&:hover": {
                      borderColor:
                        draft._id === activeDraftId
                          ? "primary.main"
                          : "#93c5fd",
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                      Created {formatDatePart(draft.createdAt)}
                    </Typography>
                    <Chip
                      size="small"
                      label={String(draft.status || "draft")
                        .replace("_", " ")
                        .toUpperCase()}
                      color={
                        draft.status === "partially_published"
                          ? "info"
                          : "warning"
                      }
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {Number(draft?.summary?.generatedAssignmentCount || 0)}{" "}
                    generated assignment(s)
                  </Typography>
                </Paper>
              ))}
            </Stack>
          )}
        </Paper>

        {activeDraftId && (
          <Paper
            variant="outlined"
            sx={{
              p: 1.5,
              borderRadius: 2.5,
              borderColor: "#93c5fd",
              backgroundColor: "#ffffff",
            }}
          >
            {loadingDraftDetail ? (
              <CircularProgress size={20} />
            ) : (
              <Stack spacing={1.25}>
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={1}
                  justifyContent="space-between"
                >
                  <Typography variant="subtitle2">
                    Draft Workspace ({publishableAssignments.length}{" "}
                    publishable)
                  </Typography>
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
                      variant="outlined"
                      onClick={handlePublishSelected}
                      disabled={
                        Boolean(actionLoading) || selectedPublishableCount <= 0
                      }
                    >
                      {actionLoading === "publish:selected"
                        ? "Publishing..."
                        : `Publish Selected (${selectedPublishableCount})`}
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={handlePublishAll}
                      disabled={
                        Boolean(actionLoading) ||
                        publishableAssignments.length <= 0
                      }
                    >
                      {actionLoading === "publish:all"
                        ? "Publishing..."
                        : "Publish All"}
                    </Button>
                  </Stack>
                </Stack>

                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={allPublishableSelected}
                      indeterminate={somePublishableSelected}
                      onChange={(e) =>
                        handleToggleAllPublishableSelection(e.target.checked)
                      }
                      disabled={publishableAssignments.length <= 0}
                    />
                  }
                  label={`Select all publishable (${selectedPublishableCount}/${publishableAssignments.length})`}
                />

                <Alert severity="info">
                  Overtime threshold is {overtimeThresholdHours}h. "Close to
                  40h" appears when projected weekly load is within 4 hours of
                  threshold.
                </Alert>

                {activeAssignments.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    This draft has no assignments.
                  </Typography>
                ) : (
                  <Stack spacing={1}>
                    {assignmentsByDay.map((group) => (
                      <Box key={group.dayLabel}>
                        <Typography
                          variant="caption"
                          sx={{
                            display: "block",
                            mb: 0.75,
                            mt: 0.25,
                            fontWeight: 700,
                            color: "text.secondary",
                          }}
                        >
                          {group.dayLabel}
                        </Typography>

                        <Stack spacing={1}>
                          {group.assignments.map((assignment) => {
                            const assignmentId = getAssignmentId(assignment);
                            const chips = getWarningChips(
                              assignment,
                              overtimeThresholdHours,
                            );
                            const isEditable = DRAFT_EDITABLE_STATES.has(
                              assignment?.state,
                            );
                            const isEditing =
                              editingAssignmentId === assignmentId;
                            const staffId = String(
                              assignment?.staffId?._id ||
                                assignment?.staffId ||
                                "",
                            );
                            const staffName =
                              assignment?.staffId?.name ||
                              staffById.get(staffId)?.name ||
                              "Unknown";

                            return (
                              <Paper
                                key={assignmentId}
                                variant="outlined"
                                sx={{
                                  p: 1,
                                  borderRadius: 2,
                                  borderColor: selectedAssignmentIds.includes(
                                    assignmentId,
                                  )
                                    ? "primary.main"
                                    : "divider",
                                  backgroundColor:
                                    selectedAssignmentIds.includes(assignmentId)
                                      ? "#eff6ff"
                                      : "#fff",
                                }}
                              >
                                <Stack spacing={1}>
                                  <Box
                                    sx={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "flex-start",
                                      gap: 1,
                                    }}
                                  >
                                    <Box>
                                      <Stack
                                        direction="row"
                                        spacing={1}
                                        alignItems="center"
                                      >
                                        <Checkbox
                                          size="small"
                                          checked={selectedAssignmentIds.includes(
                                            assignmentId,
                                          )}
                                          disabled={
                                            !isPublishableState(
                                              assignment.state,
                                            )
                                          }
                                          onChange={() =>
                                            toggleAssignmentSelection(
                                              assignmentId,
                                            )
                                          }
                                        />
                                        <Typography
                                          sx={{ fontWeight: 700, fontSize: 13 }}
                                        >
                                          {staffName} ·{" "}
                                          {getRoleDisplayName(assignment.role)}
                                        </Typography>
                                        <Chip
                                          size="small"
                                          label={String(
                                            assignment.state || "",
                                          ).toUpperCase()}
                                          color={
                                            assignment.state === "published"
                                              ? "success"
                                              : assignment.state === "removed"
                                                ? "default"
                                                : "warning"
                                          }
                                        />
                                      </Stack>

                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                      >
                                        {formatDateTimeWindow(
                                          assignment.startTime,
                                          assignment.endTime,
                                        )}
                                        {assignment.unitArea
                                          ? ` · ${getUnitAreaDisplayName(assignment.unitArea)}`
                                          : ""}
                                        {assignment.shiftType
                                          ? ` · ${getShiftTypeDisplayName(assignment.shiftType)}`
                                          : ""}
                                        {assignment.shiftTag
                                          ? ` · ${getShiftTagDisplayName(assignment.shiftTag)}`
                                          : ""}
                                      </Typography>
                                    </Box>

                                    {isEditable && (
                                      <Stack direction="row" spacing={0.75}>
                                        {!isEditing && (
                                          <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={() =>
                                              beginEditAssignment(assignment)
                                            }
                                          >
                                            Edit
                                          </Button>
                                        )}
                                        {assignment.state !== "locked" && (
                                          <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={() =>
                                              handleStateQuickUpdate(
                                                assignment,
                                                "locked",
                                              )
                                            }
                                            disabled={Boolean(actionLoading)}
                                          >
                                            Lock
                                          </Button>
                                        )}
                                        {assignment.state === "locked" && (
                                          <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={() =>
                                              handleStateQuickUpdate(
                                                assignment,
                                                "proposed",
                                              )
                                            }
                                            disabled={Boolean(actionLoading)}
                                          >
                                            Unlock
                                          </Button>
                                        )}
                                        {assignment.state !== "removed" ? (
                                          <Button
                                            size="small"
                                            variant="outlined"
                                            color="error"
                                            onClick={() =>
                                              handleStateQuickUpdate(
                                                assignment,
                                                "removed",
                                              )
                                            }
                                            disabled={Boolean(actionLoading)}
                                          >
                                            Remove
                                          </Button>
                                        ) : (
                                          <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={() =>
                                              handleStateQuickUpdate(
                                                assignment,
                                                "proposed",
                                              )
                                            }
                                            disabled={Boolean(actionLoading)}
                                          >
                                            Restore
                                          </Button>
                                        )}
                                      </Stack>
                                    )}
                                  </Box>

                                  {chips.length > 0 && (
                                    <Stack
                                      direction="row"
                                      spacing={0.5}
                                      flexWrap="wrap"
                                      useFlexGap
                                    >
                                      {chips.map((chip) => (
                                        <Chip
                                          key={`${assignmentId}-${chip.key}`}
                                          size="small"
                                          label={chip.label}
                                          color={chip.color}
                                          variant="outlined"
                                        />
                                      ))}
                                    </Stack>
                                  )}

                                  {isEditing && (
                                    <Paper variant="outlined" sx={{ p: 1 }}>
                                      <Stack spacing={1}>
                                        <FormControl fullWidth size="small">
                                          <InputLabel>Staff</InputLabel>
                                          <Select
                                            value={editForm.staffId}
                                            label="Staff"
                                            onChange={(e) =>
                                              setEditForm((prev) => ({
                                                ...prev,
                                                staffId: e.target.value,
                                              }))
                                            }
                                          >
                                            {staffList.map((member) => (
                                              <MenuItem
                                                key={member._id}
                                                value={member._id}
                                              >
                                                {member.name ||
                                                  member.email ||
                                                  member._id}
                                              </MenuItem>
                                            ))}
                                          </Select>
                                        </FormControl>

                                        <Stack
                                          direction={{
                                            xs: "column",
                                            sm: "row",
                                          }}
                                          spacing={1}
                                        >
                                          <TextField
                                            fullWidth
                                            size="small"
                                            label="Start"
                                            type="datetime-local"
                                            InputLabelProps={{ shrink: true }}
                                            value={editForm.startTime}
                                            onChange={(e) =>
                                              setEditForm((prev) => ({
                                                ...prev,
                                                startTime: e.target.value,
                                              }))
                                            }
                                          />
                                          <TextField
                                            fullWidth
                                            size="small"
                                            label="End"
                                            type="datetime-local"
                                            InputLabelProps={{ shrink: true }}
                                            value={editForm.endTime}
                                            onChange={(e) =>
                                              setEditForm((prev) => ({
                                                ...prev,
                                                endTime: e.target.value,
                                              }))
                                            }
                                          />
                                        </Stack>

                                        <FormControl fullWidth size="small">
                                          <InputLabel>State</InputLabel>
                                          <Select
                                            value={editForm.state}
                                            label="State"
                                            onChange={(e) =>
                                              setEditForm((prev) => ({
                                                ...prev,
                                                state: e.target.value,
                                              }))
                                            }
                                          >
                                            <MenuItem value="proposed">
                                              Proposed
                                            </MenuItem>
                                            <MenuItem value="locked">
                                              Locked
                                            </MenuItem>
                                            <MenuItem value="removed">
                                              Removed
                                            </MenuItem>
                                          </Select>
                                        </FormControl>

                                        <TextField
                                          fullWidth
                                          size="small"
                                          label="Notes"
                                          value={editForm.notes}
                                          onChange={(e) =>
                                            setEditForm((prev) => ({
                                              ...prev,
                                              notes: e.target.value,
                                            }))
                                          }
                                        />

                                        <FormControlLabel
                                          control={
                                            <Checkbox
                                              checked={editForm.force}
                                              onChange={(e) =>
                                                setEditForm((prev) => ({
                                                  ...prev,
                                                  force: e.target.checked,
                                                }))
                                              }
                                            />
                                          }
                                          label="Force override checks"
                                        />

                                        <Stack direction="row" spacing={1}>
                                          <Button
                                            size="small"
                                            variant="contained"
                                            onClick={handleSaveAssignment}
                                            disabled={
                                              actionLoading ===
                                              `save:${editingAssignmentId}`
                                            }
                                          >
                                            {actionLoading ===
                                            `save:${editingAssignmentId}`
                                              ? "Saving..."
                                              : "Save"}
                                          </Button>
                                          <Button
                                            size="small"
                                            variant="text"
                                            onClick={cancelEditAssignment}
                                          >
                                            Cancel
                                          </Button>
                                        </Stack>
                                      </Stack>
                                    </Paper>
                                  )}
                                </Stack>
                              </Paper>
                            );
                          })}
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Stack>
            )}
          </Paper>
        )}
      </Stack>
    </Paper>
  );
}
