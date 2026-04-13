import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Typography,
  Box,
  CircularProgress,
} from "@mui/material";
import { toast } from "react-toastify";
import api from "../../../config/api";
import { useAuth } from "../../../context/AuthContext";

const formatWindow = (startTime, endTime) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  return `${start.toLocaleString()} - ${end.toLocaleString()}`;
};

export default function ShiftSwapRequestModal({
  open,
  onClose,
  onSuccess,
  schedule = null,
  enableSchedulePicker = false,
  staffList = [],
}) {
  const { user } = useAuth();

  const [mySchedules, setMySchedules] = useState([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState(
    schedule?._id || "",
  );
  const [receiverStaffId, setReceiverStaffId] = useState("");
  const [note, setNote] = useState("");
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    setSelectedScheduleId(schedule?._id || "");
    setReceiverStaffId("");
    setNote("");
  }, [open, schedule]);

  useEffect(() => {
    if (!open || !enableSchedulePicker || schedule || !user?._id) return;

    const loadMySchedules = async () => {
      try {
        setLoadingSchedules(true);
        const res = await api.get(`/schedules?staffId=${user._id}`);
        const now = new Date();
        const upcoming = (res.data || []).filter(
          (s) => s.status === "scheduled" && new Date(s.startTime) > now,
        );
        setMySchedules(upcoming);
      } catch (err) {
        console.error("Failed to load schedules for swap", err);
      } finally {
        setLoadingSchedules(false);
      }
    };

    loadMySchedules();
  }, [open, enableSchedulePicker, schedule, user]);

  const activeSchedule = useMemo(() => {
    if (schedule) return schedule;
    return mySchedules.find((s) => s._id === selectedScheduleId) || null;
  }, [schedule, mySchedules, selectedScheduleId]);

  const receiverOptions = useMemo(() => {
    if (!activeSchedule) return [];

    const assignedStaffId =
      typeof activeSchedule.staffId === "string"
        ? activeSchedule.staffId
        : activeSchedule.staffId?._id;

    return staffList.filter((staff) => {
      if (!staff?._id) return false;
      if (String(staff._id) === String(assignedStaffId)) return false;
      return staff.role === activeSchedule.role;
    });
  }, [activeSchedule, staffList]);

  const submitSwapRequest = async () => {
    if (!activeSchedule?._id) {
      toast.error("Please select a shift to swap");
      return;
    }

    if (!receiverStaffId) {
      toast.error("Please choose a recipient");
      return;
    }

    try {
      setSubmitting(true);
      await api.post(`/schedules/${activeSchedule._id}/swap-requests`, {
        receiverStaffId,
        note,
      });

      toast.success("Swap request sent");
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (err) {
      console.error(err);
      const message =
        err?.response?.data?.message ||
        "Failed to send swap request. Please try again.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      scroll="paper"
    >
      <DialogTitle>Request Shift Swap</DialogTitle>
      <DialogContent dividers>
        {enableSchedulePicker && !schedule && (
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Shift</InputLabel>
            <Select
              value={selectedScheduleId}
              label="Shift"
              onChange={(e) => {
                setSelectedScheduleId(e.target.value);
                setReceiverStaffId("");
              }}
              disabled={loadingSchedules}
            >
              {loadingSchedules ? (
                <MenuItem value="" disabled>
                  Loading shifts...
                </MenuItem>
              ) : mySchedules.length ? (
                mySchedules.map((item) => (
                  <MenuItem key={item._id} value={item._id}>
                    {`${item.role} | ${formatWindow(item.startTime, item.endTime)}`}
                  </MenuItem>
                ))
              ) : (
                <MenuItem value="" disabled>
                  No upcoming scheduled shifts
                </MenuItem>
              )}
            </Select>
          </FormControl>
        )}

        {activeSchedule ? (
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontWeight: 700, mb: 0.5 }}>
              Selected Shift
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {activeSchedule.role} |{" "}
              {formatWindow(activeSchedule.startTime, activeSchedule.endTime)}
            </Typography>
          </Box>
        ) : (
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Select a shift to continue.
          </Typography>
        )}

        <FormControl
          fullWidth
          size="small"
          sx={{ mb: 2 }}
          disabled={!activeSchedule}
        >
          <InputLabel>Send To</InputLabel>
          <Select
            value={receiverStaffId}
            label="Send To"
            onChange={(e) => setReceiverStaffId(e.target.value)}
          >
            {receiverOptions.length ? (
              receiverOptions.map((staff) => (
                <MenuItem key={staff._id} value={staff._id}>
                  {staff.name} ({staff.role})
                </MenuItem>
              ))
            ) : (
              <MenuItem value="" disabled>
                No matching staff found for this role
              </MenuItem>
            )}
          </Select>
        </FormControl>

        <TextField
          fullWidth
          size="small"
          multiline
          minRows={3}
          label="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={!activeSchedule}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={submitSwapRequest}
          disabled={submitting || !activeSchedule}
        >
          {submitting ? (
            <CircularProgress size={18} color="inherit" />
          ) : (
            "Send Request"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
