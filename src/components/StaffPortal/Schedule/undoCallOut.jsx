import { useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import { toast } from "react-toastify";
import api from "../../../config/api";

const nameOf = (s) => s?.staffId?.name || "This person";

/**
 * A success toast with an Undo button (10 seconds), for right after marking
 * someone out: catches the mis-tap without going looking for it.
 */
export function toastWithUndo(text, onUndo) {
  toast.success(
    ({ closeToast }) => (
      <span style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "space-between", width: "100%" }}>
        <span>{text}</span>
        <button
          type="button"
          onClick={() => {
            closeToast?.();
            onUndo();
          }}
          style={{ border: 0, background: "none", color: "#1d4ed8", fontWeight: 700, cursor: "pointer", padding: 4, fontSize: 14 }}
        >
          Undo
        </button>
      </span>
    ),
    { position: "top-right", autoClose: 10000 },
  );
}

/**
 * Undo a call-out from anywhere: { undo(schedule), dialog }. Render `dialog`.
 * If someone was added to cover and the spot is full, it asks: keep them, or
 * put this person back and take them off (which tells them, like any removal).
 */
export function useUndoCallOut({ onChanged } = {}) {
  const [conflict, setConflict] = useState(null); // { schedule, replacements, message }
  const [busy, setBusy] = useState(false);

  const undo = async (schedule) => {
    setBusy(true);
    try {
      const res = await api.post(`/schedules/${schedule._id}/undo-call-out`);
      toast.success(`${nameOf(schedule)} is back on the shift${res.data?.textsStopped ? ". Cover texts stopped." : ""}`, {
        position: "top-right",
        autoClose: 3000,
      });
      setConflict(null);
      onChanged?.();
      return true;
    } catch (err) {
      const data = err?.response?.data;
      if (data?.errorCode === "SPOT_FILLED" && data.replacements?.length) {
        setConflict({ schedule, replacements: data.replacements, message: data.message });
      } else if (err?.response?.status !== 402) {
        toast.error(data?.message || "Couldn't undo the call-out", { position: "top-right" });
      }
      return false;
    } finally {
      setBusy(false);
    }
  };

  const swapBack = async () => {
    if (!conflict) return;
    setBusy(true);
    try {
      // Tell them now: they were covering, so they shouldn't find out at the next publish.
      for (const r of conflict.replacements) await api.delete(`/schedules/${r.scheduleId}`, { params: { sendNow: "true" } });
      await undo(conflict.schedule);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't take them off the shift", { position: "top-right" });
      setBusy(false);
    }
  };

  const names = (conflict?.replacements || []).map((r) => r.name).join(" and ");
  const dialog = (
    <Dialog open={Boolean(conflict)} onClose={() => !busy && setConflict(null)} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Someone is covering this shift</DialogTitle>
      <DialogContent>
        <Typography sx={{ color: "#334155", lineHeight: 1.6 }}>
          {names} {conflict?.replacements.length === 1 ? "was" : "were"} added after {nameOf(conflict?.schedule)} called
          out, and the shift is full. Keep {names}, or put {nameOf(conflict?.schedule)} back and take {names} off? If the week is
          published, {names} {conflict?.replacements.length === 1 ? "gets" : "get"} a message right away.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setConflict(null)} disabled={busy} sx={{ textTransform: "none" }}>
          Keep {names}
        </Button>
        <Button variant="contained" onClick={swapBack} disabled={busy} sx={{ textTransform: "none" }}>
          Put {nameOf(conflict?.schedule)} back
        </Button>
      </DialogActions>
    </Dialog>
  );

  return { undo, dialog, busy };
}
