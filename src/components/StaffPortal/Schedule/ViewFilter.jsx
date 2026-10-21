import { useState } from "react";
import { Box, Button, Chip, Popover, Typography } from "@mui/material";
import { FiChevronDown, FiFilter, FiX } from "react-icons/fi";
import { IOS, tint } from "../../../theme/ios";
import { filterActive, filterAsSection, sectionLabel } from "./sectionUtils";

/**
 * "Show only" picker for roles and unit areas. The choice is saved on the
 * scheduler's account (see useViewFilter), so each scheduler sees their part.
 * value: { roles: [], areas: [] }; options: { roles: [{key,label}], areas }
 */
export default function ViewFilter({ value, onChange, options, shownText }) {
  const [anchor, setAnchor] = useState(null);
  const active = filterActive(value);
  if (!options.roles.length && !options.areas.length) return null;

  const toggle = (field, key) => {
    const list = value[field] || [];
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
            const on = (value[field] || []).includes(o.key);
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

  const label = active ? sectionLabel(filterAsSection(value), options) : "All roles and areas";

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
      <Button
        size="small"
        onClick={(e) => setAnchor(e.currentTarget)}
        startIcon={<FiFilter />}
        endIcon={<FiChevronDown />}
        aria-haspopup="dialog"
        sx={{
          borderRadius: "10px",
          px: 1.5,
          maxWidth: 420,
          fontWeight: 600,
          color: active ? IOS.blue : IOS.ink,
          bgcolor: active ? tint(IOS.blue, 0.1) : IOS.fill,
          "&:hover": { bgcolor: active ? tint(IOS.blue, 0.16) : "rgba(118,118,128,0.2)" },
          "& .MuiButton-startIcon, & .MuiButton-endIcon": { flexShrink: 0 },
        }}
      >
        <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {active ? `Showing: ${label}` : "Show: all roles and areas"}
        </Box>
      </Button>
      {active && (
        <Button
          size="small"
          startIcon={<FiX />}
          onClick={() => onChange({ roles: [], areas: [] })}
          sx={{ borderRadius: "10px", color: IOS.secondary, minWidth: 0 }}
        >
          Clear
        </Button>
      )}
      {active && shownText && <Typography sx={{ fontSize: 12, color: IOS.secondary }}>{shownText}</Typography>}

      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{ paper: { sx: { borderRadius: "14px", p: 2, mt: 0.75, width: 360, maxWidth: "calc(100vw - 32px)", boxShadow: IOS.shadowRaised } } }}
      >
        <Typography sx={{ fontWeight: 700, color: IOS.ink }}>Show only</Typography>
        <Typography sx={{ fontSize: 13, color: IOS.secondary, mt: 0.25 }}>
          Pick the roles and areas you schedule. Nothing picked shows everything. Saved for you on the website and the app.
        </Typography>
        {group("Roles", "roles", options.roles)}
        {group("Unit areas", "areas", options.areas)}
        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
          <Button size="small" disabled={!active} onClick={() => onChange({ roles: [], areas: [] })} sx={{ borderRadius: "10px" }}>
            Show everything
          </Button>
          <Button size="small" variant="contained" disableElevation onClick={() => setAnchor(null)} sx={{ borderRadius: "10px", bgcolor: IOS.blue }}>
            Done
          </Button>
        </Box>
      </Popover>
    </Box>
  );
}
