import { Card, Typography, Button, Box, Badge } from "@mui/material";
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
}) {
  const navigate = useNavigate();

  // Use two distinct layouts to avoid flex shrink/grow inconsistencies.
  // Also enforce a minHeight so cards appear visually consistent.
  return (
    <Card
      sx={{
        background: "white",
        borderRadius: 2,
        p: 2,
        border: "1px solid rgba(0,0,0,0.04)",
        position: "relative",
        minHeight: 120,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%", // ensure card fills the Grid cell width
        maxWidth: "100%",
        boxSizing: "border-box",
        minWidth: minWidth || 0, // allow content to shrink unless minWidth provided
        alignSelf: "stretch",
      }}
    >
      {/* Badge positioned absolutely so it doesn't affect sizing */}
      {badge ? (
        <Box sx={{ position: "absolute", top: 12, right: 12 }}>
          <Badge badgeContent={badge} color="warning" />
        </Box>
      ) : null}

      {layout === "center" ? (
        <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 1.5,
              backgroundColor: bgColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {icon}
          </Box>

          <Box mt={1} textAlign="center">
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {value}
            </Typography>
            <Typography variant="body2" sx={{ color: "#666" }}>
              {subtitle || title}
            </Typography>
          </Box>
        </Box>
      ) : (
        <Box display="flex" alignItems="center" gap={2}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 1.5,
              backgroundColor: bgColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {icon}
          </Box>

          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {value}
            </Typography>
            <Typography variant="body2" sx={{ color: "#666" }}>
              {subtitle || title}
            </Typography>
          </Box>
        </Box>
      )}

      {to && (
        <Box mt={2}>
          <Button
            size="small"
            variant="contained"
            sx={{ textTransform: "none" }}
            onClick={() => navigate(to)}
          >
            View
          </Button>
        </Box>
      )}
    </Card>
  );
}
