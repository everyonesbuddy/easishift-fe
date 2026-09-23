import { useMemo, useState } from "react";
import {
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
  overtimeHours: 40,
  reactivePercent: 40,
  overtimeMultiplier: 1.5,
};

export default function OvertimeCostCalculator() {
  usePageMetadata(
    "Overtime Cost Calculator: What Reactive Scheduling Is Costing You | WiserShifts",
    "Estimate how much of your overtime spend comes from reactive, last-minute scheduling rather than planned staffing needs.",
  );

  const [employees, setEmployees] = useState(() =>
    readNumberParam("employees", DEFAULTS.employees, 10, 1500),
  );
  const [hourlyWage, setHourlyWage] = useState(() =>
    readNumberParam("wage", DEFAULTS.hourlyWage, 10, 100),
  );
  const [overtimeHours, setOvertimeHours] = useState(() =>
    readNumberParam("hours", DEFAULTS.overtimeHours, 0, 1000),
  );
  const [reactivePercent, setReactivePercent] = useState(() =>
    readNumberParam("reactive", DEFAULTS.reactivePercent, 0, 100),
  );
  const [overtimeMultiplier, setOvertimeMultiplier] = useState(() =>
    readNumberParam("otRate", DEFAULTS.overtimeMultiplier, 1, 3),
  );
  const [email, setEmail] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  const metrics = useMemo(() => {
    const weeklyReactiveHours = overtimeHours * (reactivePercent / 100);
    const weeklyPlannedHours = overtimeHours - weeklyReactiveHours;
    const annualReactiveCost =
      weeklyReactiveHours * hourlyWage * overtimeMultiplier * WEEKS_PER_YEAR;
    const annualPlannedCost =
      weeklyPlannedHours * hourlyWage * overtimeMultiplier * WEEKS_PER_YEAR;

    return {
      weeklyReactiveHours,
      weeklyPlannedHours,
      annualReactiveCost,
      annualPlannedCost,
      totalAnnualCost: annualReactiveCost + annualPlannedCost,
    };
  }, [hourlyWage, overtimeHours, overtimeMultiplier, reactivePercent]);

  const handleCopyLink = async () => {
    try {
      await copyCalculatorLink({
        employees,
        wage: hourlyWage,
        hours: overtimeHours,
        reactive: reactivePercent,
        otRate: overtimeMultiplier,
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
      await api.post("/marketing/overtime-cost/email-summary", {
        recipientEmail: trimmedEmail,
        inputs: {
          employees,
          hourlyWage,
          overtimeHours,
          reactivePercent,
          overtimeMultiplier,
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
            bgcolor: "#102A2A",
            color: "#fff",
            pt: { xs: 5, md: 7 },
            pb: { xs: 12, md: 15 },
            backgroundImage:
              "linear-gradient(115deg, rgba(13,148,136,0.2), transparent 45%), radial-gradient(circle at 84% 15%, rgba(234,88,12,0.2), transparent 27%)",
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
              Overtime cost calculator
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
              How Much Is Reactive Scheduling Costing You in Overtime?
            </Typography>
            <Typography
              sx={{
                maxWidth: 790,
                mt: 2,
                color: "#CCFBF1",
                fontSize: { xs: "1rem", md: "1.1rem" },
                lineHeight: 1.7,
              }}
            >
              Not all overtime is a scheduling problem. Some of it is planned
              and necessary. This calculator isolates the portion that comes
              from scrambling to fill gaps last-minute, so you can see
              what&apos;s actually avoidable versus what&apos;s just the cost of
              running your facility.
            </Typography>
            <Typography
              sx={{
                maxWidth: 860,
                mt: 2.5,
                pl: 2,
                borderLeft: "3px solid #2DD4BF",
                color: "#F0FDFA",
                fontWeight: 750,
                lineHeight: 1.55,
              }}
            >
              WiserShifts helps teams spot and share coverage gaps earlier,
              giving available staff time to pick up shifts before last-minute
              gaps turn into reactive overtime.
            </Typography>
          </Container>
        </Box>

        <Container maxWidth="lg" sx={{ mt: { xs: -8, md: -10 } }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                lg: "minmax(0, 0.85fr) minmax(0, 1.15fr)",
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
                  Your overtime mix
                </Typography>
                <Typography variant="body2" sx={{ color: "#64748B", mb: 3 }}>
                  Start with the defaults, then tune them to your facility.
                </Typography>
                <Stack spacing={2.25}>
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
                    label="Total overtime hours per week"
                    value={overtimeHours}
                    onChange={setOvertimeHours}
                    min={0}
                    max={1000}
                    step={5}
                    endAdornment="hrs"
                    helper="Facility-wide, across planned and reactive overtime"
                  />
                  <CalculatorInput
                    label="Overtime from reactive scheduling"
                    value={reactivePercent}
                    onChange={setReactivePercent}
                    min={0}
                    max={100}
                    endAdornment="%"
                    helper="Your estimate of overtime caused by last-minute coverage gaps"
                    tooltip="Overtime caused by scrambling to fill a gap, not planned staffing decisions"
                  />
                  <CalculatorInput
                    label="Overtime premium multiplier"
                    value={overtimeMultiplier}
                    onChange={setOvertimeMultiplier}
                    min={1}
                    max={3}
                    step={0.1}
                    endAdornment="x"
                    tooltip="The overtime rate applied to the average hourly wage"
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
                <Box sx={{ height: 6, bgcolor: "#0F766E" }} />
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
                    Estimated annual overtime cost from reactive, last-minute
                    scheduling
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
                    {formatMoney(metrics.annualReactiveCost)}
                  </Typography>

                  <Box
                    sx={{
                      mt: 3,
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                      gap: 1.5,
                    }}
                  >
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: "#F0FDFA",
                        borderTop: "4px solid #0F766E",
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{ color: "#475569", fontWeight: 800 }}
                      >
                        REACTIVE OVERTIME
                      </Typography>
                      <Typography
                        sx={{ mt: 0.5, fontWeight: 950, fontSize: "1.45rem" }}
                      >
                        {formatNumber(metrics.weeklyReactiveHours)} hrs/week
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#64748B" }}>
                        {formatMoney(metrics.annualReactiveCost)}/year
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: "#F8FAFC",
                        borderTop: "4px solid #94A3B8",
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{ color: "#475569", fontWeight: 800 }}
                      >
                        PLANNED OVERTIME
                      </Typography>
                      <Typography
                        sx={{ mt: 0.5, fontWeight: 950, fontSize: "1.45rem" }}
                      >
                        {formatNumber(metrics.weeklyPlannedHours)} hrs/week
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#64748B" }}>
                        {formatMoney(metrics.annualPlannedCost)}/year
                      </Typography>
                    </Box>
                  </Box>

                  <Divider sx={{ my: 3 }} />
                  <Typography
                    variant="body2"
                    sx={{ color: "#475569", lineHeight: 1.65 }}
                  >
                    Total overtime spend (all causes):{" "}
                    <Box component="strong" sx={{ color: "#0F172A" }}>
                      {formatMoney(metrics.totalAnnualCost)}/year
                    </Box>
                    . This calculator isolates only the reactive, avoidable
                    portion.
                  </Typography>
                  <Box
                    sx={{
                      mt: 2.5,
                      height: 13,
                      display: "flex",
                      overflow: "hidden",
                      bgcolor: "#E2E8F0",
                    }}
                    aria-label={`${reactivePercent}% reactive overtime`}
                  >
                    <Box
                      sx={{
                        width: `${reactivePercent}%`,
                        bgcolor: "#0F766E",
                        transition: "width 180ms ease",
                      }}
                    />
                  </Box>
                  <Box
                    sx={{
                      mt: 1,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 2,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ color: "#0F766E", fontWeight: 900 }}
                    >
                      {reactivePercent}% reactive
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: "#64748B", fontWeight: 800 }}
                    >
                      {100 - reactivePercent}% planned
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
                    The reactive-overtime percentage is an estimate. Adjust it
                    to reflect what you believe is scheduling-driven versus
                    planned overtime at your facility.
                  </Typography>
                </CardContent>
              </Card>

              <Box
                sx={{
                  mt: 3,
                  p: { xs: 2.5, md: 3.5 },
                  bgcolor: "#ECFDF5",
                  borderLeft: "5px solid #0F766E",
                }}
              >
                <Typography
                  sx={{ color: "#134E4A", fontWeight: 850, lineHeight: 1.65 }}
                >
                  WiserShifts does not reduce how much staff you need. It
                  reduces how much of your overtime comes from scrambling to
                  fill gaps last-minute by making the schedule visible and
                  shifts easy to pick up before someone has to stay late.
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
                  onClick={handleCopyLink}
                  variant="outlined"
                  startIcon={<FiCopy />}
                  sx={{
                    color: "#0F766E",
                    borderColor: "#0F766E",
                    py: 1,
                    fontWeight: 800,
                    textTransform: "none",
                  }}
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
                      color: "#0F766E",
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
                to="/calculators/call-out-cost-calculator"
                sx={{ color: "#0F766E" }}
              >
                Call-Out Cost Calculator
              </Box>
            </Typography>
            <Typography
              sx={{ color: "#64748B", maxWidth: 610, fontSize: "0.88rem" }}
            >
              Use both views to separate the cost of individual coverage events
              from the overtime patterns they create.
            </Typography>
          </Box>
        </Container>
      </Box>
      <Footer />
    </>
  );
}
