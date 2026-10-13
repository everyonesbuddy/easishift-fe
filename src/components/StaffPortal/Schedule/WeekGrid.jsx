import { useMemo, useState } from "react";
import { Box, Button, Tooltip, Typography } from "@mui/material";
import { FiPlus } from "react-icons/fi";
import { useAuth } from "../../../context/AuthContext";
import { getRoleDisplayName } from "../../../constants/industryRoles";
import SlotDrawer from "./SlotDrawer";
import AddNeedDialog from "./AddNeedDialog";
import { GRID, slotLabel, titleCase } from "./weekGridUtils";

/**
 * The week, as needs vs people. Rows are shift + role (+ area), columns are
 * days. Each cell shows one pip per person needed, filled for each person
 * assigned. Click a cell to fill it, change that day's count or handle a
 * call-out.
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

function Pips({ needed, filled }) {
  const max = 8;
  const shown = Math.min(Math.max(needed, filled), max);
  const extra = Math.max(needed, filled) - shown;
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: "3px", alignItems: "center" }} aria-hidden>
      {Array.from({ length: shown }, (_, i) => {
        const isFilled = i < filled;
        const isOver = i >= needed;
        return (
          <Box
            key={i}
            sx={{
              width: 9,
              height: 9,
              borderRadius: "50%",
              bgcolor: isOver ? GRID.over : isFilled ? GRID.filled : "transparent",
              border: `1.5px solid ${isOver ? GRID.over : isFilled ? GRID.filled : GRID.short}`,
            }}
          />
        );
      })}
      {extra > 0 && (
        <Typography component="span" sx={{ fontSize: 10, color: GRID.muted, ml: 0.25 }}>
          +{extra}
        </Typography>
      )}
    </Box>
  );
}

function Cell({ row, people, callOuts, onOpen, onAdd, canEdit, isPast }) {
  if (!row) {
    return (
      <Box
        sx={{
          minHeight: 64,
          borderRadius: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          "& button": { opacity: 0 },
          "&:hover button, & button:focus-visible": { opacity: 1 },
        }}
      >
        {canEdit && !isPast && (
          <Tooltip title="Add a need on this day">
            <Button size="small" onClick={onAdd} sx={{ minWidth: 0, color: GRID.muted }} aria-label="Add a need on this day">
              <FiPlus />
            </Button>
          </Tooltip>
        )}
      </Box>
    );
  }
  const needed = row.requiredCount;
  const filled = row.assignedCount;
  const state = needed === 0 && filled === 0 ? "none" : filled >= needed ? (filled > needed ? "over" : "full") : "short";
  const tone =
    state === "short"
      ? { bg: GRID.shortBg, fg: GRID.short }
      : state === "none"
        ? { bg: "transparent", fg: GRID.muted }
        : { bg: GRID.filledBg, fg: state === "over" ? GRID.over : GRID.filled };
  const firstNames = people.map((p) => String(p.staffId?.name || "").split(" ")[0]).filter(Boolean);

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
        minHeight: 64,
        p: 1,
        borderRadius: 1.5,
        cursor: "pointer",
        bgcolor: tone.bg,
        border: `1px solid ${state === "short" ? "#FDE68A" : "transparent"}`,
        opacity: isPast ? 0.6 : 1,
        display: "flex",
        flexDirection: "column",
        gap: 0.5,
        transition: "box-shadow 120ms ease",
        "&:hover": { boxShadow: `0 0 0 2px ${tone.fg}33` },
        "&:focus-visible": { boxShadow: `0 0 0 2px ${tone.fg}` },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 0.5 }}>
        <Pips needed={needed} filled={filled} />
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: tone.fg, fontVariantNumeric: "tabular-nums" }}>
          {filled}/{needed}
        </Typography>
      </Box>
      <Typography sx={{ fontSize: 12, color: GRID.ink, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
        {firstNames.length ? firstNames.join(", ") : state === "short" ? "Open" : ""}
      </Typography>
      {callOuts > 0 && (
        <Typography sx={{ fontSize: 11, color: "#B91C1C", fontWeight: 600 }}>
          {callOuts} called out
        </Typography>
      )}
    </Box>
  );
}

export default function WeekGrid({ week, onChanged, onCallOut }) {
  const { facilityPreferences, can } = useAuth();
  const canEdit = can("schedule.manage");
  const [openRowId, setOpenRowId] = useState(null);
  const [addFor, setAddFor] = useState(null); // { date, shiftType, shiftTag, role, unitArea } | {}

  const data = week?.data;
  const weekStart = week?.weekStart;
  const days = data?.days || [];
  const today = todayKey();

  const { lines, byKey, peopleByCoverage, callOutsByCoverage } = useMemo(() => {
    const coverage = data?.coverage || [];
    const lineMap = new Map();
    const map = new Map();
    for (const row of coverage) {
      const lineKey = [row.shiftType, row.shiftTag, row.role, row.unitArea || ""].join("|");
      if (!lineMap.has(lineKey)) {
        const label = slotLabel(facilityPreferences, row.shiftType, row.shiftTag);
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
        a.label.start.localeCompare(b.label.start) ||
        a.shiftType.localeCompare(b.shiftType) ||
        a.role.localeCompare(b.role) ||
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
    const groupKey = `${line.shiftType}|${line.shiftTag}`;
    const last = groups[groups.length - 1];
    if (last && last.key === groupKey) last.lines.push(line);
    else groups.push({ key: groupKey, label: line.label, lines: [line] });
  }

  const columns = `minmax(170px, 1.1fr) repeat(${days.length || 7}, minmax(104px, 1fr))`;

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5, gap: 2, flexWrap: "wrap" }}>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <Legend color={GRID.filled} filled label="Filled" />
          <Legend color={GRID.short} label="Open" />
          <Legend color={GRID.over} filled label="Extra" />
        </Box>
        {canEdit && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<FiPlus />}
            onClick={() => setAddFor({})}
            sx={{ textTransform: "none", borderRadius: 2 }}
          >
            Add a one-off need
          </Button>
        )}
      </Box>

      <Box sx={{ overflowX: "auto", border: `1px solid ${GRID.line}`, borderRadius: 2, bgcolor: "#fff" }}>
        <Box sx={{ minWidth: 900 }}>
          {/* Day header */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: columns,
              borderBottom: `1px solid ${GRID.line}`,
              bgcolor: GRID.canvas,
              position: "sticky",
              top: 0,
              zIndex: 1,
            }}
          >
            <Box sx={{ p: 1.5 }} />
            {days.map((day, i) => {
              const date = keyToDate(day);
              const isToday = day === today;
              const t = dayTotals[i];
              const open = t.needed - t.filled;
              return (
                <Box key={day} sx={{ p: 1.25, borderLeft: `1px solid ${GRID.line}` }}>
                  <Typography sx={{ fontSize: 12, color: isToday ? "primary.main" : GRID.muted, fontWeight: 600 }}>
                    {date.toLocaleDateString(undefined, { weekday: "short" })}
                    {isToday ? ", today" : ""}
                  </Typography>
                  <Typography sx={{ fontSize: 18, fontWeight: 800, color: isToday ? "primary.main" : GRID.ink, lineHeight: 1.2 }}>
                    {date.getDate()}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: open > 0 ? GRID.short : GRID.filled, fontWeight: 600 }}>
                    {t.needed === 0 ? "No needs" : open > 0 ? `${open} open` : "All filled"}
                  </Typography>
                </Box>
              );
            })}
          </Box>

          {lines.length === 0 && (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <Typography sx={{ color: GRID.ink, fontWeight: 600 }}>No needs this week yet.</Typography>
              <Typography sx={{ color: GRID.muted }}>
                Set up Weekly Needs and every new week fills in on its own, or add a one-off need.
              </Typography>
            </Box>
          )}

          {groups.map((group) => (
            <Box key={group.key}>
              <Box sx={{ px: 1.5, pt: 1.5, pb: 0.5, display: "flex", gap: 1, alignItems: "baseline", borderTop: `1px solid ${GRID.line}` }}>
                <Typography sx={{ fontWeight: 800, color: GRID.ink, fontSize: 14 }}>{group.label.name}</Typography>
                <Typography sx={{ color: GRID.muted, fontSize: 13 }}>{group.label.time}</Typography>
              </Box>
              {group.lines.map((line) => (
                <Box key={line.key} sx={{ display: "grid", gridTemplateColumns: columns, alignItems: "stretch" }}>
                  <Box sx={{ px: 1.5, py: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <Typography sx={{ fontWeight: 600, color: GRID.ink, fontSize: 14 }}>
                      {getRoleDisplayName(line.role)}
                    </Typography>
                    {(line.unitArea || line.certs.size > 0) && (
                      <Typography sx={{ color: GRID.muted, fontSize: 12 }}>
                        {[line.unitArea && titleCase(line.unitArea), line.certs.size ? `needs ${[...line.certs].map(titleCase).join(", ")}` : null]
                          .filter(Boolean)
                          .join(", ")}
                      </Typography>
                    )}
                  </Box>
                  {days.map((day) => {
                    const row = byKey.get(`${line.key}|${day}`);
                    return (
                      <Box key={day} sx={{ p: 0.5, borderLeft: `1px solid ${GRID.line}` }}>
                        <Cell
                          row={row}
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
              ))}
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

function Legend({ color, filled, label }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
      <Box sx={{ width: 9, height: 9, borderRadius: "50%", border: `1.5px solid ${color}`, bgcolor: filled ? color : "transparent" }} />
      <Typography sx={{ fontSize: 12, color: GRID.muted }}>{label}</Typography>
    </Box>
  );
}
