import { Box, Button, Container, Stack, Typography } from "@mui/material";
import { FiArrowRight, FiCalendar, FiPercent } from "react-icons/fi";
import { Link as RouterLink, Navigate, useNavigate, useParams } from "react-router-dom";
import Footer from "../Shared/Footer";
import { usePageMetadata } from "./calculatorUtils";
import RoleMocks from "./RoleMocks";
import { DEMO_URL, FAQ, NOT_AN_AGENCY, ROLES, roleBySlug } from "./roleContent";

const primaryBtn = {
  minHeight: 52,
  px: 3,
  borderRadius: "12px",
  bgcolor: "#2563EB",
  color: "#fff",
  fontWeight: 800,
  textTransform: "none",
  fontSize: "0.98rem",
  "&:hover": { bgcolor: "#3B82F6" },
};
const outlineBtn = {
  minHeight: 52,
  px: 3,
  borderRadius: "12px",
  borderColor: "rgba(255,255,255,0.45)",
  color: "#fff",
  fontWeight: 750,
  textTransform: "none",
  fontSize: "0.98rem",
  "&:hover": { borderColor: "#fff", bgcolor: "rgba(255,255,255,0.08)" },
};

/**
 * /for/schedulers, /for/directors, /for/operators: one page per buyer, for
 * links in outreach emails. Same product; what it does for that person.
 */
