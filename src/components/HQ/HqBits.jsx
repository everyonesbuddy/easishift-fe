import { Box, ButtonBase, Chip, Typography } from "@mui/material";
import { IOS, tint } from "../../theme/ios";
import { ROLE_COLORS, ROLE_SHORT, num, surface } from "./hqFormat";

export function Section({ title, note, right, children, sx }) {
  return (
    <Box sx={{ ...surface, p: { xs: 2, md: 2.5 }, minWidth: 0, ...sx }}>
      {(title || right) && (
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1.5, mb: note ? 0 : 1.5 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 17, letterSpacing: "-0.01em" }}>{title}</Typography>
          {right}
        </Box>
      )}
      {note && <Typography sx={{ color: IOS.secondary, fontSize: 13.5, mt: 0.25, mb: 1.5, maxWidth: 640 }}>{note}</Typography>}
      {children}
    </Box>
  );
}

export function Stat({ label, value, detail, tone, onClick }) {
  const Wrap = onClick ? ButtonBase : Box;
  return (
    <Wrap
      onClick={onClick}
      sx={{ display: "block", textAlign: "left", p: 1.75, borderRadius: IOS.radius.cell, bgcolor: IOS.canvas, minWidth: 0, width: "100%" }}
    >
      <Typography sx={{ color: IOS.secondary, fontSize: 12.5, fontWeight: 600 }}>{label}</Typography>
      <Typography sx={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", color: tone || IOS.ink, ...num }}>{value}</Typography>
      {detail && <Typography sx={{ fontSize: 12.5, color: IOS.secondary }} noWrap>{detail}</Typography>}
    </Wrap>
  );
}

export function RolePill({ role, size = "small" }) {
  if (!role) return null;
  const c = ROLE_COLORS[role] || ROLE_COLORS.other;
  return (
    <Chip
      size={size}
      label={ROLE_SHORT[role] || role}
      sx={{ height: 20, fontSize: 11.5, fontWeight: 700, bgcolor: tint(c, 0.12), color: c, borderRadius: IOS.radius.pill }}
    />
  );
}

export function Tag({ children, color = IOS.secondary }) {
  return (
    <Box
      component="span"
      sx={{ display: "inline-block", px: 0.9, py: 0.15, borderRadius: IOS.radius.pill, fontSize: 11.5, fontWeight: 700, bgcolor: tint(color, 0.12), color, whiteSpace: "nowrap" }}
    >
      {children}
    </Box>
  );
}

/** Real vs scanner clicks for one email address. */
export function ClickBadge({ signal }) {
  if (!signal) return <Typography component="span" sx={{ fontSize: 12.5, color: IOS.tertiary }}>No email data</Typography>;
  return (
    <Typography component="span" sx={{ fontSize: 12.5, color: IOS.secondary, ...num }}>
      <Box component="span" sx={{ color: signal.humanClicks ? IOS.blue : IOS.secondary, fontWeight: 700 }}>
        {signal.humanClicks} real click{signal.humanClicks === 1 ? "" : "s"}
      </Box>
      {signal.botClicks ? ` · ${signal.botClicks} scanner` : ""} · {signal.delivered} sent
    </Typography>
  );
}

export function Empty({ children }) {
  return <Typography sx={{ color: IOS.secondary, fontSize: 14, py: 2 }}>{children}</Typography>;
}

/** Shown in place of a section whose outside service has no keys yet. */
export function NotConnected({ what, env }) {
  return (
    <Box sx={{ p: 2, borderRadius: IOS.radius.cell, bgcolor: IOS.canvas, border: `1px dashed ${IOS.separator}` }}>
      <Typography sx={{ fontWeight: 700, fontSize: 14.5 }}>{what} isn't connected yet</Typography>
      <Typography sx={{ color: IOS.secondary, fontSize: 13, mt: 0.5 }}>
        Add {env.map((e, i) => (
          <Box key={e} component="span">
            {i ? (i === env.length - 1 ? " and " : ", ") : ""}
            <Box component="code" sx={{ fontSize: 12, bgcolor: IOS.fill, px: 0.5, borderRadius: "4px" }}>{e}</Box>
          </Box>
        ))} on the server (see Connections).
      </Typography>
    </Box>
  );
}
