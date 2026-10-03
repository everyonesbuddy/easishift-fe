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
import { trackEvent } from "../../utils/analytics";
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
  discrepancyMinutesPerShift: 12,
  shiftsPerWeek: 5,
  adminHoursPerPayPeriod: 4,
  adminHourlyRate: 25,
  payDisputesPerMonth: 3,
};

export default function TimeClockAccuracyCalculator() {
  usePageMetadata(
    "Payroll Accuracy Calculator | WiserShifts",
    "Estimate the cost of payroll discrepancies, manual corrections, and pay disputes for your facility.",
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
  const [discrepancyMinutesPerShift, setDiscrepancyMinutesPerShift] = useState(
    () => readNumberParam("minutes", DEFAULTS.discrepancyMinutesPerShift, 0, 60),
  );
  const [shiftsPerWeek, setShiftsPerWeek] = useState(() =>
    readNumberParam("shifts", DEFAULTS.shiftsPerWeek, 1, 14),
  );
  const [adminHoursPerPayPeriod, setAdminHoursPerPayPeriod] = useState(() =>
    readNumberParam("adminHours", DEFAULTS.adminHoursPerPayPeriod, 0, 80),
  );
  const [adminHourlyRate, setAdminHourlyRate] = useState(() =>
    readNumberParam("adminRate", DEFAULTS.adminHourlyRate, 1, 200),
  );
  const [payDisputesPerMonth, setPayDisputesPerMonth] = useState(() =>
    readNumberParam("disputes", DEFAULTS.payDisputesPerMonth, 0, 1000),
  );
  const [email, setEmail] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  const metrics = useMemo(() => {
    const weeklyDiscrepancyMinutes =
      discrepancyMinutesPerShift * shiftsPerWeek * employees;
    const weeklyDiscrepancyCost =
      (weeklyDiscrepancyMinutes / 60) * hourlyWage;
    const annualDiscrepancyCost = weeklyDiscrepancyCost * WEEKS_PER_YEAR;
    const annualAdminCorrectionCost =
      adminHoursPerPayPeriod * adminHourlyRate * PAY_PERIODS_PER_YEAR;
    const annualDisputes = payDisputesPerMonth * 12;

    return {
      weeklyDiscrepancyMinutes,
      annualDiscrepancyCost,
      annualAdminCorrectionCost,
      annualDisputes,
      totalAnnualCost: annualDiscrepancyCost + annualAdminCorrectionCost,
    };
  }, [
    adminHourlyRate,
    adminHoursPerPayPeriod,
    discrepancyMinutesPerShift,
    employees,
    hourlyWage,
    payDisputesPerMonth,
    shiftsPerWeek,
  ]);

  const handleCopyLink = async () => {
    try {
      await copyCalculatorLink({
        company: companyName,
        employees,
        wage: hourlyWage,
        hours: hoursPerWeek,
        minutes: discrepancyMinutesPerShift,
        shifts: shiftsPerWeek,
        adminHours: adminHoursPerPayPeriod,
        adminRate: adminHourlyRate,
        disputes: payDisputesPerMonth,
      });
      toast.success("A link to these results was copied.");
    } catch {
      toast.error("Unable to copy the link. Please copy it from your browser.");
    }
  };

  const handleDownloadPdf = () => {
    downloadCalculatorPdf({
      calculatorTitle: "Payroll Accuracy Summary",
      filePrefix: "payroll-accuracy",
      companyName,
      costLabel: "Estimated annual payroll discrepancy cost",
      totalCost: formatMoney(metrics.totalAnnualCost),
      potentialSavings: formatMoney(metrics.totalAnnualCost),
      reductionPercent: 100,
      inputs: [
        ["Employees", formatNumber(employees, 0)],
        ["Average hourly wage", `$${formatNumber(hourlyWage, 2)}/hr`],
        ["Average hours per week", `${formatNumber(hoursPerWeek, 1)} hours`],
        [
          "Clock-in/out discrepancy per shift",
          `${formatNumber(discrepancyMinutesPerShift, 1)} minutes`,
        ],
        ["Shifts per week per employee", formatNumber(shiftsPerWeek, 1)],
        [
          "Payroll resolution hours per pay period",
          `${formatNumber(adminHoursPerPayPeriod, 1)} hours`,
        ],
        [
          "Payroll admin hourly rate",
          `$${formatNumber(adminHourlyRate, 2)}/hr`,
        ],
        ["Pay disputes or corrections per month", formatNumber(payDisputesPerMonth, 0)],
      ],
      costs: [
        ["Time discrepancies", formatMoney(metrics.annualDiscrepancyCost)],
        [
          "Manual correction time",
          formatMoney(metrics.annualAdminCorrectionCost),
        ],
        ["Pay disputes per year", formatNumber(metrics.annualDisputes, 0)],
        ["Total annual cost", formatMoney(metrics.totalAnnualCost)],
      ],
      featureSummary:
        "Geofenced clock-in confirms when and where a shift started and ended, helping staff be paid accurately for time worked and giving payroll a clear record when a discrepancy needs review.",
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
      await api.post("/marketing/payroll-accuracy/email-summary", {
        recipientEmail: trimmedEmail,
        inputs: {
          companyName,
          employees,
          hourlyWage,
          hoursPerWeek,
          discrepancyMinutesPerShift,
          shiftsPerWeek,
          adminHoursPerPayPeriod,
          adminHourlyRate,
          payDisputesPerMonth,
        },
        outputs: {
          annualDiscrepancyCost: metrics.annualDiscrepancyCost,
          annualAdminCorrectionCost: metrics.annualAdminCorrectionCost,
          annualDisputes: metrics.annualDisputes,
          totalAnnualCost: metrics.totalAnnualCost,
        },
      });
      trackEvent("calculator_summary_requested", { calculator_type: "time_clock_accuracy" });
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
              Payroll accuracy calculator
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
              Is everyone getting paid accurately for the time they work?
            </Typography>
            <Typography sx={{ maxWidth: 790, mt: 2, color: "#CCFBF1" }}>
              Estimate the cost of time discrepancies, manual corrections, and
              pay disputes with clear, verified clock data for everyone.
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
                    label="Clock-in/out discrepancy per shift (minutes)"
                    value={discrepancyMinutesPerShift}
                    onChange={setDiscrepancyMinutesPerShift}
                    min={0}
                    max={60}
                    endAdornment="min"
                    tooltip="Gaps between scheduled and actual punch time that go unreviewed, not a claim about any individual."
                    helper="The 12-minute default is an editable estimate, not a claim about your team."
                  />
                  <CalculatorInput
                    label="Shifts worked per week, per employee"
                    value={shiftsPerWeek}
                    onChange={setShiftsPerWeek}
                    min={1}
                    max={14}
                  />
                  <Divider />
                  <CalculatorInput
                    label="Payroll hours resolving discrepancies per pay period"
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
                  <CalculatorInput
                    label="Pay disputes or corrections per month"
                    value={payDisputesPerMonth}
                    onChange={setPayDisputesPerMonth}
                    min={0}
                    max={1000}
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
                    Estimated annual cost of unresolved payroll discrepancies
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
                    Includes time discrepancies and manual payroll resolution.
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
                        Time discrepancies (pay not matching actual hours worked)
                      </Typography>
                      <Typography sx={{ fontWeight: 900 }}>
                        {formatMoney(metrics.annualDiscrepancyCost)}
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
                        Manual correction time
                      </Typography>
                      <Typography sx={{ fontWeight: 900 }}>
                        {formatMoney(metrics.annualAdminCorrectionCost)}
                      </Typography>
                    </Box>
                  </Stack>
                  <Typography
                    sx={{
                      mt: 2.5,
                      p: 1.75,
                      borderLeft: "3px solid #0F766E",
                      bgcolor: "#F0FDFA",
                      color: "#134E4A",
                    }}
                  >
                    An estimated {formatNumber(metrics.annualDisputes, 0)} pay
                    disputes a year could be avoided or resolved faster with
                    verified clock data.
                  </Typography>
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
                WiserShifts doesn&apos;t assume anyone&apos;s punching in wrong.
                Geofenced clock-in confirms exactly when and where a shift
                started and ended, so staff are paid accurately for the time
                they worked and payroll isn&apos;t left guessing when something
                looks off.
              </Alert>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ px: 1 }}
              >
                These are estimates based on the inputs above. Actual impact
                depends on your current clock-in method and payroll process.
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
