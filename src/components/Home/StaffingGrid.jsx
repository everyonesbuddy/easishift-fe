import { Box, IconButton, TextField, Typography } from "@mui/material";
import { FiPlus, FiTrash2 } from "react-icons/fi";

const SHIFTS = ["Day", "Evening", "Night"];

const clampInt = (v, max = 99) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : 0;
};

/**
 * People on each shift by role, as a small table the visitor edits.
 * rows: [{ role, counts: [day, evening, night] }]
 */
export default function StaffingGrid({ rows, onChange }) {
  const set = (i, patch) => onChange(rows.map((r, j) => (i === j ? { ...r, ...patch } : r)));
  return (
    <Box>
      <Box sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) repeat(3, minmax(52px, 0.7fr)) 32px", gap: 1, alignItems: "center" }}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: "#667085" }}>Role</Typography>
        {SHIFTS.map((s) => (
          <Typography key={s} sx={{ fontSize: 12.5, fontWeight: 700, color: "#667085", textAlign: "center" }}>{s}</Typography>
        ))}
        <Box />
        {rows.map((r, i) => (
          <Box key={i} sx={{ display: "contents" }}>
            <TextField
              size="small"
              value={r.role}
              onChange={(e) => set(i, { role: e.target.value.slice(0, 30) })}
              inputProps={{ "aria-label": "Role" }}
            />
            {r.counts.map((c, k) => (
              <TextField
                key={k}
                size="small"
                type="number"
                value={c}
                onChange={(e) => set(i, { counts: r.counts.map((x, m) => (m === k ? clampInt(e.target.value) : x)) })}
                inputProps={{ min: 0, max: 99, "aria-label": `${r.role || "Role"}, ${SHIFTS[k]} shift`, style: { textAlign: "center" } }}
              />
            ))}
            <IconButton size="small" aria-label={`Remove ${r.role || "row"}`} onClick={() => onChange(rows.filter((_, j) => j !== i))} disabled={rows.length <= 1}>
              <FiTrash2 size={15} />
            </IconButton>
          </Box>
        ))}
      </Box>
      <Box
        component="button"
        type="button"
        onClick={() => onChange([...rows, { role: "", counts: [0, 0, 0] }])}
        sx={{ mt: 1.25, display: "inline-flex", alignItems: "center", gap: 0.75, border: 0, bgcolor: "transparent", color: "#2563EB", fontWeight: 700, fontSize: 14, cursor: "pointer", p: 0, fontFamily: "inherit" }}
      >
        <FiPlus size={15} /> Add a role
      </Box>
    </Box>
  );
}
