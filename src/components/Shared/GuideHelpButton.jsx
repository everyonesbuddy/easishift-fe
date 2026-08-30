import { Button } from "@mui/material";
import { FiCompass } from "react-icons/fi";
import { useGuideTour } from "../../context/GuideTourContext";

// Single entry point for a page/form: starts its interactive tour.
export default function GuideHelpButton({ tourId, tourSteps, sx }) {
  const { startTour } = useGuideTour();

  return (
    <Button
      size="small"
      variant="outlined"
      startIcon={<FiCompass size={15} />}
      onClick={() => startTour(tourId, tourSteps)}
      sx={{
        textTransform: "none",
        fontWeight: 700,
        borderRadius: 2,
        borderColor: "#cbd5e1",
        color: "#334155",
        bgcolor: "#f8fafc",
        "&:hover": {
          borderColor: "#2563EB",
          bgcolor: "#eff6ff",
          color: "#1D4ED8",
        },
        ...sx,
      }}
    >
      Take tour
    </Button>
  );
}
