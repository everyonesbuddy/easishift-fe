import { useState, useEffect } from "react";
import {
  TextField,
  Button,
  Typography,
  Alert,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Paper,
  Stack,
  IconButton,
  FormControlLabel,
  Switch,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useAuth } from "../../../context/AuthContext";
import api from "../../../config/api";
import { toast } from "react-toastify";
import {
  getRoleDisplayName,
  getUnitAreaDisplayName,
  getShiftTypeDisplayName,
  getShiftTagDisplayName,
  isRoleCompatible,
} from "../../../constants/industryRoles";

// Convert UTC → local string for <input type="datetime-local">
function toLocalInputValue(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const tzOffset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - tzOffset * 60000);
  return localDate.toISOString().slice(0, 16);
}

// Convert local datetime-local → UTC
function toUTC(dateString) {
  if (!dateString) return "";
  return new Date(dateString).toISOString();
}

// Format shift label using local time (FIXES date issue)
function formatShiftLabel(coverage) {
  const start = new Date(coverage.startTime);
  const end = new Date(coverage.endTime);

  const dateLabel = start.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const startLabel = start.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  const endLabel = end.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${dateLabel} — ${startLabel} - ${endLabel}`;
}

const normalizeTag = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const toNormalizedSet = (values) =>
  new Set(
    (Array.isArray(values) ? values : [])
      .map((value) => normalizeTag(value))
      .filter(Boolean),
  );

const getCoverageId = (coverage) =>
  String(
    coverage?.coverageId?._id || coverage?.coverageId || coverage?._id || "",
  );

const buildCoverageSignature = (coverage) => {
  const startRaw = coverage?.startTime || coverage?.windowStart;
  const endRaw = coverage?.endTime || coverage?.windowEnd;
  const startMs = new Date(startRaw).getTime();
  const endMs = new Date(endRaw).getTime();

  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return "";

  return [
    String(startMs),
    String(endMs),
    normalizeTag(coverage?.role),
    normalizeTag(coverage?.unitArea),
    normalizeTag(coverage?.shiftType),
    normalizeTag(coverage?.shiftTag),
  ].join("|");
};

function doesCoverageMatchStaffTags(staff, coverage) {
  const allowedAreas = toNormalizedSet(staff?.allowedAreas);
  const allowedShiftTypes = toNormalizedSet(staff?.allowedShiftTypes);
  const certificationTags = toNormalizedSet(staff?.certificationTags);

  const hasTagRestrictions =
    allowedAreas.size > 0 ||
    allowedShiftTypes.size > 0 ||
    certificationTags.size > 0;

  // Untagged staff are treated as float and can take any role-compatible shift.
  if (!hasTagRestrictions) return true;

  if (allowedAreas.size > 0) {
    const coverageArea = normalizeTag(coverage?.unitArea);
    if (!coverageArea || !allowedAreas.has(coverageArea)) return false;
  }

  if (allowedShiftTypes.size > 0) {
    const coverageShiftType = normalizeTag(coverage?.shiftType);
    const coverageShiftTag = normalizeTag(coverage?.shiftTag);

    if (!coverageShiftType) return false;

    const exactShiftSlot = coverageShiftTag
      ? `${coverageShiftType}:${coverageShiftTag}`
      : "";

    const matchesByType = Array.from(allowedShiftTypes).some((allowed) =>
      allowed.startsWith(`${coverageShiftType}:`),
    );

    const isShiftMatch =
      (exactShiftSlot && allowedShiftTypes.has(exactShiftSlot)) ||
      allowedShiftTypes.has(coverageShiftType) ||
      (!coverageShiftTag && matchesByType);

    if (!isShiftMatch) return false;
  }

  if (certificationTags.size > 0) {
    const coverageCertTags = (
      Array.isArray(coverage?.requiredCertificationTags)
        ? coverage.requiredCertificationTags
        : []
    )
      .map((tag) => normalizeTag(tag))
      .filter(Boolean);

    const hasRequiredCerts = coverageCertTags.every((tag) =>
      certificationTags.has(tag),
    );

    if (!hasRequiredCerts) return false;
  }

  return true;
}

export default function ScheduleForm({
  onSuccess,
  onClose,
  schedule,
  staffList,
  initialStaffId = "",
  initialCoverage = null,
  disableStaffSelect = false,
}) {
  const isEditing = Boolean(schedule);

  const { isAdmin } = useAuth();

  const [formData, setFormData] = useState({
    staffId: "",
    coverageId: "",
    role: "",
    unitArea: "",
    shiftType: "",
    shiftTag: "",
    certificationTags: [],
    startTime: "",
    endTime: "",
    notes: "",
    status: "scheduled",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  const [coverageOptions, setCoverageOptions] = useState([]);
  const [message, setMessage] = useState("");
  const [includeDraftCoverages, setIncludeDraftCoverages] = useState(false);
  const [draftCoverageIds, setDraftCoverageIds] = useState([]);
  const [draftCoverageSignatures, setDraftCoverageSignatures] = useState([]);
  const [hasLoadedDraftCoverageRefs, setHasLoadedDraftCoverageRefs] =
    useState(false);
  const [draftCoverageFetchFailed, setDraftCoverageFetchFailed] =
    useState(false);

  const activeCoverageContext = !isEditing
    ? initialCoverage ||
      coverageOptions.find(
        (coverage) => coverage._id === formData.coverageId,
      ) ||
      null
    : null;

  const compatibleStaffOptions = staffList.filter((member) => {
    if (!activeCoverageContext) return true;

    const isCompatibleRole = isRoleCompatible(
      member?.role,
      activeCoverageContext?.role,
    );
    if (!isCompatibleRole) return false;

    return doesCoverageMatchStaffTags(member, activeCoverageContext);
  });

  // Load existing schedule when editing
  useEffect(() => {
    if (schedule) {
      setFormData({
        staffId: schedule.staffId?._id || "",
        coverageId: "",
        role: schedule.role || "",
        unitArea: schedule.unitArea || "",
        shiftType: schedule.shiftType || "",
        shiftTag: schedule.shiftTag || "",
        certificationTags: schedule.certificationTags || [],
        startTime: toLocalInputValue(schedule.startTime),
        endTime: toLocalInputValue(schedule.endTime),
        notes: schedule.notes || "",
        status: schedule.status || "scheduled",
        timezone:
          schedule.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    }
  }, [schedule]);

  // If an initialStaffId is provided (e.g., non-admin scheduling themselves), prefill it
  useEffect(() => {
    if (!schedule && initialStaffId) {
      const selected = staffList.find((s) => s._id === initialStaffId);
      setFormData((f) => ({
        ...f,
        staffId: initialStaffId,
        role: selected?.role || f.role,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialStaffId, schedule]);

  useEffect(() => {
    if (isEditing || !initialCoverage) return;

    const coverageId =
      initialCoverage?._id || initialCoverage?.coverageId || "";

    setFormData((prev) => ({
      ...prev,
      coverageId: String(coverageId),
      role: initialCoverage?.role || prev.role,
      unitArea: initialCoverage?.unitArea || "",
      shiftType: initialCoverage?.shiftType || "",
      shiftTag: initialCoverage?.shiftTag || "",
      certificationTags: Array.isArray(
        initialCoverage?.requiredCertificationTags,
      )
        ? initialCoverage.requiredCertificationTags
        : prev.certificationTags,
      startTime: toLocalInputValue(initialCoverage?.startTime),
      endTime: toLocalInputValue(initialCoverage?.endTime),
    }));
  }, [initialCoverage, isEditing]);

  // Load draft coverage references so manual scheduling can avoid draft collisions.
  useEffect(() => {
    if (isEditing) {
      setHasLoadedDraftCoverageRefs(true);
      setDraftCoverageFetchFailed(false);
      return;
    }

    let isMounted = true;

    async function loadDraftCoverageReferences() {
      setHasLoadedDraftCoverageRefs(false);
      setDraftCoverageFetchFailed(false);

      try {
        const res = await api.get("/schedules/draft-schedules", {
          params: { status: "all", limit: 50 },
        });

        const drafts = Array.isArray(res.data) ? res.data : [];
        const activeDrafts = drafts.filter((draft) =>
          ["draft", "partially_published"].includes(
            String(draft?.status || "").toLowerCase(),
          ),
        );

        const idSet = new Set();
        const signatureSet = new Set();

        activeDrafts.forEach((draft) => {
          const draftCoverages = [
            ...(Array.isArray(draft?.coverageSnapshot)
              ? draft.coverageSnapshot
              : []),
            ...(Array.isArray(draft?.coverages) ? draft.coverages : []),
            ...(Array.isArray(draft?.sourceCoverages)
              ? draft.sourceCoverages
              : []),
            ...(Array.isArray(draft?.inputCoverages)
              ? draft.inputCoverages
              : []),
            ...(Array.isArray(draft?.requestedCoverages)
              ? draft.requestedCoverages
              : []),
          ];

          draftCoverages.forEach((coverage) => {
            const coverageId = getCoverageId(coverage);
            if (coverageId) idSet.add(coverageId);

            const signature = buildCoverageSignature(coverage);
            if (signature) signatureSet.add(signature);
          });

          [
            ...(Array.isArray(draft?.coverageIds) ? draft.coverageIds : []),
            ...(Array.isArray(draft?.sourceCoverageIds)
              ? draft.sourceCoverageIds
              : []),
            ...(Array.isArray(draft?.inputCoverageIds)
              ? draft.inputCoverageIds
              : []),
          ].forEach((coverageId) => {
            const normalized = String(coverageId || "");
            if (normalized) idSet.add(normalized);
          });

          (Array.isArray(draft?.assignments) ? draft.assignments : []).forEach(
            (assignment) => {
              const assignmentCoverageId = String(
                assignment?.coverageId?._id || assignment?.coverageId || "",
              );
              if (assignmentCoverageId) idSet.add(assignmentCoverageId);
            },
          );
        });

        if (!isMounted) return;
        setDraftCoverageIds(Array.from(idSet));
        setDraftCoverageSignatures(Array.from(signatureSet));
      } catch (err) {
        console.error(err);
        if (!isMounted) return;
        setDraftCoverageIds([]);
        setDraftCoverageSignatures([]);
        setDraftCoverageFetchFailed(true);
      } finally {
        if (isMounted) {
          setHasLoadedDraftCoverageRefs(true);
        }
      }
    }

    loadDraftCoverageReferences();

    return () => {
      isMounted = false;
    };
  }, [isEditing]);

  // Load available coverage when staff changes
  useEffect(() => {
    async function loadCoverage() {
      if (!formData.staffId || isEditing) return;

      const excludeDraftCoverages = !isAdmin || !includeDraftCoverages;
      if (excludeDraftCoverages && !hasLoadedDraftCoverageRefs) {
        setCoverageOptions([]);
        return;
      }

      if (excludeDraftCoverages && draftCoverageFetchFailed) {
        setCoverageOptions([]);
        return;
      }

      const selectedStaff = staffList.find((s) => s._id === formData.staffId);
      if (!selectedStaff) return;

      try {
        const [coverageRes, schedulesRes] = await Promise.all([
          api.get(`/coverage`),
          api.get(`/schedules`),
        ]);

        // Filter out past shifts (based on startTime)
        const now = new Date();
        const schedules = Array.isArray(schedulesRes.data)
          ? schedulesRes.data
          : [];

        const getScheduledCount = (coverage) => {
          const assignedCount = Number(coverage?.assignedCount);
          if (Number.isFinite(assignedCount)) return assignedCount;

          const startMs = new Date(coverage?.startTime).getTime();
          const endMs = new Date(coverage?.endTime).getTime();

          return schedules.filter((scheduleItem) => {
            if (!scheduleItem) return false;
            if (scheduleItem.status === "call_out") return false;

            const scheduleStartMs = new Date(scheduleItem.startTime).getTime();
            const scheduleEndMs = new Date(scheduleItem.endTime).getTime();

            return (
              scheduleStartMs === startMs &&
              scheduleEndMs === endMs &&
              isRoleCompatible(scheduleItem.role, coverage.role)
            );
          }).length;
        };

        const draftCoverageIdSet = new Set(draftCoverageIds);
        const draftCoverageSignatureSet = new Set(draftCoverageSignatures);

        const validShifts = (coverageRes.data || [])
          .filter((c) => {
            if (excludeDraftCoverages) {
              const coverageId = getCoverageId(c);
              const coverageSignature = buildCoverageSignature(c);
              const isDraftLinked =
                (coverageId && draftCoverageIdSet.has(coverageId)) ||
                (coverageSignature &&
                  draftCoverageSignatureSet.has(coverageSignature));

              if (isDraftLinked) {
                return false;
              }
            }

            return (
              new Date(c.startTime) > now &&
              isRoleCompatible(selectedStaff.role, c.role) &&
              doesCoverageMatchStaffTags(selectedStaff, c)
            );
          })
          .map((c) => {
            const requiredCount = Number(c.requiredCount) || 0;
            const directRemaining = Number(c.remaining);
            const scheduledCount = getScheduledCount(c);
            const computedRemaining = Math.max(
              0,
              requiredCount - scheduledCount,
            );

            const spotsRemaining = Number.isFinite(directRemaining)
              ? Math.max(0, directRemaining)
              : computedRemaining;

            return {
              ...c,
              spotsRemaining,
            };
          })
          .filter((c) => c.spotsRemaining > 0);

        setCoverageOptions(validShifts);
      } catch (err) {
        console.error(err);
      }
    }

    loadCoverage();
  }, [
    draftCoverageFetchFailed,
    draftCoverageIds,
    draftCoverageSignatures,
    formData.staffId,
    hasLoadedDraftCoverageRefs,
    includeDraftCoverages,
    isAdmin,
    isEditing,
    staffList,
  ]);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!isEditing && activeCoverageContext) {
      const selectedStaff = staffList.find((s) => s._id === formData.staffId);
      const isCompatible =
        Boolean(selectedStaff) &&
        isRoleCompatible(selectedStaff?.role, activeCoverageContext?.role) &&
        doesCoverageMatchStaffTags(selectedStaff, activeCoverageContext);

      if (!isCompatible) {
        const msg =
          "Selected staff is not compatible with this coverage requirements.";
        setMessage(`❌ ${msg}`);
        toast.error(msg, { position: "top-right", autoClose: 3500 });
        return;
      }
    }

    const payload = {
      staffId: formData.staffId,
      role: formData.role,
      unitArea: formData.unitArea || null,
      shiftType: formData.shiftType || null,
      shiftTag: formData.shiftTag || null,
      certificationTags: Array.isArray(formData.certificationTags)
        ? formData.certificationTags
        : [],
      startTime: toUTC(formData.startTime),
      endTime: toUTC(formData.endTime),
      notes: formData.notes,
      status: formData.status,
      timezone: formData.timezone,
    };

    if (!isAdmin && isEditing) {
      payload.status = formData.status;
      delete payload.staffId;
      delete payload.role;
      delete payload.startTime;
      delete payload.endTime;
      delete payload.notes;
      delete payload.timezone;
    }

    try {
      if (isEditing) {
        await api.put(`/schedules/${schedule._id}`, payload);
        toast.success("Schedule updated", {
          position: "top-right",
          autoClose: 2500,
        });
      } else {
        await api.post("/schedules", payload);
        toast.success("Schedule created", {
          position: "top-right",
          autoClose: 2500,
        });
      }

      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.message || "Error saving schedule";
      setMessage("❌ " + msg);
      toast.error(msg, { position: "top-right", autoClose: 4000 });
    }
  };

  return (
    <Paper
      component="form"
      onSubmit={submit}
      sx={{
        p: 3,
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
      <Stack spacing={2}>
        <Typography variant="h6">
          {isEditing ? "Edit Schedule" : "Create New Schedule"}
        </Typography>

        {message && (
          <Alert severity={message.includes("❌") ? "error" : "success"}>
            {message}
          </Alert>
        )}

        <FormControl
          fullWidth
          required
          disabled={isEditing || disableStaffSelect}
        >
          <InputLabel>Staff</InputLabel>
          <Select
            name="staffId"
            value={formData.staffId}
            onChange={(e) =>
              setFormData((prev) => {
                const nextStaffId = e.target.value;

                if (initialCoverage && !isEditing) {
                  return {
                    ...prev,
                    staffId: nextStaffId,
                  };
                }

                return {
                  ...prev,
                  staffId: nextStaffId,
                  coverageId: "",
                  startTime: "",
                  endTime: "",
                  role: "",
                  unitArea: "",
                  shiftType: "",
                  shiftTag: "",
                  certificationTags: [],
                };
              })
            }
          >
            {compatibleStaffOptions.map((s) => (
              <MenuItem key={s._id} value={s._id}>
                {s.name} ({getRoleDisplayName(s.role)})
              </MenuItem>
            ))}
            {compatibleStaffOptions.length === 0 && (
              <MenuItem disabled>
                No compatible staff for this coverage
              </MenuItem>
            )}
          </Select>
        </FormControl>

        {/* Coverage selection (create only) */}
        {!isEditing && initialCoverage && (
          <Alert severity="info">
            Scheduling open coverage: {getRoleDisplayName(initialCoverage.role)}
            {initialCoverage.unitArea
              ? ` • ${getUnitAreaDisplayName(initialCoverage.unitArea)}`
              : ""}
            {initialCoverage.startTime && initialCoverage.endTime
              ? ` • ${formatShiftLabel(initialCoverage)}`
              : ""}
            {Array.isArray(initialCoverage.requiredCertificationTags) &&
            initialCoverage.requiredCertificationTags.length > 0
              ? ` • Cert: ${initialCoverage.requiredCertificationTags.join(", ")}`
              : ""}
          </Alert>
        )}

        {!isEditing && !initialCoverage && (
          <>
            {isAdmin && (
              <FormControlLabel
                control={
                  <Switch
                    checked={includeDraftCoverages}
                    onChange={(e) => setIncludeDraftCoverages(e.target.checked)}
                    size="small"
                  />
                }
                label="Include draft-flow coverages"
              />
            )}

            {!includeDraftCoverages && draftCoverageFetchFailed && (
              <Alert severity="warning">
                Unable to verify draft coverages right now. To prevent
                conflicts, draft-linked shifts are hidden.
              </Alert>
            )}

            <FormControl fullWidth>
              <InputLabel>Select Shift</InputLabel>
              <Select
                name="coverageId"
                value={formData.coverageId}
                onChange={(e) => {
                  const cov = coverageOptions.find(
                    (c) => c._id === e.target.value,
                  );
                  if (!cov) return;

                  setFormData({
                    ...formData,
                    coverageId: cov._id,
                    role: cov.role,
                    unitArea: cov.unitArea || "",
                    shiftType: cov.shiftType || "",
                    shiftTag: cov.shiftTag || "",
                    certificationTags: cov.requiredCertificationTags || [],
                    startTime: toLocalInputValue(cov.startTime),
                    endTime: toLocalInputValue(cov.endTime),
                  });
                }}
              >
                {coverageOptions.length === 0 ? (
                  <MenuItem disabled>No shifts available</MenuItem>
                ) : (
                  coverageOptions.map((c) => (
                    <MenuItem
                      key={c._id}
                      value={c._id}
                      disabled={c.spotsRemaining <= 0}
                    >
                      {getRoleDisplayName(c.role)} • {formatShiftLabel(c)}
                      {c.unitArea
                        ? ` • ${getUnitAreaDisplayName(c.unitArea)}`
                        : ""}
                      {c.shiftType
                        ? ` • ${getShiftTypeDisplayName(c.shiftType)}`
                        : ""}
                      {c.shiftTag
                        ? ` • ${getShiftTagDisplayName(c.shiftTag)}`
                        : ""}
                      {"  "}({c.spotsRemaining} spots left
                      {c.spotsRemaining <= 0 ? " • Full" : ""})
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
          </>
        )}

        {/* Start / End Times */}
        <TextField
          type="datetime-local"
          name="startTime"
          value={formData.startTime}
          required
          disabled
        />

        <TextField
          type="datetime-local"
          name="endTime"
          value={formData.endTime}
          required
          disabled
        />

        {isAdmin && (
          <TextField
            label="Notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            multiline
            rows={3}
          />
        )}

        {isEditing && (
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              name="status"
              value={formData.status}
              onChange={handleChange}
            >
              <MenuItem value="scheduled">Scheduled</MenuItem>
              {isAdmin && <MenuItem value="completed">Completed</MenuItem>}
              <MenuItem value="call_out">Call Out</MenuItem>
            </Select>
          </FormControl>
        )}

        <Button variant="contained" type="submit">
          {isEditing ? "Update Schedule" : "Create Schedule"}
        </Button>
      </Stack>
    </Paper>
  );
}
