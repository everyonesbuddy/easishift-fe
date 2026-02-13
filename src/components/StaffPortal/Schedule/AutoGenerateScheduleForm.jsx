import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Stack,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import api from "../../../config/api";
import { toast } from "react-toastify";

const roles = ["doctor", "nurse", "receptionist", "billing", "staff", "other"];

export default function AutoGenerateScheduleForm({ onSuccess, onClose }) {
  const [coverages, setCoverages] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedRole, setSelectedRole] = useState(""); // optional role filter
  const [fetching, setFetching] = useState(false);

  // Fetch unfilled coverages when component mounts or role changes
  useEffect(() => {
    async function loadCoverages() {
      setFetching(true);
      try {
        const res = await api.get("/coverage/unfilled-auto", {
          params: selectedRole ? { role: selectedRole } : {},
        });

        // Filter out past coverages
        const now = new Date();
        const upcoming = (Array.isArray(res.data) ? res.data : []).filter(
          (cov) => new Date(cov.endTime) >= now,
        );

        setCoverages(upcoming);
        setSelectedIds([]);
      } catch (err) {
        console.error(err);
        setCoverages([]);
      } finally {
        setFetching(false);
      }
    }

    loadCoverages();
  }, [selectedRole]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleSubmit = async () => {
    if (!selectedIds.length) {
      setErrorMsg("Select at least one coverage.");
      return;
    }

    setErrorMsg("");
    setLoading(true);

    try {
      const res = await api.post("/schedules/auto-generate", {
        coverageIds: selectedIds,
      });

      toast.success(`Generated ${res.data.generatedCount} shifts.`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      onSuccess?.();
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || "Failed to auto-generate.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper
      sx={{
        p: { xs: 1.5, md: 3 },
        borderRadius: 2,
        backgroundColor: "rgba(255,255,255,0.02)",
        position: "relative",
      }}
      elevation={0}
    >
      {onClose && (
        <IconButton
          aria-label="Close"
          onClick={onClose}
          sx={{ position: "absolute", top: 8, right: 8 }}
        >
          <CloseIcon />
        </IconButton>
      )}
      <Typography
        variant="h6"
        sx={{ mb: 1.5, fontSize: { xs: "1rem", md: "1.25rem" } }}
      >
        Auto-Generate Schedule
      </Typography>

      <Typography
        variant="body2"
        sx={{
          mb: 1.5,
          color: "gray",
          fontSize: { xs: "0.8rem", md: "0.95rem" },
        }}
      >
        Select the role and the coverages you want to auto-schedule.
      </Typography>

      <Stack spacing={1.25}>
        {/* Role selection */}
        <FormControl fullWidth>
          <InputLabel>Role (optional)</InputLabel>
          <Select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            <MenuItem value="">All Roles</MenuItem>
            {roles.map((r) => (
              <MenuItem key={r} value={r}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {fetching ? (
          <Typography sx={{ color: "gray" }}>Loading coverages...</Typography>
        ) : coverages.length === 0 ? (
          <Typography sx={{ mb: 1.5, color: "gray" }}>
            No unfilled coverages available.
          </Typography>
        ) : (
          <Box
            sx={{
              maxHeight: { xs: "60vh", md: 320 },
              overflowY: "auto",
              pr: 0.5,
            }}
          >
            {coverages
              .slice()
              .sort((a, b) => {
                // Move items with remaining === 0 to the bottom
                const aZero = a.remaining === 0;
                const bZero = b.remaining === 0;
                if (aZero === bZero) return 0;
                return aZero ? 1 : -1;
              })
              .map((cov) => {
                const dateStr = new Date(cov.date).toLocaleDateString("en-US", {
                  timeZone: "UTC",
                });
                const startStr = new Date(cov.startTime).toLocaleTimeString(
                  [],
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                  },
                );
                const endStr = new Date(cov.endTime).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                const selected = selectedIds.includes(cov._id);
                const isZero = cov.remaining === 0;

                return (
                  <Paper
                    key={cov._id}
                    onClick={() => !isZero && toggleSelect(cov._id)}
                    elevation={selected ? 6 : 0}
                    sx={{
                      p: { xs: 0.75, md: 1 },
                      my: 0.5,
                      display: "flex",
                      flexDirection: { xs: "column", sm: "row" },
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: isZero ? "default" : "pointer",
                      borderRadius: 1,
                      backgroundColor: selected
                        ? "rgba(25,118,210,0.06)"
                        : isZero
                          ? "rgba(255,255,255,0.01)"
                          : "transparent",
                      border: "1px solid rgba(255,255,255,0.03)",
                      opacity: isZero ? 0.65 : 1,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        width: "100%",
                      }}
                    >
                      <Checkbox
                        size="small"
                        checked={selected}
                        onChange={() => toggleSelect(cov._id)}
                        onClick={(e) => e.stopPropagation()}
                        disabled={isZero}
                      />

                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          minWidth: 0,
                          mr: 1,
                        }}
                      >
                        <Typography
                          sx={{
                            fontWeight: 600,
                            fontSize: { xs: 12, md: 13 },
                            lineHeight: 1,
                          }}
                          noWrap
                        >
                          {dateStr} ·{" "}
                          {cov.role.charAt(0).toUpperCase() + cov.role.slice(1)}
                        </Typography>
                        <Typography
                          sx={{ fontSize: { xs: 12, md: 13 }, color: "gray" }}
                          noWrap
                        >
                          {startStr} — {endStr}
                          {cov.location ? ` · ${cov.location}` : ""}
                        </Typography>
                      </Box>
                    </Box>

                    <Box
                      sx={{
                        display: "flex",
                        gap: 2,
                        alignItems: "center",
                        mt: { xs: 1, sm: 0 },
                      }}
                    >
                      <Box sx={{ textAlign: "right" }}>
                        <Typography
                          variant="caption"
                          sx={{ color: "gray", display: "block" }}
                        >
                          Required
                        </Typography>
                        <Typography
                          sx={{ fontWeight: 700, fontSize: { xs: 13, md: 14 } }}
                        >
                          {cov.requiredCount}
                        </Typography>
                      </Box>

                      <Box sx={{ textAlign: "right" }}>
                        <Typography
                          variant="caption"
                          sx={{ color: "gray", display: "block" }}
                        >
                          Remaining
                        </Typography>
                        <Typography
                          sx={{
                            fontWeight: 700,
                            fontSize: { xs: 13, md: 14 },
                            color: isZero
                              ? "text.secondary"
                              : cov.remaining === 0
                                ? "error.main"
                                : "success.main",
                          }}
                        >
                          {cov.remaining}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                );
              })}
          </Box>
        )}

        {errorMsg && <Typography color="error">{errorMsg}</Typography>}

        <Button
          variant="contained"
          color="warning"
          fullWidth
          onClick={handleSubmit}
          disabled={loading || fetching}
        >
          {loading ? <CircularProgress size={22} /> : "Generate"}
        </Button>
      </Stack>
    </Paper>
  );
}
