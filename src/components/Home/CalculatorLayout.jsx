import { Box, Button, Card, CardContent, Container, Stack, Typography } from "@mui/material";
import { FiArrowRight, FiCalendar } from "react-icons/fi";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import Footer from "../Shared/Footer";
import { DEMO_URL, NOT_AN_AGENCY } from "./roleContent";
import EmailCapture from "./EmailCapture";

const panel = { borderRadius: "20px", borderColor: "#E4E7EC" };

/** A result line in "the math" box. */
export function MathLine({ children, strong }) {
  return (
    <Typography sx={{ fontSize: 14, color: strong ? "#111827" : "#475467", fontWeight: strong ? 700 : 400, lineHeight: 1.7, fontVariantNumeric: "tabular-nums" }}>
      {children}
    </Typography>
  );
}

/**
 * Shared layout for the planning calculators: dark header, inputs on the
 * left, live result and the math on the right, then a short pitch.
 */
export default function CalculatorLayout({ eyebrow, title, intro, inputs, result, math, note, pitch, capture }) {
  const navigate = useNavigate();
  return (
    <>
      <Box sx={{ bgcolor: "#F8FAFC", minHeight: "100vh", pb: { xs: 6, md: 9 } }}>
        <Box
          sx={{
            bgcolor: "#0F172A",
            color: "#fff",
            pt: { xs: 5, md: 7 },
            pb: { xs: 11, md: 14 },
            backgroundImage: "radial-gradient(circle at 85% 10%, rgba(37,99,235,0.32), transparent 40%)",
          }}
        >
          <Container maxWidth="lg">
            <Button component={RouterLink} to="/calculators" sx={{ color: "#BFDBFE", px: 0, textTransform: "none", fontWeight: 700, mb: 1 }}>
              ← All calculators
            </Button>
            <Typography sx={{ color: "#BFDBFE", fontWeight: 800, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.12em" }}>
              {eyebrow}
            </Typography>
            <Typography component="h1" sx={{ maxWidth: 880, mt: 1.5, fontSize: { xs: "2.2rem", md: "3.3rem" }, fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.035em" }}>
              {title}
            </Typography>
            <Typography sx={{ maxWidth: 720, mt: 2, color: "rgba(255,255,255,0.78)", fontSize: { xs: "1rem", md: "1.12rem" }, lineHeight: 1.6 }}>
              {intro}
            </Typography>
          </Container>
        </Box>

        <Container maxWidth="lg" sx={{ mt: { xs: -8, md: -10 } }}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.05fr 1fr" }, gap: 2.5, alignItems: "start" }}>
            <Card variant="outlined" sx={panel}>
              <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
                <Typography sx={{ fontWeight: 900, fontSize: "1.15rem", mb: 2.5 }}>Your numbers</Typography>
                <Stack spacing={3}>{inputs}</Stack>
              </CardContent>
            </Card>
            <Box sx={{ display: "grid", gap: 2.5, position: { md: "sticky" }, top: { md: 96 } }}>
              <Card variant="outlined" sx={{ ...panel, borderColor: "#BFDBFE" }}>
                <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>{result}</CardContent>
              </Card>
              <Card variant="outlined" sx={panel}>
                <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
                  <Typography sx={{ fontWeight: 900, fontSize: "1rem", mb: 1 }}>The math</Typography>
                  {math}
                  {note && <Typography sx={{ fontSize: 12.5, color: "#667085", mt: 1.5, lineHeight: 1.55 }}>{note}</Typography>}
                </CardContent>
              </Card>
              {capture && <EmailCapture source={capture.source} summary={capture.summary} />}
            </Box>
          </Box>

          <Box
            sx={{
              mt: { xs: 5, md: 7 },
              p: { xs: 3, md: 4.5 },
              borderRadius: "24px",
              bgcolor: "#0F172A",
              color: "#fff",
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr auto" },
              gap: 3,
              alignItems: "center",
            }}
          >
            <Box>
              <Typography sx={{ fontWeight: 900, fontSize: { xs: "1.5rem", md: "1.9rem" }, letterSpacing: "-0.03em" }}>{pitch.title}</Typography>
              <Typography sx={{ color: "rgba(255,255,255,0.72)", mt: 1, lineHeight: 1.55, maxWidth: 640 }}>{pitch.text}</Typography>
              <Typography sx={{ color: "rgba(255,255,255,0.5)", mt: 1.25, fontSize: "0.85rem" }}>{NOT_AN_AGENCY}</Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
              <Button
                variant="contained"
                endIcon={<FiArrowRight />}
                onClick={() => navigate("/signup-tenant")}
                sx={{ minHeight: 50, px: 2.75, borderRadius: "11px", bgcolor: "#2563EB", fontWeight: 800, textTransform: "none", whiteSpace: "nowrap", "&:hover": { bgcolor: "#3B82F6" } }}
              >
                Start free
              </Button>
              <Button
                variant="outlined"
                startIcon={<FiCalendar />}
                component="a"
                href={DEMO_URL}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ minHeight: 50, px: 2.75, borderRadius: "11px", borderColor: "rgba(255,255,255,0.3)", color: "#fff", fontWeight: 750, textTransform: "none", whiteSpace: "nowrap" }}
              >
                Book a demo
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>
      <Footer />
    </>
  );
}
