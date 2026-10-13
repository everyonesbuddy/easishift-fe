import { useMemo, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import { FiPlus, FiZap } from "react-icons/fi";
import { toast } from "react-toastify";
import api from "../../../config/api";
import { useAuth } from "../../../context/AuthContext";
import { getRoleDisplayName } from "../../../constants/industryRoles";
import SlotDrawer from "./SlotDrawer";
import AddNeedDialog from "./AddNeedDialog";
import { GRID, slotLabel, titleCase } from "./weekGridUtils";
import { IOS, roleColor, tint } from "../../../theme/ios";

/**
 * The week, as needs vs people. Rows are shift + role (+ area), columns are
 * days. Each cell shows a colored pill per person on the shift and a dashed
 * "Open" pill per empty spot. Click a cell to fill it, change that day's
 * count or handle a call-out.
 */

const keyToDate = (key) => {
  const [y, m, d] = String(key).split("-").map(Number);
  return new Date(y, m - 1, d);
};

const todayKey = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const shortName = (name) => {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "Someone";
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
};

const pillBase = {
  display: "flex",
  alignItems: "center",
  gap: 0.75,
  minWidth: 0,
  height: 24,
  px: 0.75,
  borderRadius: IOS.radius.pill,
  fontSize: 12,
  fontWeight: 600,
  lineHeight: 1,
};

/** One person on the shift, as a calendar-style colored pill. */
function PersonPill({ schedule, color }) {
  const draft = schedule.state === "draft";
  return (
    <Box
      sx={{
        ...pillBase,
        bgcolor: tint(color, draft ? 0.08 : 0.15),
        color: IOS.ink,
        border: draft ? `1px dashed ${tint(color, 0.6)}` : "1px solid transparent",
      }}
      title={draft ? `${schedule.staffId?.name || ""} (not sent yet)` : schedule.staffId?.name}
    >
      <Box sx={{ width: 3, height: 14, borderRadius: 2, bgcolor: color, flexShrink: 0 }} />
      <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {shortName(schedule.staffId?.name)}
      </Box>
    </Box>
  );
}

function OpenPill({ count = 1 }) {
  return (
    <Box
      sx={{
        ...pillBase,
        color: IOS.orangeText,
        bgcolor: tint(IOS.orange, 0.06),
        border: `1px dashed ${tint(IOS.orange, 0.7)}`,
        justifyContent: "center",
      }}
    >
      {count > 1 ? `${count} open` : "Open"}
    </Box>
  );
}

function Cell({ row, people, callOuts, color, onOpen, onAdd, canEdit, isPast }) {
  if (!row) {
    return (
      <Box
        sx={{
          minHeight: 56,
          height: "100%",
          borderRadius: IOS.radius.cell,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          "& button": { opacity: 0 },
          "&:hover": { bgcolor: "rgba(0,0,0,0.02)" },
          "&:hover button, & button:focus-visible": { opacity: 1 },
        }}
      >
        {canEdit && !isPast && (
          <Tooltip title="Add a need on this day">
            <IconButton size="small" onClick={onAdd} sx={{ color: IOS.blue, bgcolor: tint(IOS.blue, 0.08) }} aria-label="Add a need on this day">
              <FiPlus size={14} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    );
  }
  const needed = row.requiredCount;
  const filled = row.assignedCount;
  const open = Math.max(0, needed - filled);
  const extra = Math.max(0, filled - needed);
  const MAX_PEOPLE = 4;
  const shown = people.slice(0, MAX_PEOPLE);
  const hidden = people.length - shown.length;

  return (
    <Box
      component="button"
      type="button"
      onClick={onOpen}
      aria-label={`${filled} of ${needed} filled. Open to assign.`}
      sx={{
        all: "unset",
        boxSizing: "border-box",
        width: "100%",
        height: "100%",
        minHeight: 56,
        p: 0.75,
        borderRadius: IOS.radius.cell,
        cursor: "pointer",
        opacity: isPast ? 0.55 : 1,
        display: "flex",
        flexDirection: "column",
        gap: 0.5,
        transition: "background-color 120ms ease, box-shadow 120ms ease",
        "&:hover": { bgcolor: "rgba(0,0,0,0.03)" },
        "&:focus-visible": { boxShadow: `0 0 0 2px ${IOS.blue}` },
      }}
    >
      {shown.map((s) => (
        <PersonPill key={s._id} schedule={s} color={color} />
      ))}
      {hidden > 0 && (
        <Typography sx={{ fontSize: 11, color: IOS.secondary, fontWeight: 600, pl: 0.5 }}>+{hidden} more</Typography>
      )}
      {open > 0 && (open <= 2 ? Array.from({ length: open }, (_, i) => <OpenPill key={`o${i}`} />) : <OpenPill count={open} />)}
      {(extra > 0 || callOuts > 0) && (
        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
          {extra > 0 && (
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: GRID.over, bgcolor: tint(IOS.purple, 0.1), px: 0.75, py: 0.25, borderRadius: "6px" }}>
              +{extra} extra
            </Typography>
          )}
          {callOuts > 0 && (
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: IOS.redText, bgcolor: tint(IOS.red, 0.1), px: 0.75, py: 0.25, borderRadius: "6px" }}>
              {callOuts} called out
            </Typography>
          )}
        </Box>
      )}
      {needed === 0 && filled === 0 && (
        <Typography sx={{ fontSize: 11, color: IOS.tertiary, pl: 0.5 }}>None needed</Typography>
      )}
    </Box>
  );
}