export default function RolePage() {
  const { role: slug } = useParams();
  const navigate = useNavigate();
  const role = roleBySlug(slug);
  usePageMetadata(
    role ? `${role.title} | WiserShifts for ${role.tab}` : "WiserShifts",
    role ? role.subtitle : "",
  );
  if (!role) return <Navigate to="/" replace />;

  const start = (
    <Button variant="contained" size="large" endIcon={<FiArrowRight />} onClick={() => navigate("/signup-tenant")} sx={primaryBtn}>
      Start free
    </Button>
  );
  const demo = (dark = true) => (
    <Button
      variant={dark ? "outlined" : "contained"}
      size="large"
      startIcon={<FiCalendar />}
      component="a"
      href={DEMO_URL}
      target="_blank"
      rel="noopener noreferrer"
      sx={dark ? outlineBtn : primaryBtn}
    >
      Book a demo
    </Button>
  );
  const others = ROLES.filter((r) => r.slug !== role.slug);

  return (
    <>
      <Box sx={{ bgcolor: "#fff" }}>
        {/* Hero */}
        <Box
          component="section"
          sx={{
            bgcolor: "#0F172A",
            color: "#fff",
            backgroundImage: "radial-gradient(circle at 85% 10%, rgba(37,99,235,0.35), transparent 40%)",
            pt: { xs: 7, md: 10 },
            pb: { xs: 7, md: 10 },
          }}
        >
          <Container maxWidth="lg">
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.05fr 1fr" }, gap: { xs: 5, md: 7 }, alignItems: "center" }}>
              <Box>
                <Typography sx={{ color: "#BFDBFE", fontSize: "0.78rem", fontWeight: 800, letterSpacing: "0.13em", textTransform: "uppercase" }}>
                  {role.eyebrow}
                </Typography>
                <Typography component="h1" sx={{ fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.05, fontSize: { xs: "2.3rem", md: "3.3rem" }, mt: 1.5 }}>
                  {role.title}
                </Typography>
                <Typography sx={{ color: "rgba(255,255,255,0.8)", fontSize: { xs: "1.05rem", md: "1.15rem" }, lineHeight: 1.6, mt: 2.5, maxWidth: 560 }}>
                  {role.subtitle}
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 3.5 }}>
                  {role.primary === "demo" ? (
                    <>
                      {demo(false)}
                      <Button variant="outlined" size="large" onClick={() => navigate("/signup-tenant")} sx={outlineBtn}>
                        Start free
                      </Button>
                    </>
                  ) : (
                    <>
                      {start}
                      {demo(true)}
                    </>
                  )}
                </Stack>
                <Typography sx={{ color: "rgba(255,255,255,0.62)", fontSize: "0.88rem", mt: 2 }}>{NOT_AN_AGENCY}</Typography>
              </Box>
              <RoleMocks names={role.mocks} />
            </Box>
          </Container>
        </Box>

        {/* What it does for you */}
        <Container maxWidth="lg" sx={{ py: { xs: 7, md: 10 } }}>
          <Typography component="h2" sx={{ fontWeight: 900, letterSpacing: "-0.03em", fontSize: { xs: "1.8rem", md: "2.4rem" }, textAlign: "center", color: "#111827" }}>
            What it does for you
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: { xs: 3, md: 4 }, mt: { xs: 4, md: 6 }, maxWidth: 1000, mx: "auto" }}>
            {role.points.map((p) => {
              const Icon = p.icon;
              return (
                <Box key={p.title} sx={{ display: "flex", gap: 2, p: 3, borderRadius: "18px", border: "1px solid #E4E7EC" }}>
                  <Box sx={{ width: 44, height: 44, minWidth: 44, borderRadius: "13px", display: "grid", placeItems: "center", bgcolor: "rgba(37,99,235,0.08)", color: "#2563EB" }}>
                    <Icon size={20} />
                  </Box>
                  <Box>
                    <Typography component="h3" sx={{ fontWeight: 800, color: "#111827", fontSize: "1.05rem" }}>{p.title}</Typography>
                    <Typography sx={{ color: "#667085", lineHeight: 1.55, mt: 0.5 }}>{p.text}</Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
          {role.note && (
            <Typography sx={{ textAlign: "center", color: "#667085", mt: 4 }}>{role.note}</Typography>
          )}

          {/* Calculator */}
          <Box
            sx={{
              mt: { xs: 6, md: 8 },
              p: { xs: 3, md: 4 },
              borderRadius: "20px",
              border: "1px solid #E4E7EC",
              background: "linear-gradient(110deg, #F8FAFC 0%, #F8FAFC 55%, #EFF6FF 100%)",
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr auto" },
              gap: 3,
              alignItems: "center",
            }}
          >
            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
              <Box sx={{ width: 46, height: 46, minWidth: 46, borderRadius: "14px", display: "grid", placeItems: "center", bgcolor: "#fff", color: "#2563EB", border: "1px solid #DBEAFE" }}>
                <FiPercent size={20} />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 900, fontSize: { xs: "1.2rem", md: "1.4rem" }, color: "#111827" }}>Try the {role.calculator.label.toLowerCase()}</Typography>
                <Typography sx={{ color: "#667085", mt: 0.25 }}>Your own numbers, with the math shown. No sign-up needed.</Typography>
              </Box>
            </Box>
            <Button
              component={RouterLink}
              to={role.calculator.to}
              variant="contained"
              endIcon={<FiArrowRight />}
              sx={{ minHeight: 48, px: 2.75, borderRadius: "11px", bgcolor: "#111827", color: "#fff", fontWeight: 800, textTransform: "none", whiteSpace: "nowrap", "&:hover": { bgcolor: "#1F2937" } }}
            >
              Open calculator
            </Button>
          </Box>

          {/* FAQ */}
          <Box sx={{ mt: { xs: 6, md: 8 }, maxWidth: 820, mx: "auto" }}>
            <Typography component="h2" sx={{ fontWeight: 900, fontSize: { xs: "1.5rem", md: "1.9rem" }, color: "#111827", mb: 2 }}>
              Questions
            </Typography>
            {FAQ.map((f) => (
              <Box key={f.q} sx={{ py: 2, borderTop: "1px solid #E4E7EC" }}>
                <Typography sx={{ fontWeight: 800, color: "#111827" }}>{f.q}</Typography>
                <Typography sx={{ color: "#667085", lineHeight: 1.6, mt: 0.5 }}>{f.a}</Typography>
              </Box>
            ))}
          </Box>

          {/* Other roles */}
          <Box sx={{ mt: { xs: 6, md: 8 }, display: "flex", gap: 1.5, justifyContent: "center", flexWrap: "wrap" }}>
            <Typography sx={{ color: "#667085", width: "100%", textAlign: "center", mb: 0.5 }}>Also on your team:</Typography>
            {others.map((r) => (
              <Button key={r.slug} component={RouterLink} to={`/for/${r.slug}`} variant="outlined" endIcon={<FiArrowRight />} sx={{ borderRadius: 999, textTransform: "none", fontWeight: 700 }}>
                {r.tab}
              </Button>
            ))}
          </Box>
        </Container>
      </Box>
      <Footer />
    </>
  );
}
