import { useState } from "react";
import { Box, Button, IconButton, Tooltip, Typography } from "@mui/material";
import { FiPlus, FiX } from "react-icons/fi";
import { IOS, tint } from "../../../theme/ios";

// Building blocks for the Facility Preferences page, in the style of
// iOS Settings: grouped cards, rows with a label on the left and the
// control on the right, and tag lists you add to inline.

export function Section({ id, title, description, children, tone }) {
  return (
    <Box id={id} component="section" sx={{ scrollMarginTop: 88 }}>
      <Box sx={{ px: 0.5, mb: 1 }}>
        <Typography sx={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em", color: tone === "danger" ? IOS.redText : IOS.ink }}>
          {title}
        </Typography>
        {description && (
          <Typography sx={{ fontSize: 14, color: IOS.secondary, mt: 0.25, maxWidth: 620 }}>{description}</Typography>
        )}
      </Box>
      <Box
        sx={{
          bgcolor: IOS.surface,
          borderRadius: IOS.radius.card,
          border: `1px solid ${tone === "danger" ? tint(IOS.red, 0.25) : IOS.hairline}`,
          boxShadow: IOS.shadow,
          overflow: "hidden",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

/** One setting: label + help on the left, control on the right. */
export function Row({ label, help, children, stack = false, first = false }) {
  return (
    <Box
      sx={{
        px: { xs: 2, md: 2.5 },
        py: 1.75,
        borderTop: first ? "none" : `1px solid ${IOS.hairline}`,
        display: "flex",
        flexDirection: stack ? "column" : { xs: "column", sm: "row" },
        alignItems: stack ? "stretch" : { xs: "stretch", sm: "center" },
        justifyContent: "space-between",
        gap: stack ? 1.5 : { xs: 1.25, sm: 3 },
      }}
    >
      <Box sx={{ minWidth: 0, flex: stack ? "none" : 1 }}>
        <Typography sx={{ fontWeight: 600, color: IOS.ink, fontSize: 15 }}>{label}</Typography>
        {help && <Typography sx={{ fontSize: 13, color: IOS.secondary, mt: 0.25 }}>{help}</Typography>}
      </Box>
      <Box sx={{ flexShrink: 0, minWidth: 0, width: stack ? "100%" : { xs: "100%", sm: "auto" } }}>{children}</Box>
    </Box>
  );
}

const inputSx = {
  height: 36,
  boxSizing: "border-box",
  border: "none",
  outline: "none",
  borderRadius: "10px",
  bgcolor: IOS.canvas,
  px: 1.5,
  font: "inherit",
  fontSize: 14,
  color: IOS.ink,
  "&:hover": { bgcolor: "#EDEDF0" },
  "&:focus": { bgcolor: "#fff", boxShadow: `0 0 0 3px ${tint(IOS.blue, 0.25)}` },
  "&:disabled": { opacity: 0.5 },
};

/** Plain rounded text/number/time input. */
export function Field({ sx, ...props }) {
  return <Box component="input" {...props} sx={{ ...inputSx, ...sx }} />;
}

/**
 * Editable list of tags (roles, areas, certifications): chips with a
 * remove button, plus an inline "Add" field. `usage(value)` returns a short
 * note like "12 staff" shown on the chip.
 */
export function TagEditor({ items, onAdd, onRemove, placeholder, disabled, usage, color = IOS.blue, format, emptyText }) {
  const [text, setText] = useState("");
  const add = () => {
    const value = text.trim();
    if (!value) return;
    if (onAdd(value) !== false) setText("");
  };
  return (
    <Box sx={{ px: { xs: 2, md: 2.5 }, py: 2 }}>
      {items.length === 0 ? (
        <Typography sx={{ fontSize: 14, color: IOS.tertiary, mb: disabled ? 0 : 1.5 }}>{emptyText || "None yet."}</Typography>
      ) : (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: disabled ? 0 : 1.75 }}>
          {items.map((item) => {
            const note = usage?.(item);
            return (
              <Box
                key={item}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.75,
                  height: 32,
                  pl: 1.5,
                  pr: disabled ? 1.5 : 0.5,
                  borderRadius: IOS.radius.round,
                  bgcolor: tint(color, 0.1),
                  color: IOS.ink,
                }}
              >
                <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: color }} />
                <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{format ? format(item) : item}</Typography>
                {note && <Typography sx={{ fontSize: 12, color: IOS.secondary }}>{note}</Typography>}
                {!disabled && (
                  <Tooltip title="Remove">
                    <IconButton
                      size="small"
                      aria-label={`Remove ${format ? format(item) : item}`}
                      onClick={() => onRemove(item)}
                      sx={{ width: 24, height: 24, color: IOS.secondary, "&:hover": { color: IOS.red, bgcolor: tint(IOS.red, 0.1) } }}
                    >
                      <FiX size={13} />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            );
          })}
        </Box>
      )}
      {!disabled && (
        <Box sx={{ display: "flex", gap: 1, maxWidth: 460 }}>
          <Field
            value={text}
            placeholder={placeholder}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            aria-label={placeholder}
            sx={{ flex: 1, minWidth: 0 }}
          />
          <Button
            onClick={add}
            disabled={!text.trim()}
            startIcon={<FiPlus size={14} />}
            sx={{ borderRadius: "10px", px: 2, color: IOS.blue, bgcolor: tint(IOS.blue, 0.1), "&:hover": { bgcolor: tint(IOS.blue, 0.16) } }}
          >
            Add
          </Button>
        </Box>
      )}
    </Box>
  );
}

/** iOS-style switch built on a button, for compact rows. */
export function Toggle({ checked, onChange, disabled, label }) {
  return (
    <Box
      component="button"
      type="button"
      role="switch"
      aria-checked={Boolean(checked)}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      sx={{
        all: "unset",
        cursor: disabled ? "default" : "pointer",
        width: 51,
        height: 31,
        borderRadius: 999,
        bgcolor: checked ? IOS.green : "rgba(120,120,128,0.16)",
        position: "relative",
        transition: "background-color 160ms ease",
        opacity: disabled ? 0.5 : 1,
        flexShrink: 0,
        "&:focus-visible": { boxShadow: `0 0 0 3px ${tint(IOS.blue, 0.35)}` },
        "&::after": {
          content: '""',
          position: "absolute",
          top: 2,
          left: checked ? 22 : 2,
          width: 27,
          height: 27,
          borderRadius: "50%",
          bgcolor: "#fff",
          boxShadow: "0 3px 8px rgba(0,0,0,0.15), 0 1px 1px rgba(0,0,0,0.06)",
          transition: "left 160ms ease",
        },
      }}
    />
  );
}
