import { Card, Typography, Box, Chip } from "@mui/material";
import { useNavigate } from "react-router-dom";

// Props:
// - title: string
// - value: number|string
// - subtitle: string (small text under the value)
// - icon: React node
// - to: optional route
// - layout: 'center' | 'side' (center for single-column style, side for icon+text row)
// - bgColor: background color for icon circle
// - badge: optional number or string to show as a small pill over the card
export default function StatCard({
  title,
  value,
  subtitle,
  to,
  icon,
  layout = "center",
  bgColor = "#e3f2fd",
  badge,
  // optional minWidth (e.g. '28ch' or '240px') to keep all cards equal width
  minWidth,
  sx,
}) {
  const navigate = useNavigate();
  const isClickable = Boolean(to);

  return (
    <Card
      onClick={isClickable ? () => navigate(to) : undefined}
      sx={{
        background: "white",
        borderRadius: 3,
        p: { xs: 1.5, sm: 2 },
        border: "1px solid #E2E8F0",
        position: "relative",
        minHeight: 132,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 1.25,
        width: "100%", // ensure card fills the Grid cell width
        maxWidth: "100%",
        boxSizing: "border-box",
        minWidth: minWidth || 0, // allow content to shrink unless minWidth provided
        alignSelf: "stretch",
        transition:
          "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
        cursor: isClickable ? "pointer" : "default",
        "&:hover": isClickable
          ? {
              transform: "translateY(-3px)",
              boxShadow: "0 10px 24px rgba(15, 23, 42, 0.12)",
              borderColor: "#BFDBFE",
            }
          : undefined,
        ...sx,
      }}
    >
      {badge ? (
        <Box sx={{ position: "absolute", top: 12, right: 12 }}>
          <Chip
            size="small"
            label={badge}
            sx={{
              bgcolor: "#FEF3C7",
              color: "#92400E",
              fontWeight: 700,
              fontSize: "0.68rem",
              border: "1px solid #FDE68A",
            }}
          />
        </Box>
      ) : null}

      <Typography
        variant="overline"
        sx={{
          color: "#64748B",
          letterSpacing: "0.05em",
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        {title}
      </Typography>

      {layout === "center" ? (
        <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
          <Box
            sx={{
              width: { xs: 42, sm: 48 },
              height: { xs: 42, sm: 48 },
              borderRadius: 2,
              backgroundColor: bgColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid rgba(15, 23, 42, 0.06)",
              svg: { width: { xs: 18, sm: 20 }, height: { xs: 18, sm: 20 } },
            }}
          >
            {icon}
          </Box>

          <Box mt={1} textAlign="center">
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                fontSize: { xs: "1.3rem", sm: "1.55rem" },
                color: "#0F172A",
              }}
            >
              {value}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "#475569",
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
              }}
            >
              {subtitle || title}
            </Typography>
          </Box>
        </Box>
      ) : (
        <Box display="flex" alignItems="center" gap={2}>
          <Box
            sx={{
              width: { xs: 42, sm: 48 },
              height: { xs: 42, sm: 48 },
              borderRadius: 2,
              backgroundColor: bgColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid rgba(15, 23, 42, 0.06)",
              svg: { width: { xs: 18, sm: 20 }, height: { xs: 18, sm: 20 } },
            }}
          >
            {icon}
          </Box>

          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#0F172A" }}>
              {value}
            </Typography>
            <Typography variant="body2" sx={{ color: "#475569" }}>
              {subtitle || title}
            </Typography>
          </Box>
        </Box>
      )}
    </Card>
  );
}
