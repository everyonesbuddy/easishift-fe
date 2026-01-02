import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Badge,
} from "@mui/material";
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
}) {
  const navigate = useNavigate();

  // center layout: icon above value
  // side layout: icon left, value/title on right
  return (
    <Card
      sx={{
        background: "white",
        borderRadius: 2,
        p: 2,
        border: "1px solid rgba(0,0,0,0.04)",
      }}
    >
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems={layout === "center" ? "center" : "flex-start"}
      >
        <Box
          display="flex"
          alignItems="center"
          gap={layout === "center" ? 0 : 2}
        >
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

          {layout === "side" && (
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {value}
              </Typography>
              <Typography variant="body2" sx={{ color: "#666" }}>
                {subtitle || title}
              </Typography>
            </Box>
          )}
        </Box>

        {layout === "center" && (
          <Box textAlign="center" width="100%">
            <Box mt={1}>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {value}
              </Typography>
              <Typography variant="body2" sx={{ color: "#666" }}>
                {subtitle || title}
              </Typography>
            </Box>
          </Box>
        )}

        {badge ? (
          <Box sx={{ ml: 1 }}>
            <Badge badgeContent={badge} color="warning" />
          </Box>
        ) : null}
      </Box>

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
