import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { FiArrowRight, FiCopy, FiMail } from "react-icons/fi";
import { Link as RouterLink } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../config/api";
import CalculatorInput from "./CalculatorInput";
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

const DEFAULTS = {
  employees: 50,
  hourlyWage: 22,
  callOutsPerWeek: 5,
  shiftLength: 8,
  fillDelayHours: 4,
  overtimePercent: 60,
  agencyPercent: 30,
  unfilledPercent: 10,
  overtimeMultiplier: 1.5,
  agencyRate: 75,
  managerMinutes: 30,
  managerHourlyRate: 25,
};

const INITIAL_COVERAGE = (() => {
  const coverage = {
    overtimePercent: readNumberParam("ot", DEFAULTS.overtimePercent, 0, 100),
    agencyPercent: readNumberParam("agency", DEFAULTS.agencyPercent, 0, 100),
    unfilledPercent: readNumberParam(
      "unfilled",
      DEFAULTS.unfilledPercent,
      0,
      100,
    ),
  };

  return Object.values(coverage).reduce((sum, value) => sum + value, 0) === 100
    ? coverage
    : {
        overtimePercent: DEFAULTS.overtimePercent,
        agencyPercent: DEFAULTS.agencyPercent,
        unfilledPercent: DEFAULTS.unfilledPercent,
      };
})();

