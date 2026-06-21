import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  InputAdornment,
  Slider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { FiMail, FiPhoneCall } from "react-icons/fi";
import { toast } from "react-toastify";
import api from "../../config/api";
import Footer from "../Shared/Footer";

const NAVBAR_HEIGHT = 80;
const WEEKS_PER_YEAR = 52;
const MONTHS_PER_YEAR = 12;
const TEMP_PREMIUM_RATE = 0.35;
const SAVINGS_RATE = 0.24;
const BEEHIIV_MAGIC_LINK_TEMPLATE =
  "https://magic.beehiiv.com/v1/d46e492b-b716-407d-80d5-80ad8b9b4512?email=<email>";

const buildBeehiivMagicLink = (email) => {
  const encodedEmail = encodeURIComponent(email);
  return BEEHIIV_MAGIC_LINK_TEMPLATE.replace("<email>", encodedEmail).replace(
    "{{email}}",
    encodedEmail,
  );
};

const openBeehiivMagicLink = (email) => {
  const url = buildBeehiivMagicLink(email);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
};

const DEFAULTS = {
  employees: 120,
  hourlyWage: 20,
  overtimeCostPerWeek: 800,
  tempMonthlySpend: 6000,
  schedulingHoursPerWeek: 18,
};

const formatMoney = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.max(0, value));

const formatPercent = (value) => `${Math.round(value)}%`;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const alignToStep = (value, step, min) => {
  if (!step || step <= 0) return value;
  const snapped = Math.round((value - min) / step) * step + min;
  return Number(snapped.toFixed(4));
};

function InputWithSlider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  adornment,
  helper,
}) {
  const [draftValue, setDraftValue] = useState(String(value));

  useEffect(() => {
    setDraftValue(String(value));
  }, [value]);

  const commitDraft = () => {
    if (draftValue.trim() === "") {
      setDraftValue(String(value));
      return;
    }

    const parsed = Number(draftValue);
    if (Number.isNaN(parsed)) {
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
        border: "1px solid rgba(15, 23, 42, 0.08)",
        borderRadius: 3,
        p: 1.2,
        backgroundColor: "rgba(15, 23, 42, 0.01)",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 0.75,
          gap: 1,
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {label}
        </Typography>
        <TextField
          size="small"
          value={draftValue}
          onChange={(e) => {
            const next = e.target.value;
            if (next === "" || /^\d*\.?\d*$/.test(next)) {
              setDraftValue(next);
            }
          }}
          onBlur={commitDraft}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              commitDraft();
            }
          }}
          sx={{
            width: 120,
            "& .MuiInputBase-input": {
              textAlign: "right",
              fontWeight: 700,
              fontSize: "0.92rem",
              py: "8px",
            },
          }}
          inputProps={{ inputMode: "decimal" }}
          InputProps={{
            startAdornment: adornment ? (
              <InputAdornment position="start">{adornment}</InputAdornment>
            ) : null,
          }}
        />
      </Box>
      <Slider
        value={value}
        onChange={(_, next) => {
          const nextValue = Number(next);
          onChange(nextValue);
          setDraftValue(String(nextValue));
        }}
        min={min}
        max={max}
        step={step}
        valueLabelDisplay="auto"
        sx={{
          color: "primary.main",
          "& .MuiSlider-thumb": {
            width: 16,
            height: 16,
          },
        }}
      />
      {helper && (
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          {helper}
        </Typography>
      )}
    </Box>
  );
}

