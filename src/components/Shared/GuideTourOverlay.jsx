import { useEffect, useLayoutEffect, useState } from "react";
import { Box, Button, Paper, Typography } from "@mui/material";
import { FiX } from "react-icons/fi";
import { useGuideTour } from "../../context/GuideTourContext";

const PADDING = 8;
const CARD_WIDTH = 320;
const CARD_GAP = 14;

// Finds the live DOM rect for the current step's data-guide-id target.
const useTargetRect = (targetId) => {
  const [rect, setRect] = useState(null);

  useLayoutEffect(() => {
    if (!targetId) {
      setRect(null);
      return undefined;
    }

    const measure = () => {
      const el = document.querySelector(`[data-guide-id="${targetId}"]`);
      if (!el) {
        setRect(null);
        return;
      }
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      setRect(el.getBoundingClientRect());
    };

    measure();
    const raf = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [targetId]);

  return rect;
};

export default function GuideTourOverlay() {
  const { activeTour, stepIndex, nextStep, prevStep, endTour } = useGuideTour();
  const step = activeTour?.steps?.[stepIndex] || null;
  const rect = useTargetRect(step?.target);

  useEffect(() => {
    if (!activeTour) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") endTour();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeTour, endTour]);

  if (!activeTour || !step) return null;

  const isLast = stepIndex === activeTour.steps.length - 1;
  const spotlight = rect
    ? {
        top: rect.top - PADDING,
        left: rect.left - PADDING,
        width: rect.width + PADDING * 2,
        height: rect.height + PADDING * 2,
      }
    : null;

  // Prefer placing the card below the target; flip above if it would overflow.
  const cardTop = spotlight
    ? spotlight.top + spotlight.height + CARD_GAP + 260 > window.innerHeight
      ? Math.max(12, spotlight.top - CARD_GAP - 220)
      : spotlight.top + spotlight.height + CARD_GAP
    : window.innerHeight / 2 - 100;
  const cardLeft = spotlight
    ? Math.min(
        Math.max(12, spotlight.left),
        window.innerWidth - CARD_WIDTH - 12,
      )
    : window.innerWidth / 2 - CARD_WIDTH / 2;

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        pointerEvents: "auto",
      }}
    >
      {spotlight ? (
        <Box
          sx={{
            position: "fixed",
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
            borderRadius: 2,
            boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.65)",
            transition: "all 200ms ease",
            pointerEvents: "none",
          }}
        />
      ) : (
        <Box
          sx={{
            position: "fixed",
            inset: 0,
            bgcolor: "rgba(15, 23, 42, 0.65)",
          }}
        />
      )}

      <Paper
        elevation={6}
        sx={{
          position: "fixed",
          top: cardTop,
          left: cardLeft,
          width: CARD_WIDTH,
          borderRadius: 3,
          p: 2.25,
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
          <Typography
            sx={{
              fontSize: "0.7rem",
              fontWeight: 700,
              color: "text.secondary",
            }}
          >
            Step {stepIndex + 1} of {activeTour.steps.length}
          </Typography>
          <FiX
            size={16}
            style={{ cursor: "pointer", color: "#64748b" }}
            onClick={endTour}
            aria-label="Close guide"
          />
        </Box>
        <Typography sx={{ fontWeight: 700, mb: 0.75 }}>{step.title}</Typography>
        <Typography
          sx={{ fontSize: "0.85rem", color: "text.secondary", mb: 2 }}
        >
          {step.body}
        </Typography>
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Button size="small" onClick={endTour} sx={{ textTransform: "none" }}>
            Skip tour
          </Button>
          <Box sx={{ display: "flex", gap: 1 }}>
            {stepIndex > 0 && (
              <Button
                size="small"
                onClick={prevStep}
                sx={{ textTransform: "none" }}
              >
                Back
              </Button>
            )}
            <Button
              size="small"
              variant="contained"
              onClick={nextStep}
              sx={{ textTransform: "none" }}
            >
              {isLast ? "Done" : "Next"}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
