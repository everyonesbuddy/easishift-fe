import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  FiArrowRight,
  FiClock,
  FiCopy,
  FiDownload,
  FiMail,
  FiMapPin,
} from "react-icons/fi";
import { Link as RouterLink } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../config/api";
import CalculatorInput from "./CalculatorInput";
import { downloadCalculatorPdf } from "./calculatorPdf";
import {
  copyCalculatorLink,
  formatMoney,
  formatNumber,
  openBeehiivCaptureOnce,
  readNumberParam,
  usePageMetadata,
  WEEKS_PER_YEAR,
} from "./calculatorUtils";
import Footer from "../Shared/Footer";

const NAVBAR_HEIGHT = 80;
const PAY_PERIODS_PER_YEAR = 26;

const DEFAULTS = {
  employees: 50,
  hourlyWage: 22,
  hoursPerWeek: 40,
  unverifiedMinutesPerShift: 12,
  shiftsPerWeek: 5,
  sharedDevicePercent: 50,
  adminHoursPerPayPeriod: 4,
  adminHourlyRate: 25,
};

export default function TimeClockAccuracyCalculator() {
  usePageMetadata(
    "Time Clock Accuracy Calculator | WiserShifts",
    "Estimate the annual cost of unverified time entries and manual timesheet corrections for your facility.",
  );

  const [companyName, setCompanyName] = useState("");
  const [employees, setEmployees] = useState(() =>
    readNumberParam("employees", DEFAULTS.employees, 1, 1500),
  );
  const [hourlyWage, setHourlyWage] = useState(() =>
    readNumberParam("wage", DEFAULTS.hourlyWage, 1, 200),
  );
  const [hoursPerWeek, setHoursPerWeek] = useState(() =>
    readNumberParam("hours", DEFAULTS.hoursPerWeek, 1, 100),
  );
  const [unverifiedMinutesPerShift, setUnverifiedMinutesPerShift] = useState(
    () => readNumberParam("minutes", DEFAULTS.unverifiedMinutesPerShift, 0, 60),
  );
  const [shiftsPerWeek, setShiftsPerWeek] = useState(() =>
    readNumberParam("shifts", DEFAULTS.shiftsPerWeek, 1, 14),
  );
  const [sharedDevicePercent, setSharedDevicePercent] = useState(() =>
    readNumberParam("shared", DEFAULTS.sharedDevicePercent, 0, 100),
  );
  const [adminHoursPerPayPeriod, setAdminHoursPerPayPeriod] = useState(() =>
    readNumberParam("adminHours", DEFAULTS.adminHoursPerPayPeriod, 0, 80),
  );
  const [adminHourlyRate, setAdminHourlyRate] = useState(() =>
    readNumberParam("adminRate", DEFAULTS.adminHourlyRate, 1, 200),
  );
  const [email, setEmail] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  const metrics = useMemo(() => {
    const exposureMultiplier = sharedDevicePercent / 50;
    const weeklyUnverifiedMinutes =
      unverifiedMinutesPerShift *
      shiftsPerWeek *
      employees *
      exposureMultiplier;
    const weeklyUnverifiedCost = (weeklyUnverifiedMinutes / 60) * hourlyWage;
    const annualUnverifiedCost = weeklyUnverifiedCost * WEEKS_PER_YEAR;
    const annualAdminCorrectionCost =
      adminHoursPerPayPeriod * adminHourlyRate * PAY_PERIODS_PER_YEAR;
    const annualUnverifiedHours =
      (weeklyUnverifiedMinutes * WEEKS_PER_YEAR) / 60;

    return {
      weeklyUnverifiedMinutes,
      annualUnverifiedHours,
      annualUnverifiedCost,
      annualAdminCorrectionCost,
      totalAnnualCost: annualUnverifiedCost + annualAdminCorrectionCost,
    };
  }, [
    adminHourlyRate,
    adminHoursPerPayPeriod,
    employees,
    hourlyWage,
    sharedDevicePercent,
    shiftsPerWeek,
    unverifiedMinutesPerShift,
  ]);

  const handleCopyLink = async () => {
    try {
      await copyCalculatorLink({
        company: companyName,
        employees,
        wage: hourlyWage,
        hours: hoursPerWeek,
        minutes: unverifiedMinutesPerShift,
        shifts: shiftsPerWeek,
        shared: sharedDevicePercent,
        adminHours: adminHoursPerPayPeriod,
        adminRate: adminHourlyRate,
      });
      toast.success("A link to these results was copied.");
    } catch {
      toast.error("Unable to copy the link. Please copy it from your browser.");
    }
  };

  const handleDownloadPdf = () => {
    downloadCalculatorPdf({
      calculatorTitle: "Time Clock Accuracy Summary",
      filePrefix: "time-clock-accuracy",
      companyName,
      costLabel: "Total annual unverified-time cost",
      totalCost: formatMoney(metrics.totalAnnualCost),
      potentialSavings: formatMoney(metrics.totalAnnualCost),
      reductionPercent: 100,
      inputs: [
        ["Employees", formatNumber(employees, 0)],
        ["Average hourly wage", `$${formatNumber(hourlyWage, 2)}/hr`],
        ["Average hours per week", `${formatNumber(hoursPerWeek, 1)} hours`],
        [
          "Unverified time per shift",
          `${formatNumber(unverifiedMinutesPerShift, 1)} minutes`,
        ],
        ["Shifts per week per employee", formatNumber(shiftsPerWeek, 1)],
        [
          "Shared or kiosk device use",
          `${formatNumber(sharedDevicePercent, 0)}%`,
        ],
        [
          "Payroll correction hours per pay period",
          `${formatNumber(adminHoursPerPayPeriod, 1)} hours`,
        ],
        [
          "Payroll admin hourly rate",
          `$${formatNumber(adminHourlyRate, 2)}/hr`,
        ],
      ],
      costs: [
        ["Unverified punch time", formatMoney(metrics.annualUnverifiedCost)],
        [
          "Manual timesheet correction time",
          formatMoney(metrics.annualAdminCorrectionCost),
        ],
        [
          "Estimated unverified time",
          `${formatNumber(metrics.annualUnverifiedHours)} hours/year`,
        ],
        ["Total annual cost", formatMoney(metrics.totalAnnualCost)],
      ],
      featureSummary:
        "Geofenced clock-in confirms that a punch happens on-site and flags entries outside the facility boundary for review, helping payroll reflect verified time instead of manual trust.",
      calculatorUrl: "https://calendly.com/wisershifts-info/30min",
    });
    toast.success("Your WiserShifts report was downloaded.");
  };

  const handleEmail = async () => {
    const trimmedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    try {
      setSendingEmail(true);
      openBeehiivCaptureOnce(trimmedEmail);
      await api.post("/marketing/time-clock-accuracy/email-summary", {
        recipientEmail: trimmedEmail,
        inputs: {
          companyName,
          employees,
          hourlyWage,
          hoursPerWeek,
          unverifiedMinutesPerShift,
          shiftsPerWeek,
          sharedDevicePercent,
          adminHoursPerPayPeriod,
          adminHourlyRate,
        },
        outputs: {
          annualUnverifiedCost: metrics.annualUnverifiedCost,
          annualAdminCorrectionCost: metrics.annualAdminCorrectionCost,
          annualUnverifiedHours: metrics.annualUnverifiedHours,
          totalAnnualCost: metrics.totalAnnualCost,
        },
      });
      toast.success("Summary sent. Check your inbox.");
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          "Unable to send summary right now. Please try again.",
      );
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <>
      <Box
        sx={{
          minHeight: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
          bgcolor: "#F8FAFC",
          pb: { xs: 5, md: 8 },
        }}
      >
        <Box
          sx={{
            bgcolor: "#102A2A",
            color: "#fff",
            pt: { xs: 5, md: 7 },
            pb: { xs: 12, md: 15 },
            backgroundImage:
              "linear-gradient(115deg, rgba(13,148,136,0.24), transparent 48%), radial-gradient(circle at 84% 15%, rgba(37,99,235,0.2), transparent 28%)",
          }}
        >
          <Container maxWidth="lg">
            <Typography
              sx={{
                color: "#99F6E4",
                fontWeight: 800,
                fontSize: "0.78rem",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
              }}
            >
              Time clock accuracy calculator
            </Typography>
            <Typography
              component="h1"
              sx={{
                maxWidth: 900,
                mt: 1.5,
                fontSize: { xs: "2.35rem", md: "3.75rem" },
                fontWeight: 900,
                lineHeight: 1.02,
              }}
            >
              What do unverified time entries cost your facility?
            </Typography>
            <Typography sx={{ maxWidth: 790, mt: 2, color: "#CCFBF1" }}>
              Estimate the annual cost of unverified punch time and manual
              timesheet correction without assuming anyone is acting in bad
              faith.
            </Typography>
          </Container>
        </Box>

        <Container maxWidth="lg" sx={{ mt: { xs: -7, md: -9 } }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "0.95fr 1.05fr" },
              gap: 2,
              alignItems: "start",
            }}
          >
            <Card
              sx={{
                borderRadius: 4,
                boxShadow: "0 18px 45px rgba(15,23,42,0.12)",
              }}
            >
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ mb: 2 }}
                >
                  <FiMapPin color="#0F766E" />
                  <Typography variant="h6" sx={{ fontWeight: 900 }}>
                    Your facility inputs
                  </Typography>
                </Stack>
                <Stack spacing={2}>
                  <TextField
                    label="Facility or company name"
                    placeholder="e.g. Crestview Senior Living"
                    value={companyName}
                    onChange={(event) => setCompanyName(event.target.value)}
                    fullWidth
                    size="small"
                    helperText="Used to personalize your PDF and email summary."
                  />
                  <CalculatorInput
                    label="Number of employees"
                    value={employees}
                    onChange={setEmployees}
                    min={1}
                    max={1500}
                  />
                  <CalculatorInput
                    label="Average hourly wage"
                    value={hourlyWage}
                    onChange={setHourlyWage}
                    min={1}
                    max={200}
                    adornment="$"
                  />
                  <CalculatorInput
                    label="Average hours per week"
                    value={hoursPerWeek}
                    onChange={setHoursPerWeek}
                    min={1}
                    max={100}
                    endAdornment="hrs"
                  />
                  <CalculatorInput
                    label="Unverified time per shift"
                    value={unverifiedMinutesPerShift}
                    onChange={setUnverifiedMinutesPerShift}
                    min={0}
                    max={60}
                    endAdornment="min"
                    tooltip="Early clock-ins, late clock-outs, or punches from outside the facility that go unreviewed."
                    helper="The 12-minute default is an editable estimate, not a claim about your team."
                  />
                  <CalculatorInput
                    label="Shifts worked per week, per employee"
                    value={shiftsPerWeek}
                    onChange={setShiftsPerWeek}
                    min={1}
                    max={14}
                  />
                  <CalculatorInput
                    label="Staff using shared or kiosk devices"
                    value={sharedDevicePercent}
                    onChange={setSharedDevicePercent}
                    min={0}
                    max={100}
                    endAdornment="%"
                    tooltip="Used to scale the unverified-time estimate as shared-device exposure changes."
                  />
                  <Divider />
                  <CalculatorInput
                    label="Payroll correction hours per pay period"
                    value={adminHoursPerPayPeriod}
                    onChange={setAdminHoursPerPayPeriod}
                    min={0}
                    max={80}
                    endAdornment="hrs"
                  />
                  <CalculatorInput
                    label="Payroll admin hourly rate"
                    value={adminHourlyRate}
                    onChange={setAdminHourlyRate}
                    min={1}
                    max={200}
                    adornment="$"
                  />
                </Stack>
              </CardContent>
            </Card>

            <Stack spacing={2}>
              <Card
                sx={{
                  borderRadius: 4,
                  bgcolor: "#fff",
                  boxShadow: "0 18px 45px rgba(15,23,42,0.12)",
                }}
              >
                <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
                  <Typography
                    sx={{
                      color: "#0F766E",
                      fontWeight: 900,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      fontSize: "0.75rem",
                    }}
                  >
                    Estimated annual cost of unverified time entries
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: { xs: "2.7rem", md: "4.2rem" },
                      fontWeight: 950,
                      color: "#111827",
                      lineHeight: 1,
                      mt: 1,
                    }}
                  >
                    {formatMoney(metrics.totalAnnualCost)}
                  </Typography>
                  <Typography sx={{ color: "text.secondary", mt: 1.25 }}>
                    Across {formatNumber(metrics.annualUnverifiedHours)} hours
                    of estimated unverified time per year.
                  </Typography>
                  <Stack spacing={1.25} sx={{ mt: 3 }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 2,
                      }}
                    >
                      <Typography color="text.secondary">
                        Unverified or unreviewed punch time
                      </Typography>
                      <Typography sx={{ fontWeight: 900 }}>
                        {formatMoney(metrics.annualUnverifiedCost)}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 2,
                      }}
                    >
                      <Typography color="text.secondary">
                        Manual timesheet correction time
                      </Typography>
                      <Typography sx={{ fontWeight: 900 }}>
                        {formatMoney(metrics.annualAdminCorrectionCost)}
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    sx={{ mt: 3 }}
                  >
                    <Button
                      onClick={handleCopyLink}
                      startIcon={<FiCopy />}
                      variant="outlined"
                      sx={{
                        borderRadius: 999,
                        textTransform: "none",
                        fontWeight: 800,
                      }}
                    >
                      Copy results link
                    </Button>
                    <Button
                      onClick={handleDownloadPdf}
                      startIcon={<FiDownload />}
                      variant="outlined"
                      sx={{
                        borderRadius: 999,
                        textTransform: "none",
                        fontWeight: 800,
                      }}
                    >
                      Download PDF
                    </Button>
                  </Stack>
                  <Box
                    sx={{
                      mt: 2,
                      p: 1.75,
                      border: "1px solid #D1FAE5",
                      bgcolor: "#F0FDFA",
                      borderRadius: 2,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ mb: 1.25, color: "#134E4A", fontWeight: 800 }}
                    >
                      Email a copy of this estimate
                    </Typography>
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: {
                          xs: "1fr",
                          sm: "minmax(0, 1fr) auto",
                        },
                        gap: 1,
                      }}
                    >
                      <TextField
                        label="Email address"
                        placeholder="you@facility.com"
                        size="small"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        sx={{ bgcolor: "#fff" }}
                      />
                      <Button
                        onClick={handleEmail}
                        disabled={sendingEmail}
                        variant="contained"
                        startIcon={<FiMail />}
                        sx={{ fontWeight: 800, textTransform: "none" }}
                      >
                        {sendingEmail ? "Sending..." : "Email results"}
                      </Button>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
              <Alert severity="info" icon={<FiClock />}>
                WiserShifts does not assume staff are dishonest. Geofenced
                clock-in confirms a punch happens on-site and flags entries
                outside that boundary for review, so payroll reflects verified
                time instead of manual trust.
              </Alert>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ px: 1 }}
              >
                These are estimates based on commonly cited time-tracking
                research and the inputs you provide. Actual impact depends on
                your current clock-in method and facility layout.
              </Typography>
              <Button
                component="a"
                href="https://calendly.com/wisershifts-info/30min"
                target="_blank"
                rel="noopener noreferrer"
                variant="contained"
                endIcon={<FiArrowRight />}
                sx={{
                  bgcolor: "#0F766E",
                  py: 1.15,
                  fontWeight: 900,
                  textTransform: "none",
                  "&:hover": { bgcolor: "#115E59" },
                }}
              >
                Book your free scheduling audit
              </Button>
              <Button
                component={RouterLink}
                to="/calculators"
                endIcon={<FiArrowRight />}
                sx={{
                  alignSelf: "flex-start",
                  textTransform: "none",
                  fontWeight: 800,
                }}
              >
                Explore other calculators
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>
      <Footer />
    </>
  );
}