export default function CallOutCostCalculator() {
  usePageMetadata(
    "Call-Out Cost Calculator: What Employee Call-Outs Are Really Costing You | WiserShifts",
    "Estimate what call-outs and last-minute shift coverage are actually costing your facility in overtime and agency spend.",
  );

  const [employees, setEmployees] = useState(() =>
    readNumberParam("employees", DEFAULTS.employees, 10, 1500),
  );
  const [hourlyWage, setHourlyWage] = useState(() =>
    readNumberParam("wage", DEFAULTS.hourlyWage, 10, 100),
  );
  const [callOutsPerWeek, setCallOutsPerWeek] = useState(() =>
    readNumberParam("callouts", DEFAULTS.callOutsPerWeek, 0, 100),
  );
  const [shiftLength, setShiftLength] = useState(() =>
    readNumberParam("shift", DEFAULTS.shiftLength, 1, 24),
  );
  const [fillDelayHours, setFillDelayHours] = useState(() =>
    readNumberParam("delay", DEFAULTS.fillDelayHours, 0, 24),
  );
  const [coverage, setCoverage] = useState(INITIAL_COVERAGE);
  const [overtimeMultiplier, setOvertimeMultiplier] = useState(() =>
    readNumberParam("otRate", DEFAULTS.overtimeMultiplier, 1, 3),
  );
  const [agencyRate, setAgencyRate] = useState(() =>
    readNumberParam("agencyRate", DEFAULTS.agencyRate, 20, 250),
  );
  const [managerMinutes, setManagerMinutes] = useState(() =>
    readNumberParam("managerMinutes", DEFAULTS.managerMinutes, 0, 180),
  );
  const [managerHourlyRate, setManagerHourlyRate] = useState(() =>
    readNumberParam("managerRate", DEFAULTS.managerHourlyRate, 10, 150),
  );
  const [email, setEmail] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  const balanceCoverage = (changedKey, nextValue) => {
    const otherKeys = Object.keys(coverage).filter((key) => key !== changedKey);
    const remaining = 100 - nextValue;
    const currentOtherTotal = otherKeys.reduce(
      (sum, key) => sum + coverage[key],
      0,
    );
    const firstValue =
      currentOtherTotal === 0
        ? Math.round(remaining / 2)
        : Math.round((remaining * coverage[otherKeys[0]]) / currentOtherTotal);

    setCoverage({
      ...coverage,
      [changedKey]: nextValue,
      [otherKeys[0]]: firstValue,
      [otherKeys[1]]: remaining - firstValue,
    });
  };

  const metrics = useMemo(() => {
    const weeklyCallOutHours = callOutsPerWeek * shiftLength;
    const weeklyOvertimeCost =
      weeklyCallOutHours *
      (coverage.overtimePercent / 100) *
      (hourlyWage * overtimeMultiplier);
    const weeklyAgencyCost =
      weeklyCallOutHours * (coverage.agencyPercent / 100) * agencyRate;
    const weeklyManagerTimeCost =
      (managerMinutes / 60) * callOutsPerWeek * managerHourlyRate;
    const annualOvertimeCost = weeklyOvertimeCost * WEEKS_PER_YEAR;
    const annualAgencyCost = weeklyAgencyCost * WEEKS_PER_YEAR;
    const annualManagerTimeCost = weeklyManagerTimeCost * WEEKS_PER_YEAR;

    return {
      annualOvertimeCost,
      annualAgencyCost,
      annualManagerTimeCost,
      totalAnnualCost:
        annualOvertimeCost + annualAgencyCost + annualManagerTimeCost,
      annualUnfilledShiftCount:
        callOutsPerWeek * (coverage.unfilledPercent / 100) * WEEKS_PER_YEAR,
    };
  }, [
    agencyRate,
    callOutsPerWeek,
    coverage,
    hourlyWage,
    managerHourlyRate,
    managerMinutes,
    overtimeMultiplier,
    shiftLength,
  ]);

  const breakdown = [
    {
      label: "Overtime cost",
      value: metrics.annualOvertimeCost,
      color: "#2563EB",
    },
    { label: "Agency cost", value: metrics.annualAgencyCost, color: "#EA580C" },
    {
      label: "Manager coordination time",
      value: metrics.annualManagerTimeCost,
      color: "#0F766E",
    },
  ];
  const highestCost = Math.max(...breakdown.map((item) => item.value), 1);

  const handleCopyLink = async () => {
    try {
      await copyCalculatorLink({
        employees,
        wage: hourlyWage,
        callouts: callOutsPerWeek,
        shift: shiftLength,
        delay: fillDelayHours,
        ot: coverage.overtimePercent,
        agency: coverage.agencyPercent,
        unfilled: coverage.unfilledPercent,
        otRate: overtimeMultiplier,
        agencyRate,
        managerMinutes,
        managerRate: managerHourlyRate,
      });
      toast.success("A link to these results was copied.");
    } catch {
      toast.error("Unable to copy the link. Please copy it from your browser.");
    }
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
      await api.post("/marketing/call-out-cost/email-summary", {
        recipientEmail: trimmedEmail,
        inputs: {
          employees,
          hourlyWage,
          callOutsPerWeek,
          shiftLength,
          fillDelayHours,
          overtimePercent: coverage.overtimePercent,
          agencyPercent: coverage.agencyPercent,
          unfilledPercent: coverage.unfilledPercent,
          overtimeMultiplier,
          agencyRate,
          managerMinutes,
          managerHourlyRate,
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
        sx={{ bgcolor: "#F8FAFC", minHeight: "100vh", pb: { xs: 5, md: 8 } }}
      >
        <Box
          sx={{
            bgcolor: "#0F172A",
            color: "#fff",
            pt: { xs: 5, md: 7 },
            pb: { xs: 12, md: 15 },
            backgroundImage:
              "linear-gradient(115deg, rgba(37,99,235,0.2), transparent 45%), radial-gradient(circle at 85% 20%, rgba(14,116,144,0.24), transparent 28%)",
          }}
        >
          <Container maxWidth="lg">
            <Typography
              sx={{
                color: "#93C5FD",
                fontWeight: 800,
                fontSize: "0.78rem",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
              }}
            >
              Call-out cost calculator
            </Typography>
            <Typography
              component="h1"
              sx={{
                maxWidth: 820,
                mt: 1.5,
                fontSize: { xs: "2.35rem", md: "3.75rem" },
                fontWeight: 900,
                lineHeight: 1.02,
              }}
            >
              What Are Your Call-Outs Actually Costing You?
            </Typography>
            <Typography
              sx={{
                maxWidth: 780,
                mt: 2,
                color: "#CBD5E1",
                fontSize: { xs: "1rem", md: "1.1rem" },
                lineHeight: 1.7,
              }}
            >
              Every call-out sets off the same scramble: a manager working
              through a phone list, hoping someone picks up before it turns into
              overtime or an agency call. This calculator estimates what that
              scramble is costing you every year, based on how often it happens
              and how long it takes to close the gap.
            </Typography>
            <Typography
              sx={{
                maxWidth: 860,
                mt: 2.5,
                pl: 2,
                borderLeft: "3px solid #38BDF8",
                color: "#E0F2FE",
                fontWeight: 750,
                lineHeight: 1.55,
              }}
            >
              WiserShifts does not prevent call-outs. It puts the open shift in
              front of available staff immediately, helping managers cover the
              gap internally before it becomes overtime, agency spend, or an
              uncovered shift.
            </Typography>
          </Container>
        </Box>

        <Container maxWidth="lg" sx={{ mt: { xs: -8, md: -10 } }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                lg: "minmax(0, 0.9fr) minmax(0, 1.1fr)",
              },
              gap: 3,
              alignItems: "start",
            }}
          >
            <Card
              variant="outlined"
              sx={{
                borderRadius: 2,
                borderColor: "#E2E8F0",
                boxShadow: "0 18px 45px rgba(15,23,42,0.1)",
              }}
            >
              <CardContent
                sx={{
                  p: { xs: 2.5, md: 3.5 },
                  "&:last-child": { pb: { xs: 2.5, md: 3.5 } },
                }}
              >
                <Typography
                  component="h2"
                  variant="h6"
                  sx={{ fontWeight: 900, mb: 0.5 }}
                >
                  Your coverage reality
                </Typography>
                <Typography variant="body2" sx={{ color: "#64748B", mb: 3 }}>
                  Adjust every assumption. Results update immediately.
                </Typography>
                <Stack spacing={2}>
                  <CalculatorInput
                    label="Number of employees"
                    value={employees}
                    onChange={setEmployees}
                    min={10}
                    max={1500}
                    helper="Used for facility context"
                  />
                  <CalculatorInput
                    label="Average hourly wage"
                    value={hourlyWage}
                    onChange={setHourlyWage}
                    min={10}
                    max={100}
                    step={0.5}
                    adornment="$"
                  />
                  <CalculatorInput
                    label="Call-outs per week"
                    value={callOutsPerWeek}
                    onChange={setCallOutsPerWeek}
                    min={0}
                    max={100}
                  />
                  <CalculatorInput
                    label="Average shift length"
                    value={shiftLength}
                    onChange={setShiftLength}
                    min={1}
                    max={24}
                    step={0.5}
                    endAdornment="hrs"
                  />
                  <CalculatorInput
                    label="Hours to typically fill a call-out"
                    value={fillDelayHours}
                    onChange={setFillDelayHours}
                    min={0}
                    max={24}
                    step={0.5}
                    endAdornment="hrs"
                    helper="How long the coverage gap usually remains open"
                  />

                  <Box
                    sx={{
                      bgcolor: "#F8FAFC",
                      border: "1px solid #E2E8F0",
                      borderRadius: 2,
                      p: 2,
                    }}
                  >
                    <Typography sx={{ fontWeight: 900, mb: 0.25 }}>
                      How call-outs are covered
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#64748B" }}>
                      Move any slider. The other two rebalance automatically to
                      keep the total at 100%.
                    </Typography>
                    <Stack spacing={2} sx={{ mt: 2 }}>
                      <CalculatorInput
                        label="Covered by overtime"
                        value={coverage.overtimePercent}
                        onChange={(value) =>
                          balanceCoverage("overtimePercent", value)
                        }
                        min={0}
                        max={100}
                        endAdornment="%"
                      />
                      <CalculatorInput
                        label="Covered by agency staff"
                        value={coverage.agencyPercent}
                        onChange={(value) =>
                          balanceCoverage("agencyPercent", value)
                        }
                        min={0}
                        max={100}
                        endAdornment="%"
                      />
                      <CalculatorInput
                        label="Left unfilled"
                        value={coverage.unfilledPercent}
                        onChange={(value) =>
                          balanceCoverage("unfilledPercent", value)
                        }
                        min={0}
                        max={100}
                        endAdornment="%"
                      />
                    </Stack>
                    <Typography
                      sx={{
                        mt: 1.5,
                        color: "#0F766E",
                        fontWeight: 800,
                        fontSize: "0.82rem",
                      }}
                    >
                      Coverage mix total: 100%
                    </Typography>
                  </Box>

                  <CalculatorInput
                    label="Overtime premium multiplier"
                    value={overtimeMultiplier}
                    onChange={setOvertimeMultiplier}
                    min={1}
                    max={3}
                    step={0.1}
                    endAdornment="x"
                    tooltip="Standard overtime rate multiplier"
                  />
                  <CalculatorInput
                    label="Agency premium rate"
                    value={agencyRate}
                    onChange={setAgencyRate}
                    min={20}
                    max={250}
                    step={5}
                    adornment="$"
                    endAdornment="/hr"
                    tooltip="Your local agency staffing rate"
                  />
                  <CalculatorInput
                    label="Manager time per call-out"
                    value={managerMinutes}
                    onChange={setManagerMinutes}
                    min={0}
                    max={180}
                    step={5}
                    endAdornment="min"
                  />
                  <CalculatorInput
                    label="Manager hourly rate"
                    value={managerHourlyRate}
                    onChange={setManagerHourlyRate}
                    min={10}
                    max={150}
                    step={1}
                    adornment="$"
                  />
                </Stack>
              </CardContent>
            </Card>

            <Box>
              <Card
                sx={{
                  borderRadius: 2,
                  boxShadow: "0 18px 45px rgba(15,23,42,0.1)",
                  overflow: "hidden",
                }}
              >
                <Box sx={{ height: 6, bgcolor: "#2563EB" }} />
                <CardContent
                  sx={{
                    p: { xs: 2.5, md: 4 },
                    "&:last-child": { pb: { xs: 2.5, md: 4 } },
                  }}
                >
                  <Typography
                    sx={{
                      color: "#64748B",
                      fontWeight: 800,
                      fontSize: "0.78rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    Live annual impact
                  </Typography>
                  <Typography sx={{ mt: 1, color: "#334155", fontWeight: 700 }}>
                    Estimated annual cost of covering call-outs
                  </Typography>
                  <Typography
                    sx={{
                      mt: 0.5,
                      fontSize: { xs: "2.7rem", md: "4rem" },
                      lineHeight: 1,
                      fontWeight: 950,
                      color: "#0F172A",
                    }}
                  >
                    {formatMoney(metrics.totalAnnualCost)}
                  </Typography>

                  <Divider sx={{ my: 3 }} />
                  <Stack spacing={2.5}>
                    {breakdown.map((item) => (
                      <Box key={item.label}>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 2,
                            mb: 0.75,
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{ color: "#475569", fontWeight: 700 }}
                          >
                            {item.label}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{ color: "#0F172A", fontWeight: 900 }}
                          >
                            {formatMoney(item.value)}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={(item.value / highestCost) * 100}
                          sx={{
                            height: 7,
                            borderRadius: 0,
                            bgcolor: "#E2E8F0",
                            "& .MuiLinearProgress-bar": { bgcolor: item.color },
                          }}
                        />
                      </Box>
                    ))}
                  </Stack>

                  <Box
                    sx={{
                      mt: 3,
                      p: 2,
                      bgcolor: "#FFF7ED",
                      borderLeft: "4px solid #EA580C",
                    }}
                  >
                    <Typography sx={{ color: "#9A3412", fontWeight: 900 }}>
                      {formatNumber(metrics.annualUnfilledShiftCount)} shifts go
                      uncovered each year
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: "#7C2D12", mt: 0.35 }}
                    >
                      This is tracked separately and is not assigned a dollar
                      value in the total above.
                    </Typography>
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      mt: 2.5,
                      color: "#64748B",
                      lineHeight: 1.5,
                    }}
                  >
                    These are estimates based on the inputs above, using
                    standard overtime/agency premium assumptions. Your actual
                    costs may vary. Adjust any field to match your facility.
                  </Typography>
                </CardContent>
              </Card>

              <Box
                sx={{
                  mt: 3,
                  p: { xs: 2.5, md: 3.5 },
                  bgcolor: "#E0F2FE",
                  borderLeft: "5px solid #0369A1",
                }}
              >
                <Typography
                  sx={{ color: "#0C4A6E", fontWeight: 850, lineHeight: 1.65 }}
                >
                  WiserShifts does not stop people from calling out. It gets the
                  open shift in front of available staff immediately instead of
                  relying on a manager to work through a phone list. More
                  call-outs can be covered internally before they turn into
                  overtime or an agency call.
                </Typography>
              </Box>

              <Stack spacing={1.25} sx={{ mt: 2.5 }}>
                <Button
                  component="a"
                  href="https://calendly.com/wisershifts-info/30min"
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="contained"
                  endIcon={<FiArrowRight />}
                  sx={{ py: 1.15, fontWeight: 900, textTransform: "none" }}
                >
                  Book your free scheduling audit
                </Button>
                <Button
                  onClick={handleCopyLink}
                  variant="outlined"
                  startIcon={<FiCopy />}
                  sx={{ py: 1, fontWeight: 800, textTransform: "none" }}
                >
                  Copy link to my results
                </Button>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "1fr auto" },
                    gap: 1,
                  }}
                >
                  <TextField
                    label="Email these results"
                    placeholder="you@facility.com"
                    size="small"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                  <Button
                    onClick={handleEmail}
                    disabled={sendingEmail}
                    variant="text"
                    startIcon={<FiMail />}
                    sx={{
                      fontWeight: 800,
                      textTransform: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {sendingEmail ? "Sending..." : "Email me these results"}
                  </Button>
                </Box>
              </Stack>
            </Box>
          </Box>

          <Box
            sx={{
              mt: { xs: 5, md: 7 },
              py: 3,
              borderTop: "1px solid #CBD5E1",
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <Typography sx={{ color: "#334155", fontWeight: 800 }}>
              Also see:{" "}
              <Box
                component={RouterLink}
                to="/calculators/overtime-cost-calculator"
                sx={{ color: "#2563EB" }}
              >
                Overtime Cost Calculator
              </Box>
            </Typography>
            <Typography
              sx={{ color: "#64748B", maxWidth: 610, fontSize: "0.88rem" }}
            >
              See how faster internal coverage can reduce the overtime, agency
              spend, and manager effort tied to call-outs.
            </Typography>
          </Box>
        </Container>
      </Box>
      <Footer />
    </>
  );
}