export default function CostLeakCalculator() {
  const [employees, setEmployees] = useState(DEFAULTS.employees);
  const [hourlyWage, setHourlyWage] = useState(DEFAULTS.hourlyWage);
  const [overtimeCostPerWeek, setOvertimeCostPerWeek] = useState(
    DEFAULTS.overtimeCostPerWeek,
  );
  const [tempMonthlySpend, setTempMonthlySpend] = useState(
    DEFAULTS.tempMonthlySpend,
  );
  const [schedulingHoursPerWeek, setSchedulingHoursPerWeek] = useState(
    DEFAULTS.schedulingHoursPerWeek,
  );
  const [email, setEmail] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  const handleSendSummary = async () => {
    const trimmedEmail = email.trim();
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);

    if (!isValidEmail) {
      toast.error("Please enter a valid email address.");
      return;
    }

    const payload = {
      recipientEmail: trimmedEmail,
      source: "wisershifts.com/cost-leak-calculator",
      calculatorType: "Labor cost leak estimator",
      inputs: {
        employees,
        hourlyWage,
        overtimeCostPerWeek,
        tempMonthlySpend,
        schedulingHoursPerWeek,
      },
      outputs: {
        overtimeCostLeak: metrics.overtimeCostLeak,
        temporaryPremiumLeak: metrics.temporaryPremiumLeak,
        schedulingCoordinationLeak: metrics.schedulingCoordinationLeak,
        totalAnnualLeak: metrics.totalAnnualLeak,
        projectedSavings: metrics.projectedSavings,
        savingsRate: SAVINGS_RATE,
      },
      meta: {
        sentAt: new Date().toISOString(),
      },
    };

    try {
      setSendingEmail(true);
      openBeehiivMagicLink(trimmedEmail);
      await api.post("/marketing/cost-leak/email-summary", payload);
      toast.success("Summary sent. Check your inbox.");
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        "Unable to send summary right now. Please try again.";
      toast.error(message);
    } finally {
      setSendingEmail(false);
    }
  };

  const metrics = useMemo(() => {
    const overtimeCostLeak = overtimeCostPerWeek * WEEKS_PER_YEAR;

    const temporaryPremiumLeak =
      tempMonthlySpend * MONTHS_PER_YEAR * TEMP_PREMIUM_RATE;

    const managerHourlyRate = Math.max(hourlyWage * 1.8, 28);
    const schedulingCoordinationLeak =
      schedulingHoursPerWeek * managerHourlyRate * WEEKS_PER_YEAR;

    const totalAnnualLeak =
      overtimeCostLeak + temporaryPremiumLeak + schedulingCoordinationLeak;

    const projectedSavings = totalAnnualLeak * SAVINGS_RATE;

    return {
      overtimeCostLeak,
      temporaryPremiumLeak,
      schedulingCoordinationLeak,
      totalAnnualLeak,
      projectedSavings,
    };
  }, [
    hourlyWage,
    overtimeCostPerWeek,
    schedulingHoursPerWeek,
    tempMonthlySpend,
  ]);

  return (
    <>
      <Box
        sx={{
          minHeight: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
          background:
            "radial-gradient(circle at 8% 8%, rgba(25,118,210,0.08) 0%, rgba(25,118,210,0.01) 28%, #fff 70%)",
          py: { xs: 3, md: 4 },
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ mb: 2.5, textAlign: { xs: "left", md: "center" } }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 950,
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
              }}
            >
              Cost Leak Calculator (Estimator)
            </Typography>
            <Typography sx={{ color: "text.secondary", mt: 0.8 }}>
              Estimate your annual labor cost leak in under 60 seconds. No
              spreadsheets. Just numbers you already know.
            </Typography>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
              gap: 2,
              alignItems: "stretch",
            }}
          >
            <Card
              variant="outlined"
              sx={{
                borderRadius: 4,
                boxShadow: "0 12px 32px rgba(15,23,42,0.08)",
              }}
            >
              <CardContent sx={{ p: { xs: 2, md: 2.2 } }}>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 900, mb: 1.2 }}
                >
                  Your Numbers
                </Typography>
                <Stack spacing={1.25}>
                  <InputWithSlider
                    label="Number of employees"
                    value={employees}
                    onChange={setEmployees}
                    min={10}
                    max={1500}
                  />
                  <InputWithSlider
                    label="Average hourly wage"
                    value={hourlyWage}
                    onChange={setHourlyWage}
                    min={10}
                    max={80}
                    step={0.5}
                    adornment="$"
                    helper="Approximate is fine — default $20/hr"
                  />
                  <InputWithSlider
                    label="Estimated overtime cost per week"
                    value={overtimeCostPerWeek}
                    onChange={setOvertimeCostPerWeek}
                    min={0}
                    max={50000}
                    step={50}
                    adornment="$"
                    helper="If unsure, estimate total weekly overtime payroll cost"
                  />
                  <InputWithSlider
                    label="Monthly spend on temporary / contract workers"
                    value={tempMonthlySpend}
                    onChange={setTempMonthlySpend}
                    min={0}
                    max={120000}
                    step={500}
                    adornment="$"
                  />
                  <InputWithSlider
                    label="Hours per week managers spend scheduling or filling shifts"
                    value={schedulingHoursPerWeek}
                    onChange={setSchedulingHoursPerWeek}
                    min={0}
                    max={120}
                    helper="Include time spent filling gaps, coordinating, and chasing coverage"
                  />
                </Stack>
              </CardContent>
            </Card>

            <Card
              sx={{
                borderRadius: 4,
                background:
                  "linear-gradient(155deg, rgba(25,118,210,0.07) 0%, rgba(25,118,210,0.01) 50%, #fff 100%)",
              }}
            >
              <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                <Typography
                  variant="overline"
                  sx={{ color: "text.secondary", letterSpacing: 1 }}
                >
                  Total Estimated Annual Labor Cost Leak
                </Typography>

                <Typography variant="h3" sx={{ fontWeight: 950, mt: 0.5 }}>
                  {formatMoney(metrics.totalAnnualLeak)}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: "text.secondary", mt: 0.5, mb: 2.5 }}
                >
                  This estimate is based on typical labor patterns for
                  organizations of similar size and structure.
                </Typography>

                <Divider />

                <Stack spacing={2} sx={{ mt: 2, mb: 2 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 2,
                    }}
                  >
                    <Box>
                      <Typography
                        variant="body2"
                        sx={{ color: "text.secondary" }}
                      >
                        Overtime Cost
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: "text.disabled" }}
                      >
                        Weekly overtime spend × 52 weeks
                      </Typography>
                    </Box>
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 900, whiteSpace: "nowrap" }}
                    >
                      {formatMoney(metrics.overtimeCostLeak)}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 2,
                    }}
                  >
                    <Box>
                      <Typography
                        variant="body2"
                        sx={{ color: "text.secondary" }}
                      >
                        Temporary Labor Cost Premium
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: "text.disabled" }}
                      >
                        Monthly temp spend × 12 × 35% agency markup premium
                      </Typography>
                    </Box>
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 900, whiteSpace: "nowrap" }}
                    >
                      {formatMoney(metrics.temporaryPremiumLeak)}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 2,
                    }}
                  >
                    <Box>
                      <Typography
                        variant="body2"
                        sx={{ color: "text.secondary" }}
                      >
                        Scheduling & Admin Time Cost
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: "text.disabled" }}
                      >
                        Scheduling hrs/wk × estimated manager rate × 52 weeks
                      </Typography>
                    </Box>
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 900, whiteSpace: "nowrap" }}
                    >
                      {formatMoney(metrics.schedulingCoordinationLeak)}
                    </Typography>
                  </Box>
                </Stack>

                <Divider />

                <Box sx={{ mt: 2, mb: 2.5 }}>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Projected savings with Wisershifts (
                    {formatPercent(SAVINGS_RATE * 100)})
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 950, color: "success.main", mt: 0.25 }}
                  >
                    {formatMoney(metrics.projectedSavings)}/yr
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.disabled" }}>
                    Total annual leak × 24% — based on typical reduction seen
                    with improved scheduling visibility
                  </Typography>
                </Box>

                <Divider sx={{ mb: 2 }} />

                <Stack spacing={0.8}>
                  <TextField
                    label="Email these results"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    size="small"
                    sx={{
                      "& .MuiInputBase-input": {
                        fontWeight: 600,
                      },
                    }}
                  />
                  <Button
                    onClick={handleSendSummary}
                    disabled={sendingEmail}
                    variant="outlined"
                    startIcon={<FiMail />}
                    sx={{ fontWeight: 800, textTransform: "none", py: 0.1 }}
                  >
                    {sendingEmail ? "Sending..." : "Email me this summary"}
                  </Button>
                  <Button
                    variant="contained"
                    size="medium"
                    startIcon={<FiPhoneCall />}
                    component="a"
                    href="https://calendly.com/wisershifts-info/30min"
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      fontWeight: 900,
                      textTransform: "none",
                      py: 0.8,
                      color: "#fff",
                      "&:hover": {
                        bgcolor: "primary.main",
                        boxShadow: "none",
                        color: "#fff",
                      },
                    }}
                  >
                    See how Wisershifts reduces this - book a 30 min call
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Box>
        </Container>
      </Box>
      <Footer />
    </>
  );
}
