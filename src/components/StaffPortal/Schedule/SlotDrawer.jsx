import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import { FiMinus, FiPlus, FiUserX, FiX } from "react-icons/fi";
import { toast } from "react-toastify";
import api from "../../../config/api";
import { useAuth } from "../../../context/AuthContext";
import { getRoleDisplayName } from "../../../constants/industryRoles";
import { ineligibleReason } from "../../../utils/deliveryReasons";
import { GRID, slotLabel, titleCase } from "./weekGridUtils";
import { IOS, roleColor, tint } from "../../../theme/ios";

const initials = (name) =>
  String(name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");

function Avatar({ name, color }) {
  return (
    <Box
      sx={{
        width: 34,
        height: 34,
        borderRadius: "50%",
        bgcolor: tint(color, 0.16),
        color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 13,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initials(name)}
    </Box>
  );
}


const errorText = (err, fallback) => err?.response?.data?.message || fallback;

/**
 * One day's need for one shift + role: who's on it, who could be, and how
 * many are needed that day.
 */
const SOON_MS = 48 * 60 * 60 * 1000;

export default function SlotDrawer({ open, row, weekStart, weekPublished, callOuts = 0, people, canEdit, onClose, onChanged, onCallOut }) {
  const { facilityPreferences } = useAuth();
  const [candidates, setCandidates] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState(null);
  const [showOthers, setShowOthers] = useState(false);

  const rowId = row?._id;
  const assignedCount = row?.assignedCount;

  useEffect(() => {
    if (!open || !rowId || !canEdit) return;
    let cancelled = false;
    setCandidates(null);
    api
      .get(`/weeks/${weekStart}/candidates`, { params: { coverageId: rowId } })
      .then((res) => !cancelled && setCandidates(res.data || []))
      .catch(() => !cancelled && setCandidates([]));
    return () => {
      cancelled = true;
    };
  }, [open, rowId, weekStart, canEdit, assignedCount]);

  if (!row) return <Drawer anchor="right" open={false} onClose={onClose} />;

  const label = slotLabel(facilityPreferences, row.shiftType, row.shiftTag, row);
  const color = roleColor(row.role, facilityPreferences?.roleFamilies);
  const date = new Date(row.startTime);
  const isPast = new Date(row.endTime).getTime() < Date.now();
  const eligible = (candidates || []).filter((c) => c.eligible);
  const others = (candidates || []).filter((c) => !c.eligible);
  const remaining = Math.max(0, row.requiredCount - row.assignedCount);

  const setCount = async (next) => {
    if (next < 0 || next > 50) return;
    setBusyId("count");
    try {
      await api.put(`/coverage/${row._id}`, { requiredCount: next });
      onChanged?.();
    } catch (err) {
      if (err?.response?.status !== 402) toast.error(errorText(err, "Couldn't change the count"));
    } finally {
      setBusyId(null);
    }
  };

  // In a published week, edits wait for "Send changes". For a shift in the
  // next 48 hours, offer to send right away.
  const sendWeekNow = async () => {
    try {
      const res = await api.post(`/weeks/${weekStart}/publish`);
      const n = res.data?.messaged || 0;
      toast.success(n ? `Sent to ${n} ${n === 1 ? "person" : "people"}.` : "Nobody needed a message.");
      onChanged?.();
    } catch (err) {
      if (err?.response?.status !== 402) toast.error(errorText(err, "Couldn't send"));
    }
  };
  const afterEdit = (message, sentAlready) => {
    const soon = row && new Date(row.startTime).getTime() - Date.now() < SOON_MS;
    if (weekPublished && !sentAlready && soon) {
      toast.info(
        ({ closeToast }) => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Typography sx={{ fontSize: 14, flex: 1 }}>{message}. Not sent yet, and this shift is soon.</Typography>
            <Button
              size="small"
              variant="contained"
              onClick={() => {
                closeToast?.();
                sendWeekNow();
              }}
              sx={{ textTransform: "none", flexShrink: 0 }}
            >
              Send now
            </Button>
          </Box>
        ),
        { autoClose: 10000 },
      );
    } else {
      toast.success(`${message}${weekPublished && !sentAlready ? ". Not sent yet" : ""}`, { autoClose: 2200 });
    }
  };

  const assign = async (candidate) => {
    setBusyId(candidate.staffId);
    try {
      await api.post("/schedules", {
        staffId: candidate.staffId,
        coverageId: row._id,
        role: row.role,
        unitArea: row.unitArea || null,
        shiftType: row.shiftType || null,
        shiftTag: row.shiftTag || null,
        startTime: row.startTime,
        endTime: row.endTime,
        // Covering a call-out is urgent: tell them now.
        ...(weekPublished && callOuts > 0 ? { sendNow: true } : {}),
      });
      afterEdit(`${candidate.name} added`, weekPublished && callOuts > 0);
      onChanged?.();
    } catch (err) {
      if (err?.response?.status !== 402) toast.error(errorText(err, "Couldn't assign"));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (schedule) => {
    setBusyId(schedule._id);
    try {
      await api.delete(`/schedules/${schedule._id}`);
      afterEdit(`${schedule.staffId?.name || "Shift"} removed`, false);
      setConfirmRemoveId(null);
      onChanged?.();
    } catch (err) {
      if (err?.response?.status !== 402) toast.error(errorText(err, "Couldn't remove"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "100%", sm: 420 },
          p: 0,
          bgcolor: IOS.canvas,
          borderTopLeftRadius: { sm: 20 },
          borderBottomLeftRadius: { sm: 20 },
        },
      }}
    >
      <Box sx={{ p: 2.5, pb: 2, bgcolor: IOS.surface, borderBottom: `1px solid ${IOS.separator}`, display: "flex", justifyContent: "space-between", gap: 1 }}>
        <Box>
          <Typography sx={{ color: GRID.muted, fontSize: 13 }}>
            {date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ width: 4, height: 22, borderRadius: 4, bgcolor: color }} />
            <Typography sx={{ fontWeight: 700, fontSize: 20, color: GRID.ink, lineHeight: 1.25, letterSpacing: "-0.01em" }}>
              {getRoleDisplayName(row.role)}
            </Typography>
          </Box>
          <Typography sx={{ color: GRID.muted, fontSize: 14, mt: 0.25 }}>
            {label.name} · {label.time}
          </Typography>
          {(row.unitArea || row.requiredCertificationTags?.length > 0) && (
            <Typography sx={{ color: GRID.muted, fontSize: 13, mt: 0.25 }}>
              {[
                row.unitArea && titleCase(row.unitArea),
                row.requiredCertificationTags?.length
                  ? `needs ${row.requiredCertificationTags.map(titleCase).join(", ")}`
                  : null,
              ]
                .filter(Boolean)
                .join(", ")}
            </Typography>
          )}
        </Box>
        <IconButton onClick={onClose} aria-label="Close" size="small" sx={{ alignSelf: "flex-start", bgcolor: IOS.fill, color: IOS.secondary, "&:hover": { bgcolor: "rgba(118,118,128,0.2)" } }}>
          <FiX />
        </IconButton>
      </Box>

      <Box sx={{ p: 2.5, overflowY: "auto", flex: 1 }}>
        {/* Needed that day */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5, p: 1.75, bgcolor: IOS.surface, borderRadius: IOS.radius.cell }}>
          <Box>
            <Typography sx={{ fontWeight: 700, color: GRID.ink }}>People needed</Typography>
            <Typography sx={{ fontSize: 12, color: GRID.muted }}>
              {row.overridden ? "Changed for this day only" : "From Weekly Needs"}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <IconButton
              size="small"
              aria-label="One fewer"
              disabled={!canEdit || isPast || busyId === "count" || row.requiredCount === 0}
              onClick={() => setCount(row.requiredCount - 1)}
              sx={{ bgcolor: IOS.fill }}
            >
              <FiMinus />
            </IconButton>
            <Typography sx={{ fontWeight: 800, fontSize: 22, minWidth: 28, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
              {row.requiredCount}
            </Typography>
            <IconButton
              size="small"
              aria-label="One more"
              disabled={!canEdit || isPast || busyId === "count"}
              onClick={() => setCount(row.requiredCount + 1)}
              sx={{ bgcolor: IOS.fill }}
            >
              <FiPlus />
            </IconButton>
          </Stack>
        </Box>

        {/* On this shift */}
        <Typography sx={{ fontWeight: 600, color: IOS.secondary, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", mb: 0.75, px: 1.5 }}>
          On this shift ({row.assignedCount} of {row.requiredCount})
        </Typography>
        {people.length === 0 ? (
          <Typography sx={{ color: GRID.muted, mb: 2 }}>Nobody yet.</Typography>
        ) : (
          <Stack divider={<Divider flexItem sx={{ borderColor: IOS.hairline, ml: 7 }} />} sx={{ mb: 2.5, bgcolor: IOS.surface, borderRadius: IOS.radius.cell, overflow: "hidden" }}>
            {people.map((s) => (
              <Box key={s._id} sx={{ px: 1.5, py: 1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                <Avatar name={s.staffId?.name} color={color} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600, color: GRID.ink }}>{s.staffId?.name || "Someone"}</Typography>
                  <Typography sx={{ fontSize: 12, color: s.state === "draft" ? GRID.short : GRID.muted }}>
                    {s.state === "draft" ? "Not sent yet" : titleCase(s.status)}
                  </Typography>
                </Box>
                {canEdit && !isPast && (
                  <Stack direction="row" spacing={0.5}>
                    {s.status === "scheduled" && s.state !== "draft" && onCallOut && (
                      <Button size="small" color="error" startIcon={<FiUserX />} onClick={() => onCallOut(s)} sx={{ textTransform: "none" }}>
                        Called out
                      </Button>
                    )}
                    {confirmRemoveId === s._id ? (
                      <Button size="small" variant="contained" color="error" disabled={busyId === s._id} onClick={() => remove(s)} sx={{ textTransform: "none" }}>
                        Remove
                      </Button>
                    ) : (
                      <Button size="small" onClick={() => setConfirmRemoveId(s._id)} sx={{ textTransform: "none", color: GRID.muted }}>
                        Remove
                      </Button>
                    )}
                  </Stack>
                )}
              </Box>
            ))}
          </Stack>
        )}

        {/* Who can take it */}
        {canEdit && !isPast && (
          <>
            <Typography sx={{ fontWeight: 600, color: IOS.secondary, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", mb: 0.75, px: 1.5 }}>
              {remaining > 0 ? `Can take it (${eligible.length})` : "Others who could work it"}
            </Typography>
            {candidates === null ? (
              <Box sx={{ py: 2, display: "flex", justifyContent: "center" }}>
                <CircularProgress size={22} />
              </Box>
            ) : eligible.length === 0 ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                Nobody with this role{row.unitArea ? ", area" : ""}
                {row.requiredCertificationTags?.length ? " and certification" : ""} is free then.
              </Alert>
            ) : (
              <Stack spacing={0.75} sx={{ mb: 2 }}>
                {eligible.map((c) => (
                  <Box
                    key={c.staffId}
                    sx={{ px: 1.5, py: 1, borderRadius: IOS.radius.cell, bgcolor: IOS.surface, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}
                  >
                    <Avatar name={c.name} color={IOS.secondary} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 600, color: GRID.ink }}>{c.name}</Typography>
                      <Typography sx={{ fontSize: 12, color: c.overtimeIfAssigned ? GRID.short : GRID.muted }}>
                        {c.weekHours}h this week{c.overtimeIfAssigned ? ", would be overtime" : ""}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      variant={remaining > 0 ? "contained" : "outlined"}
                      disabled={Boolean(busyId)}
                      onClick={() => assign(c)}
                      disableElevation
                      sx={{ fontWeight: 600, flexShrink: 0, borderRadius: IOS.radius.round, px: 2 }}
                    >
                      {busyId === c.staffId ? "Adding…" : "Assign"}
                    </Button>
                  </Box>
                ))}
              </Stack>
            )}
            {others.length > 0 && (
              <Box>
                <Button size="small" onClick={() => setShowOthers((v) => !v)} sx={{ textTransform: "none", color: GRID.muted, px: 0 }}>
                  {showOthers ? "Hide" : "Show"} {others.length} who can't
                </Button>
                {showOthers && (
                  <Stack spacing={0.25} sx={{ mt: 0.5 }}>
                    {others.map((c) => (
                      <Typography key={c.staffId} sx={{ fontSize: 13, color: GRID.muted }}>
                        {c.name}: {(c.reasons || []).map(ineligibleReason).join(", ")}
                      </Typography>
                    ))}
                  </Stack>
                )}
              </Box>
            )}
          </>
        )}
      </Box>
    </Drawer>
  );
}
