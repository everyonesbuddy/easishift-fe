import { useEffect, useState } from "react";
import {
  Box,
  InputAdornment,
  Slider,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { FiInfo } from "react-icons/fi";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const alignToStep = (value, step, min) => {
  const snapped = Math.round((value - min) / step) * step + min;
  return Number(snapped.toFixed(4));
};

export default function CalculatorInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  adornment,
  endAdornment,
  helper,
  tooltip,
}) {
  const [draftValue, setDraftValue] = useState(String(value));

  useEffect(() => {
    setDraftValue(String(value));
  }, [value]);

  const commitDraft = () => {
    const parsed = Number(draftValue);

    if (draftValue.trim() === "" || Number.isNaN(parsed)) {
      setDraftValue(String(value));
      return;
    }

    const normalized = alignToStep(clamp(parsed, min, max), step, min);
    onChange(normalized);
    setDraftValue(String(normalized));
  };

  return (
    <Box
      sx={{
        borderBottom: "1px solid #E5E7EB",
        pb: 2,
        "&:last-of-type": { borderBottom: 0, pb: 0 },
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Typography
            variant="body2"
            sx={{ fontWeight: 800, color: "#1F2937" }}
          >
            {label}
          </Typography>
          {tooltip && (
            <Tooltip title={tooltip} arrow>
              <Box
                component="span"
                tabIndex={0}
                sx={{
                  display: "inline-flex",
                  color: "#64748B",
                  cursor: "help",
                }}
              >
                <FiInfo size={15} />
              </Box>
            </Tooltip>
          )}
        </Box>
        <TextField
          size="small"
          value={draftValue}
          onChange={(event) => {
            const nextValue = event.target.value;
            if (nextValue === "" || /^\d*\.?\d*$/.test(nextValue)) {
              setDraftValue(nextValue);
            }
          }}
          onBlur={commitDraft}
          onKeyDown={(event) => {
            if (event.key === "Enter") commitDraft();
          }}
          inputProps={{ inputMode: "decimal", "aria-label": label }}
          InputProps={{
            startAdornment: adornment ? (
              <InputAdornment position="start">{adornment}</InputAdornment>
            ) : null,
            endAdornment: endAdornment ? (
              <InputAdornment position="end">{endAdornment}</InputAdornment>
            ) : null,
          }}
          sx={{
            width: 118,
            "& .MuiInputBase-input": {
              textAlign: "right",
              fontWeight: 800,
              py: "8px",
            },
          }}
        />
      </Box>
      <Slider
        value={value}
        onChange={(_, nextValue) => onChange(Number(nextValue))}
        min={min}
        max={max}
        step={step}
        valueLabelDisplay="auto"
        aria-label={label}
        sx={{
          color: "#2563EB",
          mt: 0.75,
          mb: helper ? 0 : -0.5,
          "& .MuiSlider-thumb": { width: 17, height: 17 },
          "& .MuiSlider-rail": { opacity: 1, bgcolor: "#E2E8F0" },
        }}
      />
      {helper && (
        <Typography
          variant="caption"
          sx={{ color: "#64748B", lineHeight: 1.35 }}
        >
          {helper}
        </Typography>
      )}
    </Box>
  );
}
