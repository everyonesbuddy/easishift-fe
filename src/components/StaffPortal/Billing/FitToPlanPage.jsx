import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { FiSearch } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../../config/api";
import { useAuth } from "../../../context/AuthContext";

const INK = "#1F2937";
const MUTED = "#6B7280";
const LINE = "#E5E7EB";

const pretty = (value) =>
  String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

function PickList({ title, help, people, chosen, onToggle, limit, search, onSearch, renderMeta }) {
  const full = chosen.size >= limit;
  const shown = people.filter((p) =>
    p.name?.toLowerCase().includes(search.trim().toLowerCase()),
  );
  return (
    <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, border: `1px solid ${LINE}` }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        sx={{ justifyContent: "space-between", alignItems: { sm: "flex-end" }, mb: 2, gap: 1 }}
      >
        <Box>
          <Typography sx={{ fontWeight: 800, color: INK, fontSize: "1.1rem" }}>{title}</Typography>
          <Typography variant="body2" sx={{ color: MUTED }}>
            {help}
          </Typography>
        </Box>
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: "1.5rem",
            fontVariantNumeric: "tabular-nums",
            color: chosen.size > limit ? "error.main" : INK,
          }}
        >
          {chosen.size}
          <Box component="span" sx={{ color: MUTED, fontWeight: 600, fontSize: "1rem" }}>
            {" "}
            of {limit} kept
          </Box>
        </Typography>
      </Stack>
      {onSearch && (
        <TextField
          size="small"
          fullWidth
          placeholder="Find someone"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          sx={{ mb: 1.5 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <FiSearch color="#9CA3AF" />
              </InputAdornment>
            ),
          }}
        />
      )}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
          gap: 0.5,
          maxHeight: 420,
          overflowY: "auto",
        }}
      >
        {shown.map((person) => {
          const checked = chosen.has(person._id);
          return (
            <Box
              key={person._id}
              component="label"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 1,
                py: 0.5,
                borderRadius: 2,
                cursor: !checked && full ? "not-allowed" : "pointer",
                bgcolor: checked ? "#EFF6FF" : "transparent",
                opacity: !checked && full ? 0.5 : 1,
              }}
            >
              <Checkbox
                size="small"
                checked={checked}
                disabled={!checked && full}
                onChange={() => onToggle(person._id)}
              />
              <Box sx={{ minWidth: 0 }}>
                <Typography noWrap sx={{ fontWeight: 600, color: INK, fontSize: "0.95rem" }}>
                  {person.name}
                </Typography>
                <Typography noWrap variant="caption" sx={{ color: MUTED }}>
                  {renderMeta(person)}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}

/**
 * After a trial ends over the plan's limits: the owner picks who stays.
 * Staff not kept are archived (restorable); schedulers not kept become
 * viewers. POST /billing/fit-to-plan.
 */
export default function FitToPlanPage() {
  const { plan, refreshSession, can } = useAuth();
  const navigate = useNavigate();
  const [staff, setStaff] = useState(null);
  const [members, setMembers] = useState([]);
  const [keepStaff, setKeepStaff] = useState(new Set());
  const [keepSchedulers, setKeepSchedulers] = useState(new Set());
  const [search, setSearch] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.get("/staff"), api.get("/members")])
      .then(([s, m]) => {
        setStaff(s.data || []);
        setMembers(m.data || []);
      })
      .catch(() => setError("Couldn't load your team. Refresh to try again."));
  }, []);

  const staffLimit = plan?.limits?.staff ?? Infinity;
  const schedulerLimit = plan?.limits?.schedulers ?? Infinity;
  const owners = members.filter((m) => m.role === "owner");
  const schedulers = members.filter((m) => m.role === "scheduler");
  const schedulerSlots = Math.max(0, schedulerLimit - owners.length);
  const staffOver = (staff?.length || 0) > staffLimit;
  const schedulersOver = schedulers.length > schedulerSlots;

  const toggle = (setter, limit) => (id) =>
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < limit) next.add(id);
      return next;
    });

  const archivedCount = staffOver ? (staff?.length || 0) - keepStaff.size : 0;
  const demotedCount = schedulersOver ? schedulers.length - keepSchedulers.size : 0;
  const nothingToDo = !staffOver && !schedulersOver;

  const summary = useMemo(() => {
    const parts = [];
    if (archivedCount) parts.push(`${archivedCount} staff will be archived`);
    if (demotedCount)
      parts.push(`${demotedCount} scheduler${demotedCount === 1 ? "" : "s"} will become viewer${demotedCount === 1 ? "" : "s"}`);
    return parts.join(" and ");
  }, [archivedCount, demotedCount]);

  const save = async () => {
    setConfirmOpen(false);
    setSaving(true);
    setError("");
    try {
      const body = {};
      if (staffOver) body.keepStaffIds = [...keepStaff];
      if (schedulersOver) body.keepSchedulerIds = [...keepSchedulers];
      await api.post("/billing/fit-to-plan", body);
      await refreshSession?.();
      toast.success(`Done. You're within ${plan?.label || "your plan"} and can publish again.`);
      navigate("/billing");
    } catch (err) {
      setError(err?.response?.data?.message || "Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!can("billing.manage")) {
    return (
      <Container sx={{ mt: 5 }}>
        <Alert severity="info">Only the workspace owner can choose who to keep.</Alert>
      </Container>
    );
  }

  if (staff === null && !error) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 5, mb: 8, px: { xs: 2, sm: 3 } }}>
      <Typography variant="h4" sx={{ fontWeight: 800, color: INK, letterSpacing: "-0.02em" }}>
        Choose who to keep on {plan?.label || "your plan"}
      </Typography>
      <Typography sx={{ color: MUTED, mt: 0.5, mb: 3, maxWidth: 680 }}>
        Your plan allows {staffLimit} active staff and {schedulerLimit} scheduler
        {schedulerLimit === 1 ? "" : "s"}, including you. Nothing is deleted: archived staff keep their
        history and can be restored, and schedulers you don't keep can still look as viewers.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {nothingToDo ? (
        <Alert severity="success" action={<Button color="inherit" onClick={() => navigate("/billing")}>Back to billing</Button>}>
          You're already within your plan. Nothing to choose.
        </Alert>
      ) : (
        <Stack spacing={2}>
          {staffOver && (
            <PickList
              title="Staff"
              help="Pick who stays on the schedule. The others are archived: their upcoming shifts become open slots and their link stops working."
              people={staff}
              chosen={keepStaff}
              onToggle={toggle(setKeepStaff, staffLimit)}
              limit={staffLimit}
              search={search}
              onSearch={setSearch}
              renderMeta={(p) => (p.roles || []).map(pretty).join(", ") || "Staff"}
            />
          )}
          {schedulersOver && (
            <PickList
              title="Schedulers"
              help="You stay the owner. Pick who else stays a scheduler; the others become viewers (free, read-only)."
              people={schedulers}
              chosen={keepSchedulers}
              onToggle={toggle(setKeepSchedulers, schedulerSlots)}
              limit={schedulerSlots}
              search=""
              renderMeta={(p) => p.email}
            />
          )}

          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 3,
              border: `1px solid ${LINE}`,
              position: "sticky",
              bottom: 16,
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 2,
              alignItems: { sm: "center" },
              justifyContent: "space-between",
              bgcolor: "#fff",
              boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
            }}
          >
            <Typography sx={{ color: INK }}>
              {summary ? `${summary}.` : "Choose who to keep."}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button onClick={() => navigate("/billing")} sx={{ textTransform: "none" }}>
                Upgrade instead
              </Button>
              <Button
                variant="contained"
                disabled={saving || (staffOver && keepStaff.size === 0)}
                onClick={() => setConfirmOpen(true)}
                sx={{ textTransform: "none", fontWeight: 700 }}
              >
                {saving ? "Saving…" : "Keep these people"}
              </Button>
            </Stack>
          </Paper>
        </Stack>
      )}

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Keep these people?</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: "#334155", lineHeight: 1.6 }}>
            {summary}. You can restore archived staff later from Staff, and make viewers schedulers
            again if you upgrade.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save} sx={{ textTransform: "none" }}>
            Keep these people
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
