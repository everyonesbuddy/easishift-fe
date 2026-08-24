import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { FiX } from "react-icons/fi";

export default function GuideVideoDialog({
  open,
  onClose,
  title,
  subtitle = "Select a guide to watch.",
  videos = [],
}) {
  const availableVideos = useMemo(
    () => videos.filter((video) => video?.embedUrl),
    [videos],
  );
  const [activeVideoId, setActiveVideoId] = useState(
    availableVideos[0]?.id || "",
  );

  useEffect(() => {
    if (open && availableVideos.length > 0) {
      setActiveVideoId(availableVideos[0].id);
    }
  }, [open, availableVideos]);

  const activeVideo =
    availableVideos.find((video) => video.id === activeVideoId) ||
    availableVideos[0];

  if (!activeVideo) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: { xs: 3, md: 4 },
          overflow: "hidden",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          pr: 1.5,
        }}
      >
        <Box>
          <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
            {title}
          </Typography>
          <Typography sx={{ color: "#64748b", fontSize: "0.9rem" }}>
            {subtitle}
          </Typography>
        </Box>
        <IconButton
          aria-label={`Close ${title}`}
          onClick={onClose}
          size="small"
        >
          <FiX />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ p: 2, borderTop: "1px solid #e5e7eb" }}>
          <ToggleButtonGroup
            exclusive
            value={activeVideoId}
            onChange={(_, nextVideoId) => {
              if (nextVideoId) setActiveVideoId(nextVideoId);
            }}
            size="small"
            sx={{
              mb: 1.5,
              flexWrap: "wrap",
              gap: 1,
              "& .MuiToggleButton-root": {
                border: "1px solid #cbd5e1",
                borderRadius: "8px !important",
                color: "#334155",
                fontWeight: 700,
                textTransform: "none",
              },
              "& .MuiToggleButton-root.Mui-selected": {
                bgcolor: "#2563EB",
                color: "#fff",
                "&:hover": { bgcolor: "#1D4ED8" },
              },
            }}
          >
            {availableVideos.map((video) => (
              <ToggleButton key={video.id} value={video.id}>
                {video.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          {activeVideo.description && (
            <Typography sx={{ color: "#475569", fontSize: "0.9rem" }}>
              {activeVideo.description}
            </Typography>
          )}
        </Box>

        {open && (
          <Box
            key={activeVideo.embedUrl}
            component="iframe"
            title={activeVideo.title}
            src={activeVideo.embedUrl}
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            sx={{
              display: "block",
              width: "100%",
              aspectRatio: "16 / 9",
              border: 0,
              bgcolor: "#020617",
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
