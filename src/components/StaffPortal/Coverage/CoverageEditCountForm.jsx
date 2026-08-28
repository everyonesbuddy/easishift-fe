import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { MdAdd, MdLockOutline, MdRemove } from "react-icons/md";
import { toast } from "react-toastify";
import api from "../../../config/api";
import { useAuth } from "../../../context/AuthContext";
import {
  getCertificationTagDisplayName,
  getRoleDisplayName,
  getRoleOptionsFromFacilityPreferences,
  getUnitAreaDisplayName,
} from "../../../constants/industryRoles";

const normalizeToken = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const normalizeStringArray = (values) =>
  Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  );

const getCoverageId = (value) =>
  String(
    value?.coverageId?._id || value?.coverageId || value?._id || value || "",
  );

const buildCoverageSignature = (value) => {
  const startRaw = value?.startTime || value?.windowStart;
  const endRaw = value?.endTime || value?.windowEnd;
  const startMs = new Date(startRaw).getTime();
  const endMs = new Date(endRaw).getTime();

  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return "";

  return [
    String(startMs),
    String(endMs),
    normalizeToken(value?.role),
    normalizeToken(value?.unitArea),
    normalizeToken(value?.shiftType),
    normalizeToken(value?.shiftTag),
  ].join("|");
};

const hasCoverageReference = (items, coverageId, coverageSignature) =>
  (Array.isArray(items) ? items : []).some(
    (item) =>
      getCoverageId(item) === coverageId ||
      (coverageSignature && buildCoverageSignature(item) === coverageSignature),
  );

const scheduleUsesCoverage = (schedule, coverageId, coverageSignature) => {
  if (getCoverageId(schedule) === coverageId) return true;
  return Boolean(
    coverageSignature && buildCoverageSignature(schedule) === coverageSignature,
  );
};

const activeDraftStatuses = new Set(["draft", "partially_published"]);

const draftUsesCoverage = (draft, coverageId, coverageSignature) => {
  const status = normalizeToken(draft?.status);
  if (status && !activeDraftStatuses.has(status)) return false;

  const coverageCollections = [
    draft?.coverageSnapshot,
    draft?.coverages,
    draft?.sourceCoverages,
    draft?.inputCoverages,
    draft?.requestedCoverages,
  ];

  if (
    coverageCollections.some((items) =>
      hasCoverageReference(items, coverageId, coverageSignature),
    )
  ) {
    return true;
  }

  const coverageIds = [
    ...(Array.isArray(draft?.coverageIds) ? draft.coverageIds : []),
    ...(Array.isArray(draft?.sourceCoverageIds) ? draft.sourceCoverageIds : []),
    ...(Array.isArray(draft?.inputCoverageIds) ? draft.inputCoverageIds : []),
  ].map((id) => String(id || ""));

  if (coverageIds.includes(coverageId)) return true;

  return hasCoverageReference(
    Array.isArray(draft?.assignments) ? draft.assignments : [],
    coverageId,
    coverageSignature,
  );
};