export default function WeekGrid({ week, onChanged, onCallOut }) {
  const { facilityPreferences, can } = useAuth();
  const canEdit = can("schedule.manage");
  const [openRowId, setOpenRowId] = useState(null);
  const [addFor, setAddFor] = useState(null); // { date, shiftType, shiftTag, role, unitArea } | {}
  const [autoFillOpen, setAutoFillOpen] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);

  const data = week?.data;
  const weekStart = week?.weekStart;
  const days = data?.days || [];
  const today = todayKey();

  const { lines, byKey, peopleByCoverage, callOutsByCoverage } = useMemo(() => {
    const coverage = data?.coverage || [];
    const lineMap = new Map();
    const map = new Map();
    for (const row of coverage) {
      // Older coverage may lack shiftType/shiftTag; group those by their time.
      const timeKey = row.shiftType ? "" : `${new Date(row.startTime).getHours()}:${new Date(row.startTime).getMinutes()}`;
      const lineKey = [row.shiftType || "", row.shiftTag || timeKey, row.role || "", row.unitArea || ""].join("|");
      if (!lineMap.has(lineKey)) {
        const label = slotLabel(facilityPreferences, row.shiftType, row.shiftTag, row);
        lineMap.set(lineKey, {
          key: lineKey,
          shiftType: row.shiftType,
          shiftTag: row.shiftTag,
          role: row.role,
          unitArea: row.unitArea || null,
          certs: new Set(),
          label,
          sortStart: row.startTime ? new Date(row.startTime).getUTCHours() * 60 + new Date(row.startTime).getUTCMinutes() : 0,
        });
      }
      (row.requiredCertificationTags || []).forEach((c) => lineMap.get(lineKey).certs.add(c));
      map.set(`${lineKey}|${row.dateKey}`, row);
    }
    const people = new Map();
    const outs = new Map();
    for (const s of data?.schedules || []) {
      if (!s.coverageId) continue;
      const id = String(s.coverageId);
      if (s.status === "call_out") outs.set(id, (outs.get(id) || 0) + 1);
      else {
        if (!people.has(id)) people.set(id, []);
        people.get(id).push(s);
      }
    }
    const sorted = [...lineMap.values()].sort(
      (a, b) =>
        String(a.label.start || "").localeCompare(String(b.label.start || "")) ||
        String(a.shiftType || "").localeCompare(String(b.shiftType || "")) ||
        String(a.role || "").localeCompare(String(b.role || "")) ||
        String(a.unitArea || "").localeCompare(String(b.unitArea || "")),
    );
    return { lines: sorted, byKey: map, peopleByCoverage: people, callOutsByCoverage: outs };
  }, [data, facilityPreferences]);

  const dayTotals = useMemo(
    () =>
      days.map((day) => {
        let needed = 0;
        let filled = 0;
        for (const line of lines) {
          const row = byKey.get(`${line.key}|${day}`);
          if (!row) continue;
          needed += row.requiredCount;
          filled += Math.min(row.assignedCount, row.requiredCount);
        }
        return { needed, filled };
      }),
    [days, lines, byKey],
  );

  const openRow = openRowId ? (data?.coverage || []).find((c) => c._id === openRowId) : null;

  if (!data) {
    return (
      <Box sx={{ py: 8, textAlign: "center", color: GRID.muted }}>
        <Typography>Loading the week…</Typography>
      </Box>
    );
  }

  // Group lines under their shift for a quiet section header.
  const groups = [];
  for (const line of lines) {
    const groupKey = `${line.shiftType || ""}|${line.shiftType ? line.shiftTag : line.label.time}`;
    const last = groups[groups.length - 1];
    if (last && last.key === groupKey) last.lines.push(line);
    else groups.push({ key: groupKey, label: line.label, lines: [line] });
  }

  const columns = `minmax(180px, 1.15fr) repeat(${days.length || 7}, minmax(112px, 1fr))`;
  const roleList = facilityPreferences?.roleFamilies || [];
  const totalOpen = dayTotals.reduce((sum, t) => sum + (t.needed - t.filled), 0);
  const fillableOpen = dayTotals.reduce((sum, t, i) => sum + (days[i] >= today ? t.needed - t.filled : 0), 0);
  const isPublished = data?.week?.status === "published";

  const runAutoFill = async () => {
    setAutoFilling(true);
    try {
      const res = await api.post(`/weeks/${weekStart}/auto-fill`, {});
      const { filled = 0, stillOpen = 0, notified = 0 } = res.data || {};
      setAutoFillOpen(false);
      if (!filled) {
        toast.info(stillOpen ? "Nobody available for the open slots. Try the slot panel to see why." : "Nothing open to fill.");
      } else {
        const parts = [`Filled ${filled} slot${filled === 1 ? "" : "s"}`];
        if (isPublished) parts.push(`${notified} ${notified === 1 ? "person" : "people"} told`);
        else parts.push("not sent yet");
        if (stillOpen) parts.push(`${stillOpen} still open`);
        toast.success(`${parts.join(", ")}.`);
      }
      onChanged?.();
    } catch (err) {
      setAutoFillOpen(false);
      // 402 (plan) opens the upgrade dialog on its own.
      if (err?.response?.status !== 402) toast.error(err?.response?.data?.message || "Couldn't auto-fill");
    } finally {
      setAutoFilling(false);
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5, gap: 2, flexWrap: "wrap" }}>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <Legend kind="person" label="On shift" />
          <Legend kind="draft" label="Not sent yet" />
          <Legend kind="open" label="Open" />
        </Box>
        {canEdit && (
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button
            size="small"
            startIcon={<FiZap />}
            disabled={fillableOpen === 0}
            onClick={() => setAutoFillOpen(true)}
            sx={{ borderRadius: "10px", px: 1.5, color: "#fff", bgcolor: IOS.blue, "&:hover": { bgcolor: "#0066DB" }, "&.Mui-disabled": { bgcolor: IOS.fill, color: IOS.tertiary } }}
          >
            Auto-fill open slots
          </Button>
          <Button
            size="small"
            startIcon={<FiPlus />}
            onClick={() => setAddFor({})}
            sx={{ borderRadius: "10px", px: 1.5, color: IOS.blue, bgcolor: tint(IOS.blue, 0.1), "&:hover": { bgcolor: tint(IOS.blue, 0.16) } }}
          >
            Add a one-off need
          </Button>
          </Box>
        )}
      </Box>

      <Box
        sx={{
          overflowX: "auto",
          borderRadius: IOS.radius.card,
          bgcolor: IOS.surface,
          boxShadow: IOS.shadow,
          border: `1px solid ${IOS.hairline}`,
        }}
      >
        <Box sx={{ minWidth: 960 }}>
          {/* Day header */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: columns,
              borderBottom: `1px solid ${IOS.separator}`,
              bgcolor: "rgba(255,255,255,0.92)",
              backdropFilter: "saturate(180%) blur(20px)",
              position: "sticky",
              top: 0,
              zIndex: 1,
            }}
          >
            <Box sx={{ px: 2, py: 1.5, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
              <Typography sx={{ fontSize: 12, color: IOS.secondary, fontWeight: 600 }}>This week</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: totalOpen > 0 ? IOS.orangeText : IOS.greenText }}>
                {totalOpen > 0 ? `${totalOpen} open spot${totalOpen === 1 ? "" : "s"}` : "Everything filled"}
              </Typography>
            </Box>
            {days.map((day, i) => {
              const date = keyToDate(day);
              const isToday = day === today;
              const t = dayTotals[i];
              const open = t.needed - t.filled;
              return (
                <Box key={day} sx={{ px: 1.25, py: 1.25, textAlign: "left" }}>
                  <Typography
                    sx={{
                      fontSize: 11,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: isToday ? IOS.red : IOS.secondary,
                      fontWeight: 600,
                    }}
                  >
                    {date.toLocaleDateString(undefined, { weekday: "short" })}
                  </Typography>
                  <Box
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: 32,
                      height: 32,
                      mt: 0.25,
                      ml: isToday ? -0.5 : 0,
                      px: isToday ? 0.5 : 0,
                      borderRadius: IOS.radius.round,
                      bgcolor: isToday ? IOS.red : "transparent",
                      color: isToday ? "#fff" : IOS.ink,
                      fontSize: 22,
                      fontWeight: isToday ? 700 : 400,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {date.getDate()}
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.25 }}>
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        bgcolor: t.needed === 0 ? IOS.tertiary : open > 0 ? IOS.orange : IOS.green,
                      }}
                    />
                    <Typography sx={{ fontSize: 11, color: t.needed === 0 ? IOS.tertiary : open > 0 ? IOS.orangeText : IOS.greenText, fontWeight: 600 }}>
                      {t.needed === 0 ? "No needs" : open > 0 ? `${open} open` : "Filled"}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>

          {lines.length === 0 && (
            <Box sx={{ p: 5, textAlign: "center" }}>
              <Typography sx={{ color: IOS.ink, fontWeight: 600 }}>No needs this week yet.</Typography>
              <Typography sx={{ color: IOS.secondary }}>
                Set up Weekly Needs and every new week fills in on its own, or add a one-off need.
              </Typography>
            </Box>
          )}

          {groups.map((group, gi) => (
            <Box key={group.key}>
              <Box
                sx={{
                  px: 2,
                  py: 0.75,
                  display: "flex",
                  gap: 1,
                  alignItems: "baseline",
                  bgcolor: IOS.canvas,
                  borderTop: gi === 0 ? "none" : `1px solid ${IOS.separator}`,
                  borderBottom: `1px solid ${IOS.hairline}`,
                }}
              >
                <Typography sx={{ fontWeight: 700, color: IOS.ink, fontSize: 13 }}>{group.label.name}</Typography>
                <Typography sx={{ color: IOS.secondary, fontSize: 12, fontVariantNumeric: "tabular-nums" }}>{group.label.time}</Typography>
              </Box>
              {group.lines.map((line, li) => {
                const color = roleColor(line.role, roleList);
                return (
                  <Box
                    key={line.key}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: columns,
                      alignItems: "stretch",
                      borderTop: li === 0 ? "none" : `1px solid ${IOS.hairline}`,
                    }}
                  >
                    <Box sx={{ px: 2, py: 1.25, display: "flex", gap: 1.25, alignItems: "flex-start" }}>
                      <Box sx={{ width: 4, alignSelf: "stretch", minHeight: 20, borderRadius: 4, bgcolor: color, flexShrink: 0 }} />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 600, color: IOS.ink, fontSize: 14, lineHeight: 1.3 }}>
                          {getRoleDisplayName(line.role)}
                        </Typography>
                        {(line.unitArea || line.certs.size > 0) && (
                          <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 0.5 }}>
                            {line.unitArea && <Tag color={IOS.blue}>{titleCase(line.unitArea)}</Tag>}
                            {[...line.certs].map((c) => (
                              <Tag key={c} color={IOS.purple}>
                                {titleCase(c)}
                              </Tag>
                            ))}
                          </Box>
                        )}
                      </Box>
                    </Box>
                    {days.map((day) => {
                      const row = byKey.get(`${line.key}|${day}`);
                      return (
                        <Box key={day} sx={{ p: 0.5, borderLeft: `1px solid ${IOS.hairline}` }}>
                          <Cell
                            row={row}
                            color={color}
                            people={row ? peopleByCoverage.get(String(row._id)) || [] : []}
                            callOuts={row ? callOutsByCoverage.get(String(row._id)) || 0 : 0}
                            canEdit={canEdit}
                            isPast={day < today}
                            onOpen={() => setOpenRowId(row._id)}
                            onAdd={() =>
                              setAddFor({
                                date: day,
                                shiftType: line.shiftType,
                                shiftTag: line.shiftTag,
                                role: line.role,
                                unitArea: line.unitArea,
                              })
                            }
                          />
                        </Box>
                      );
                    })}
                  </Box>
                );
              })}
            </Box>
          ))}
        </Box>
      </Box>

      <SlotDrawer
        open={Boolean(openRow)}
        row={openRow}
        weekStart={weekStart}
        people={openRow ? peopleByCoverage.get(String(openRow._id)) || [] : []}
        canEdit={canEdit}
        onClose={() => setOpenRowId(null)}
        onChanged={onChanged}
        onCallOut={onCallOut}
      />

      <Dialog open={autoFillOpen} onClose={() => !autoFilling && setAutoFillOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: "16px" } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Auto-fill {fillableOpen} open slot{fillableOpen === 1 ? "" : "s"}?</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: IOS.secondary, lineHeight: 1.6 }}>
            We'll put the best available people on each open slot: right role, area and certifications, not on time off,
            no double-booking, and work shared out fairly.
          </Typography>
          <Typography sx={{ color: IOS.ink, lineHeight: 1.6, mt: 1.5, fontWeight: 600 }}>
            {isPublished
              ? "This week is already published, so each person added gets a text or email right away."
              : "They'll show as Not sent yet. Nobody is told until you publish the week, and you can change anyone first."}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAutoFillOpen(false)} disabled={autoFilling} sx={{ borderRadius: "10px" }}>
            Cancel
          </Button>
          <Button
            onClick={runAutoFill}
            disabled={autoFilling}
            startIcon={autoFilling ? <CircularProgress size={14} color="inherit" /> : <FiZap />}
            sx={{ borderRadius: "10px", px: 2, color: "#fff", bgcolor: IOS.blue, "&:hover": { bgcolor: "#0066DB" } }}
          >
            {autoFilling ? "Filling…" : "Auto-fill"}
          </Button>
        </DialogActions>
      </Dialog>

      <AddNeedDialog
        open={Boolean(addFor)}
        initial={addFor || {}}
        weekStart={weekStart}
        days={days}
        onClose={() => setAddFor(null)}
        onAdded={() => {
          setAddFor(null);
          onChanged?.();
        }}
      />
    </Box>
  );
}

function Tag({ color, children }) {
  return (
    <Box
      component="span"
      sx={{
        fontSize: 11,
        fontWeight: 600,
        lineHeight: "18px",
        px: 0.75,
        borderRadius: "6px",
        bgcolor: tint(color, 0.1),
        color: color === IOS.purple ? "#8944AB" : "#0062CC",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </Box>
  );
}

function Legend({ kind, label }) {
  const swatch =
    kind === "open"
      ? { border: `1px dashed ${tint(IOS.orange, 0.7)}`, bgcolor: tint(IOS.orange, 0.06) }
      : kind === "draft"
        ? { border: `1px dashed ${tint(IOS.blue, 0.6)}`, bgcolor: tint(IOS.blue, 0.08) }
        : { border: "1px solid transparent", bgcolor: tint(IOS.blue, 0.15) };
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
      <Box sx={{ width: 18, height: 12, borderRadius: "4px", ...swatch }} />
      <Typography sx={{ fontSize: 12, color: IOS.secondary }}>{label}</Typography>
    </Box>
  );
}
