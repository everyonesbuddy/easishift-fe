import { Box, Chip, Typography } from "@mui/material";
import { IOS, tint } from "../../../theme/ios";

/**
 * "Everything" or "A section" (roles and/or unit areas) for Publish and
 * Auto-fill. Helpers live in sectionUtils.js.
 */
export default function SectionPicker({ value, onChange, options, allLabel = "Everything" }) {
  const toggle = (field, key) => {
    const list = value[field];
    onChange({ ...value, [field]: list.includes(key) ? list.filter((k) => k !== key) : [...list, key] });
  };

  const group = (title, field, list) =>
    list.length > 0 && (
      <Box sx={{ mt: 1.5 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 600, color: IOS.secondary, textTransform: "uppercase", letterSpacing: "0.05em", mb: 0.75 }}>
          {title}
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
          {list.map((o) => {
            const on = value[field].includes(o.key);
            return (
              <Chip
                key={o.key}
                label={o.label}
                onClick={() => toggle(field, o.key)}
                aria-pressed={on}
                sx={{
                  fontWeight: 600,
                  borderRadius: IOS.radius.round,
                  bgcolor: on ? IOS.blue : IOS.fill,
                  color: on ? "#fff" : IOS.ink,
                  "&:hover": { bgcolor: on ? "#0066DB" : tint(IOS.blue, 0.12) },
                }}
              />
            );
          })}
        </Box>
      </Box>
    );

  return (
    <Box>
      <Box role="tablist" aria-label="What to include" sx={{ display: "flex", p: "3px", borderRadius: "10px", bgcolor: IOS.fill }}>
        {[
          { mode: "all", label: allLabel },
          { mode: "section", label: "A section" },
        ].map((opt) => {
          const active = value.mode === opt.mode;
          return (
            <Box
              key={opt.mode}
              component="button"
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange({ ...value, mode: opt.mode })}
              sx={{
                all: "unset",
                flex: 1,
                textAlign: "center",
                cursor: "pointer",
                py: 0.75,
                borderRadius: "8px",
                fontSize: 14,
                fontWeight: 600,
                color: IOS.ink,
                bgcolor: active ? "#fff" : "transparent",
                boxShadow: active ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
              }}
            >
              {opt.label}
            </Box>
          );
        })}
      </Box>
      {value.mode === "section" && (
        <>
          {group("Roles", "roles", options.roles)}
          {group("Unit areas", "areas", options.areas)}
          <Typography sx={{ fontSize: 12, color: IOS.secondary, mt: 1.25 }}>
            Pick roles, areas or both. With both, only shifts that match both are included.
          </Typography>
        </>
      )}
    </Box>
  );
}
