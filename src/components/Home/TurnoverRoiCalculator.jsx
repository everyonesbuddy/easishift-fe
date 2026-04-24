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

const NAVBAR_HEIGHT = 80;
const DEFAULTS = {
  employees: 50,
  hourlyWage: 22,
  weeklyHours: 40,
  turnoverRate: 65,
  vacancyDays: 30,
};

const RECRUITMENT_COST_PER_HIRE = 2000;
const MANAGER_HOURLY_RATE = 25;
const SCHEDULING_HOURS_PER_WEEK = 10;
const WEEKS_PER_YEAR = 52;
const PRODUCTIVITY_FACTOR = 0.5;
const EASISHIFT_SAVINGS_RATE = 0.28;
const BEEHIIV_MAGIC_LINK_TEMPLATE =
  "https://magic.beehiiv.com/v1/861bd1b1-f350-4ecc-a6fc-ab3e0eca93f6?email=<email>";

const formatMoney = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.max(0, value));

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const alignToStep = (value, step, min) => {
  if (!step || step <= 0) return value;
  const snapped = Math.round((value - min) / step) * step + min;
  return Number(snapped.toFixed(4));
};

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

export default function TurnoverRoiCalculator() {
  const [employees, setEmployees] = useState(DEFAULTS.employees);
  const [hourlyWage, setHourlyWage] = useState(DEFAULTS.hourlyWage);
  const [weeklyHours, setWeeklyHours] = useState(DEFAULTS.weeklyHours);
  const [turnoverRate, setTurnoverRate] = useState(DEFAULTS.turnoverRate);
  const [vacancyDays, setVacancyDays] = useState(DEFAULTS.vacancyDays);
  const [email, setEmail] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  const metrics = useMemo(() => {
    const annualTurnoverEvents = employees * (turnoverRate / 100);
    const vacancyWeeks = vacancyDays / 7;

    const recruitmentPerEvent = RECRUITMENT_COST_PER_HIRE;
    const onboardingPerEvent = hourlyWage * weeklyHours * 4;
    const overtimePerEvent = hourlyWage * 1.5 * weeklyHours * vacancyWeeks;
    const productivityPerEvent =
      hourlyWage * weeklyHours * 8 * PRODUCTIVITY_FACTOR;

    const costPerTurnoverEvent =
      recruitmentPerEvent +
      onboardingPerEvent +
      overtimePerEvent +
      productivityPerEvent;

    const recruitmentAnnual = recruitmentPerEvent * annualTurnoverEvents;
    const onboardingAnnual = onboardingPerEvent * annualTurnoverEvents;
    const overtimeAnnual = overtimePerEvent * annualTurnoverEvents;
    const productivityAnnual = productivityPerEvent * annualTurnoverEvents;

    const annualTurnoverCost =
      recruitmentAnnual +
      onboardingAnnual +
      overtimeAnnual +
      productivityAnnual;

    const schedulingAdminCost =
      MANAGER_HOURLY_RATE * SCHEDULING_HOURS_PER_WEEK * WEEKS_PER_YEAR;

    const totalCost = annualTurnoverCost + schedulingAdminCost;
    const projectedSavings = totalCost * EASISHIFT_SAVINGS_RATE;

    return {
      annualTurnoverEvents,
      costPerTurnoverEvent,
      annualTurnoverCost,
      schedulingAdminCost,
      totalCost,
      projectedSavings,
      drivers: [
        {
          label: `Recruitment (${Math.round(annualTurnoverEvents)} hires @ ${formatMoney(
            RECRUITMENT_COST_PER_HIRE,
          )})`,
          value: recruitmentAnnual,
        },
        { label: "Onboarding & training", value: onboardingAnnual },
        { label: "Overtime/agency fill", value: overtimeAnnual },
        { label: "Productivity loss", value: productivityAnnual },
        { label: "Scheduling admin time", value: schedulingAdminCost },
      ],
    };
  }, [employees, hourlyWage, weeklyHours, turnoverRate, vacancyDays]);

  const handleSendSummary = async () => {
    const trimmedEmail = email.trim();
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);

    if (!isValidEmail) {
      toast.error("Please enter a valid email address.");
      return;
    }

    const payload = {
      recipientEmail: trimmedEmail,
      source: "easishift.com/turnover-roi-calculator",
      calculatorType: "LTC turnover ROI calculator",
      inputs: {
        employees,
        hourlyWage,
        weeklyHours,
        turnoverRate,
        vacancyDays,
      },
      outputs: {
        annualTurnoverEvents: metrics.annualTurnoverEvents,
        costPerTurnoverEvent: metrics.costPerTurnoverEvent,
        annualTurnoverCost: metrics.annualTurnoverCost,
        schedulingAdminCost: metrics.schedulingAdminCost,
        totalCost: metrics.totalCost,
        projectedSavings: metrics.projectedSavings,
        savingsRate: EASISHIFT_SAVINGS_RATE,
      },
      costDrivers: metrics.drivers.map((driver) => ({
        label: driver.label,
        value: driver.value,
      })),
      meta: {
        sentAt: new Date().toISOString(),
      },
    };

    try {
      setSendingEmail(true);
      // Trigger Beehiiv capture as a real link click from user interaction.
      openBeehiivMagicLink(trimmedEmail);
      await api.post("/marketing/turnover-roi/email-summary", payload);

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

  return (
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
            sx={{ fontWeight: 950, letterSpacing: "-0.02em", lineHeight: 1.1 }}
          >
            LTC Turnover To ROI Calculator
          </Typography>
          <Typography
            sx={{ color: "text.secondary", mt: 0.8, fontSize: "1rem" }}
          >
            Estimate your annual turnover burden and see what Easishift can
            save.
          </Typography>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
            gap: 2,
            alignItems: "start",
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
              <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1.2 }}>
                Facility Inputs
              </Typography>
              <Stack spacing={1.25}>
                <InputWithSlider
                  label="Number of employees"
                  value={employees}
                  onChange={setEmployees}
                  min={10}
                  max={500}
                />
                <InputWithSlider
                  label="Average hourly wage"
                  value={hourlyWage}
                  onChange={setHourlyWage}
                  min={12}
                  max={60}
                  step={0.5}
                  adornment="$"
                />
                <InputWithSlider
                  label="Average hours per week"
                  value={weeklyHours}
                  onChange={setWeeklyHours}
                  min={20}
                  max={50}
                />
                <InputWithSlider
                  label="Annual turnover rate"
                  value={turnoverRate}
                  onChange={setTurnoverRate}
                  min={10}
                  max={100}
                  helper="Default: 65%"
                />
                <InputWithSlider
                  label="Average time to fill vacancy"
                  value={vacancyDays}
                  onChange={setVacancyDays}
                  min={7}
                  max={90}
                  helper="Default: 30 days"
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
              <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
                Live Annual Impact
              </Typography>

              <Stack spacing={0.95} sx={{ mt: 1.2 }}>
                <Box>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Cost per turnover event
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 950 }}>
                    {formatMoney(metrics.costPerTurnoverEvent)}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Annual turnover cost
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 950 }}>
                    {formatMoney(metrics.annualTurnoverCost)}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Scheduling admin cost
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 900 }}>
                    {formatMoney(metrics.schedulingAdminCost)}
                  </Typography>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Total annual cost
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 950 }}>
                    {formatMoney(metrics.totalCost)}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Projected savings with Easishift (28%)
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 950, color: "success.main" }}
                  >
                    {formatMoney(metrics.projectedSavings)}/yr
                  </Typography>
                </Box>
              </Stack>

              <Divider sx={{ my: 1.5 }} />

              <Box sx={{ display: "grid", gap: 0.55 }}>
                {metrics.drivers.map((driver) => (
                  <Box
                    key={driver.label}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 2,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary" }}
                    >
                      {driver.label}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>
                      {formatMoney(driver.value)}
                    </Typography>
                  </Box>
                ))}
              </Box>

              <Stack spacing={0.8} sx={{ mt: 1.5 }}>
                <TextField
                  label="Email these results"
                  placeholder="you@facility.com"
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
                  href="https://calendly.com/easishift-info/30min"
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ fontWeight: 900, textTransform: "none", py: 0.8 }}
                >
                  See how Easishift reduces this - book a 30 min call
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </Container>
    </Box>
  );
}
