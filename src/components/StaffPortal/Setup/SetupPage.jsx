import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../../config/api";
import { useAuth } from "../../../context/AuthContext";
import { trackEvent } from "../../../utils/analytics";
import StaffingTemplateEditor from "./StaffingTemplateEditor";
import { parseStaffLines } from "../../../utils/staffPaste";

const STEPS = ["Facility type", "Shifts and roles", "What a week needs", "Add staff"];

const pretty = (value) =>
  String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const roleKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

const errorMessage = (err) =>
  err?.response?.data?.message || err?.message || "Something went wrong";

export default function SetupPage() {
  const navigate = useNavigate();
  const { tenant, fetchFacilityPreferences, refreshSession } = useAuth();
  const [step, setStep] = useState(0);
  const [types, setTypes] = useState([]);
  const [facilityType, setFacilityType] = useState(tenant?.facilityType || "");
  const [prefs, setPrefs] = useState(null);
  const [rules, setRules] = useState([]);
  const [newRole, setNewRole] = useState("");
  const [staffText, setStaffText] = useState("");
  const [importResult, setImportResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/setup/facility-types")
      .then((res) => setTypes(res.data || []))
      .catch((err) => setError(errorMessage(err)));
  }, []);

  const run = async (fn) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (err) {
      console.error(err);
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  // Step 1 → apply the preset (roles, shift times, starting numbers).
  const applyFacilityType = () =>
    run(async () => {
      const res = await api.post("/setup/facility-type", { facilityType });
      setPrefs(res.data.facilityPreferences);
      setRules(res.data.staffingTemplate?.rules || []);
      trackEvent("setup_facility_type", { facilityType });
      setStep(1);
    });

  const updateSlot = (defIndex, slotIndex, key, value) =>
    setPrefs((prev) => ({
      ...prev,
      shiftTypeDefinitions: prev.shiftTypeDefinitions.map((def, d) =>
        d !== defIndex
          ? def
          : {
              ...def,
              timeSlots: def.timeSlots.map((slot, s) =>
                s !== slotIndex ? slot : { ...slot, [key]: value, label: null },
              ),
            },
      ),
    }));

  const addRole = () => {
    const key = roleKey(newRole);
    if (!key || prefs.roleFamilies.includes(key)) return;
    setPrefs((prev) => ({ ...prev, roleFamilies: [...prev.roleFamilies, key] }));
    setNewRole("");
  };

  const removeRole = (role) => {
    setPrefs((prev) => ({
      ...prev,
      roleFamilies: prev.roleFamilies.filter((r) => r !== role),
    }));
    setRules((prev) => prev.filter((rule) => rule.role !== role));
  };

  // Step 2 → save shift times and roles.
  const saveShiftsAndRoles = () =>
    run(async () => {
      const shiftTypeDefinitions = prefs.shiftTypeDefinitions.map((def) => ({
        key: def.key,
        label: def.label,
        timeSlots: def.timeSlots.map((slot) => ({
          tag: slot.tag,
          label: slot.label || null,
          startLocalTime: slot.startLocalTime,
          endLocalTime: slot.endLocalTime,
          spansOvernight: slot.endLocalTime <= slot.startLocalTime,
        })),
      }));
      const res = await api.post("/facility-preferences", {
        roleFamilies: prefs.roleFamilies,
        shiftTypes: shiftTypeDefinitions.map((def) => def.key),
        shiftTypeDefinitions,
      });
      setPrefs(res.data);
      await fetchFacilityPreferences?.();
      setStep(2);
    });

  // Step 3 → save the staffing template.
  const saveTemplate = () =>
    run(async () => {
      await api.put("/staffing-template", { rules });
      setStep(3);
    });

  // Step 4 → add staff, then finish.
  const addStaffAndFinish = () =>
    run(async () => {
      const rows = parseStaffLines(staffText, prefs?.roleFamilies?.[0]);
      if (rows.length) {
        const res = await api.post("/staff/bulk", { rows });
        setImportResult(res.data);
        const failed = (res.data.rows || []).filter((r) => r.status !== "created");
        if (failed.length) {
          // Leave them on this step to fix the lines that didn't work.
          setStaffText(
            failed
              .map((r) => rows[(r.rowNumber || 1) - 1])
              .filter(Boolean)
              .map((r) => [r.name, r.phone || r.email, r.role].filter(Boolean).join(", "))
              .join("\n"),
          );
          return;
        }
      }
      await finish();
    });

  const finish = async () => {
    await api.post("/setup/complete");
    await refreshSession?.();
    trackEvent("setup_complete");
    toast.success("You're set up. Assign shifts, then publish the week.");
    navigate("/schedule");
  };

  return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
        Set up {tenant?.name || "your facility"}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        About five minutes. You can change all of this later in settings.
      </Typography>

      <Stepper activeStep={step} alternativeLabel sx={{ mb: 4 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: 2 }}>
        {step === 0 && (
          <Stack spacing={2.5}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              What kind of facility is this?
            </Typography>
            <Typography color="text.secondary">
              We'll fill in typical roles, shift times and staffing numbers for you to adjust.
            </Typography>
            {!types.length && <CircularProgress size={24} />}
            <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
              {types.map((type) => (
                <Paper
                  key={type.key}
                  variant="outlined"
                  onClick={() => setFacilityType(type.key)}
                  role="radio"
                  aria-checked={facilityType === type.key}
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setFacilityType(type.key)}
                  sx={{
                    p: 2,
                    cursor: "pointer",
                    borderWidth: facilityType === type.key ? 2 : 1,
                    borderColor: facilityType === type.key ? "primary.main" : "divider",
                  }}
                >
                  <Typography sx={{ fontWeight: 700 }}>{type.label}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {type.roles?.length ? type.roles.map(pretty).join(", ") : "Set your own roles"}
                  </Typography>
                </Paper>
              ))}
            </Box>
            <Stack direction="row" sx={{ justifyContent: "flex-end" }}>
              <Button variant="contained" onClick={applyFacilityType} disabled={!facilityType || busy}>
                Continue
              </Button>
            </Stack>
          </Stack>
        )}

        {step === 1 && prefs && (
          <Stack spacing={3}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Shift times
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Times are in your facility's time zone ({prefs.facilityTimezone}).
              </Typography>
              <Stack spacing={1.5}>
                {prefs.shiftTypeDefinitions.map((def, d) =>
                  def.timeSlots.map((slot, s) => (
                    <Stack key={`${def.key}:${slot.tag}`} direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                      <Typography sx={{ width: 110, fontWeight: 600 }}>{def.label || pretty(def.key)}</Typography>
                      <TextField
                        type="time"
                        size="small"
                        label="Starts"
                        value={slot.startLocalTime}
                        onChange={(e) => updateSlot(d, s, "startLocalTime", e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                      />
                      <TextField
                        type="time"
                        size="small"
                        label="Ends"
                        value={slot.endLocalTime}
                        onChange={(e) => updateSlot(d, s, "endLocalTime", e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                      />
                      {slot.endLocalTime <= slot.startLocalTime && (
                        <Typography variant="body2" color="text.secondary">
                          ends next day
                        </Typography>
                      )}
                    </Stack>
                  )),
                )}
              </Stack>
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Roles you schedule
              </Typography>
              <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1, my: 1.5 }}>
                {prefs.roleFamilies.map((role) => (
                  <Chip key={role} label={pretty(role)} onDelete={() => removeRole(role)} />
                ))}
              </Stack>
              <Stack direction="row" spacing={1}>
                <TextField
                  size="small"
                  label="Add a role"
                  placeholder="e.g. Dietary aide"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addRole()}
                />
                <Button onClick={addRole} disabled={!newRole.trim()}>
                  Add
                </Button>
              </Stack>
            </Box>
            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Button onClick={() => setStep(0)}>Back</Button>
              <Button variant="contained" onClick={saveShiftsAndRoles} disabled={busy || !prefs.roleFamilies.length}>
                Continue
              </Button>
            </Stack>
          </Stack>
        )}

        {step === 2 && prefs && (
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                What does a normal week need?
              </Typography>
              <Typography color="text.secondary">
                Every new week starts from these numbers. You can change a single day on the schedule.
              </Typography>
            </Box>
            <StaffingTemplateEditor rules={rules} onChange={setRules} facilityPreferences={prefs} />
            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Button onClick={() => setStep(1)}>Back</Button>
              <Button variant="contained" onClick={saveTemplate} disabled={busy}>
                Continue
              </Button>
            </Stack>
          </Stack>
        )}

        {step === 3 && (
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Add your staff
              </Typography>
              <Typography color="text.secondary">
                One per line: name, phone or email, role. Staff don't need an app or a password —
                they'll get a personal link when you publish.
              </Typography>
            </Box>
            <TextField
              multiline
              minRows={6}
              placeholder={"Kim Tran, (555) 123-4567, CNA\nPat Lee, pat@example.com, LPN"}
              value={staffText}
              onChange={(e) => setStaffText(e.target.value)}
            />
            {importResult && (
              <Alert severity={importResult.failed || importResult.skipped ? "warning" : "success"}>
                Added {importResult.created} of {importResult.total}.{" "}
                {(importResult.rows || [])
                  .filter((r) => r.status !== "created")
                  .map((r) => `${r.name || `Line ${r.rowNumber}`}: ${r.reason}`)
                  .join(" · ")}
                {importResult.failed || importResult.skipped
                  ? " The lines left below need fixing."
                  : ""}
              </Alert>
            )}
            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Button onClick={() => setStep(2)}>Back</Button>
              <Stack direction="row" spacing={1}>
                <Button onClick={() => run(finish)} disabled={busy}>
                  Skip for now
                </Button>
                <Button variant="contained" onClick={addStaffAndFinish} disabled={busy}>
                  {staffText.trim() ? "Add staff and finish" : "Finish"}
                </Button>
              </Stack>
            </Stack>
          </Stack>
        )}
      </Paper>
    </Container>
  );
}