export default function CoverageEditCountForm({
  coverage,
  onClose,
  onSuccess,
}) {
  const { facilityPreferences } = useAuth();
  const [requiredCount, setRequiredCount] = useState(0);
  const [role, setRole] = useState("");
  const [unitArea, setUnitArea] = useState("");
  const [requiredCertificationTags, setRequiredCertificationTags] = useState(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [lockChecking, setLockChecking] = useState(false);
  const [metadataLocked, setMetadataLocked] = useState(true);
  const [lockReason, setLockReason] = useState("Checking coverage usage...");
  const [error, setError] = useState("");

  const coverageId = coverage?._id ? String(coverage._id) : "";

  useEffect(() => {
    setRequiredCount(Number(coverage?.requiredCount) || 0);
    setRole(coverage?.role || "");
    setUnitArea(coverage?.unitArea || "");
    setRequiredCertificationTags(
      normalizeStringArray(coverage?.requiredCertificationTags),
    );
    setError("");
  }, [coverage]);

  useEffect(() => {
    let isMounted = true;

    async function checkUsageLock() {
      if (!coverageId) {
        setMetadataLocked(true);
        setLockReason("Coverage record not found.");
        return;
      }

      setLockChecking(true);
      setMetadataLocked(true);
      setLockReason("Checking coverage usage...");
      const coverageSignature = buildCoverageSignature(coverage);

      try {
        const [schedulesResult, draftsResult] = await Promise.allSettled([
          api.get("/schedules"),
          api.get("/schedules/draft-schedules", {
            params: { status: "all", limit: 50 },
          }),
        ]);

        if (!isMounted) return;

        if (
          schedulesResult.status === "rejected" ||
          draftsResult.status === "rejected"
        ) {
          setMetadataLocked(true);
          setLockReason(
            "Role, unit area, and certification tags are locked because coverage usage could not be verified.",
          );
          return;
        }

        const schedules = Array.isArray(schedulesResult.value.data)
          ? schedulesResult.value.data
          : [];
        const drafts = Array.isArray(draftsResult.value.data)
          ? draftsResult.value.data
          : [];

        const hasSchedule = schedules.some((schedule) =>
          scheduleUsesCoverage(schedule, coverageId, coverageSignature),
        );
        const hasDraft = drafts.some((draft) =>
          draftUsesCoverage(draft, coverageId, coverageSignature),
        );
        const originalCount = Number(coverage?.requiredCount) || 0;
        const remaining = Number(
          coverage?.remaining ?? coverage?.spotsRemaining,
        );
        const hasFilledSlots =
          Number.isFinite(remaining) && remaining < originalCount;

        if (hasSchedule || hasDraft || hasFilledSlots) {
          setMetadataLocked(true);
          setLockReason(
            hasDraft
              ? "Role, unit area, and certification tags are locked because this coverage is included in a draft schedule. Count can still be changed."
              : "Role, unit area, and certification tags are locked because this coverage already has schedule activity. Count can still be changed.",
          );
          return;
        }

        setMetadataLocked(false);
        setLockReason(
          "No schedules or drafts are attached, so role, unit area, and certification tags can be updated.",
        );
      } finally {
        if (isMounted) setLockChecking(false);
      }
    }

    checkUsageLock();

    return () => {
      isMounted = false;
    };
  }, [coverage, coverageId]);

  const originalCount = useMemo(
    () => Number(coverage?.requiredCount) || 0,
    [coverage],
  );

  const roleOptions = useMemo(() => {
    const options = getRoleOptionsFromFacilityPreferences(facilityPreferences);
    if (role && !options.some((item) => item.value === role)) {
      return [{ value: role, label: getRoleDisplayName(role) }, ...options];
    }
    return options;
  }, [facilityPreferences, role]);

  const unitAreaOptions = useMemo(
    () =>
      Array.from(
        new Set(
          [unitArea, ...(facilityPreferences?.unitAreas || [])].filter(Boolean),
        ),
      ),
    [facilityPreferences?.unitAreas, unitArea],
  );

  const certificationTagOptions = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...requiredCertificationTags,
            ...(facilityPreferences?.certificationTags || []),
          ].filter(Boolean),
        ),
      ),
    [facilityPreferences?.certificationTags, requiredCertificationTags],
  );

  const delta = requiredCount - originalCount;
  const metadataDisabled = loading || lockChecking || metadataLocked;

  const setAdjustedCount = (change) => {
    setRequiredCount((prev) => Math.max(0, Number(prev) + change));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const nextCount = Number(requiredCount);

    if (!Number.isFinite(nextCount) || nextCount < 0) {
      setError("Required count must be 0 or greater.");
      return;
    }

    if (!coverage?._id) {
      setError("Coverage record not found.");
      return;
    }

    if (!metadataLocked && !role) {
      setError("Role is required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = { requiredCount: nextCount };

      if (!metadataLocked) {
        payload.role = normalizeToken(role) || role;
        payload.unitArea = normalizeToken(unitArea) || null;
        payload.requiredCertificationTags = normalizeStringArray(
          requiredCertificationTags,
        );
      }

      await api.put(`/coverage/${coverage._id}`, payload);

      toast.success("Coverage requirement updated.");
      if (onSuccess) onSuccess();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to update coverage.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper
      component="form"
      onSubmit={handleSubmit}
      elevation={0}
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: 4,
        border: "1px solid",
        borderColor: "divider",
        backgroundColor: "background.paper",
      }}
    >
      <Stack spacing={2}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Edit Coverage Requirement
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {getRoleDisplayName(coverage?.role)} • update count and available
            metadata
          </Typography>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}
        <Alert
          severity={metadataLocked ? "info" : "success"}
          icon={metadataLocked ? <MdLockOutline /> : undefined}
        >
          {lockReason}
        </Alert>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            label="Current Count"
            value={originalCount}
            InputProps={{ readOnly: true }}
            fullWidth
          />
          <TextField
            label="New Count"
            type="number"
            value={requiredCount}
            onChange={(e) =>
              setRequiredCount(Math.max(0, Number(e.target.value) || 0))
            }
            inputProps={{ min: 0 }}
            fullWidth
            required
          />
        </Stack>

        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          <Button
            type="button"
            variant="outlined"
            startIcon={<MdRemove size={18} />}
            onClick={() => setAdjustedCount(-1)}
            disabled={loading || requiredCount <= 0}
            sx={{ textTransform: "none" }}
          >
            Subtract 1
          </Button>
          <Button
            type="button"
            variant="outlined"
            startIcon={<MdAdd size={18} />}
            onClick={() => setAdjustedCount(1)}
            disabled={loading}
            sx={{ textTransform: "none" }}
          >
            Add 1
          </Button>
          <Box sx={{ display: "flex", alignItems: "center", ml: "auto" }}>
            <Typography
              variant="body2"
              color={delta === 0 ? "text.secondary" : "primary.main"}
              sx={{ fontWeight: 600 }}
            >
              {delta === 0
                ? "No count change"
                : `${delta > 0 ? "+" : ""}${delta}`}
            </Typography>
          </Box>
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            select
            fullWidth
            label="Role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={metadataDisabled}
            required={!metadataLocked}
          >
            {roleOptions.map((item) => (
              <MenuItem key={item.value} value={item.value}>
                {item.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            fullWidth
            label="Unit Area"
            value={unitArea || ""}
            onChange={(e) => setUnitArea(e.target.value || "")}
            disabled={metadataDisabled || !unitAreaOptions.length}
          >
            <MenuItem value="">Any Area</MenuItem>
            {unitAreaOptions.map((area) => (
              <MenuItem key={area} value={area}>
                {getUnitAreaDisplayName(area)}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        <TextField
          fullWidth
          select
          label="Required Certification Tags"
          value={requiredCertificationTags}
          onChange={(e) => {
            const values =
              typeof e.target.value === "string"
                ? e.target.value.split(",")
                : e.target.value;
            setRequiredCertificationTags(normalizeStringArray(values));
          }}
          SelectProps={{
            multiple: true,
            renderValue: (selected) =>
              selected?.length
                ? selected
                    .map((item) => getCertificationTagDisplayName(item))
                    .join(", ")
                : "None",
          }}
          disabled={metadataDisabled || !certificationTagOptions.length}
        >
          {certificationTagOptions.map((cert) => (
            <MenuItem key={cert} value={cert}>
              {getCertificationTagDisplayName(cert)}
            </MenuItem>
          ))}
        </TextField>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <Button
            type="button"
            variant="outlined"
            onClick={onClose}
            disabled={loading}
            fullWidth
            sx={{ textTransform: "none" }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || lockChecking}
            fullWidth
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            {loading ? "Saving..." : "Save Coverage"}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
