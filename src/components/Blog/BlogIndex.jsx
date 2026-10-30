import { useEffect, useState } from "react";
import { Box, ButtonBase, Chip, CircularProgress, Container, Typography } from "@mui/material";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import api from "../../config/api";
import Footer from "../Shared/Footer";
import { usePageMetadata } from "../Home/calculatorUtils";
import EmailCapture from "../Home/EmailCapture";
import { AUDIENCES, postDate } from "./blogFormat";

/** /blog: posts from Contentful, newest first, filterable by who they're for. */
export default function BlogIndex() {
  usePageMetadata(
    "Blog | WiserShifts",
    "Practical notes on scheduling, overtime, call-outs and hours per resident day for people who run and schedule care buildings.",
  );
  const [params, setParams] = useSearchParams();
  const audience = params.get("for") || "";
  const [posts, setPosts] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let off = false;
    api
      .get("/public/blog")
      .then((res) => !off && setPosts(res.data.posts || []))
      .catch(() => !off && setFailed(true));
    return () => {
      off = true;
    };
  }, []);

  const shown = (posts || []).filter((p) => !audience || p.audience.includes(audience));

  return (
    <>
      <Box sx={{ bgcolor: "#F8FAFC", minHeight: "70vh", pb: 8 }}>
        <Box sx={{ bgcolor: "#0F172A", color: "#fff", pt: { xs: 6, md: 8 }, pb: { xs: 6, md: 8 } }}>
          <Container maxWidth="lg">
            <Typography sx={{ color: "#BFDBFE", fontWeight: 800, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.12em" }}>Blog</Typography>
            <Typography component="h1" sx={{ mt: 1.5, fontSize: { xs: "2.2rem", md: "3.2rem" }, fontWeight: 900, letterSpacing: "-0.035em", lineHeight: 1.05, maxWidth: 820 }}>
              Staffing math for people who run care buildings
            </Typography>
            <Typography sx={{ mt: 2, color: "rgba(255,255,255,0.75)", fontSize: "1.1rem", maxWidth: 700, lineHeight: 1.6 }}>
              Overtime, call-outs, hours per resident day and schedules that hold up. Written for schedulers, DONs, administrators and operators.
            </Typography>
          </Container>
        </Box>

        <Container maxWidth="lg" sx={{ mt: 4 }}>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 3 }}>
            {[["", "Everything"], ...Object.entries(AUDIENCES).map(([k, v]) => [k, v.label])].map(([k, label]) => (
              <Chip
                key={k || "all"}
                label={label}
                clickable
                onClick={() => setParams(k ? { for: k } : {})}
                sx={{ fontWeight: 700, bgcolor: audience === k ? "#0F172A" : "#fff", color: audience === k ? "#fff" : "#344054", border: "1px solid #E4E7EC" }}
              />
            ))}
          </Box>

          {!posts && !failed && <CircularProgress size={24} />}
          {failed && <Typography sx={{ color: "#667085" }}>The blog couldn't load right now. Try again in a minute.</Typography>}
          {posts && !shown.length && <Typography sx={{ color: "#667085", py: 4 }}>The first posts are on their way. Sign up below to get them by email.</Typography>}

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)" }, gap: 2.5 }}>
            {shown.map((p) => (
              <ButtonBase
                key={p.id}
                component={RouterLink}
                to={`/blog/${p.slug}`}
                sx={{ display: "block", textAlign: "left", bgcolor: "#fff", borderRadius: "20px", border: "1px solid #E4E7EC", overflow: "hidden", transition: "box-shadow .15s", "&:hover": { boxShadow: "0 10px 30px rgba(15,23,42,0.08)" } }}
              >
                {p.coverImage?.url ? (
                  <Box component="img" src={`${p.coverImage.url}?w=800&fm=webp&q=75`} alt="" loading="lazy" sx={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", display: "block" }} />
                ) : (
                  <Box sx={{ aspectRatio: "16 / 9", background: "linear-gradient(135deg, #0F172A, #1E3A8A)" }} />
                )}
                <Box sx={{ p: 2.5 }}>
                  <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mb: 1 }}>
                    {p.audience.map((a) =>
                      AUDIENCES[a] ? (
                        <Box key={a} component="span" sx={{ fontSize: 11.5, fontWeight: 800, color: AUDIENCES[a].color, bgcolor: AUDIENCES[a].bg, px: 1, py: 0.25, borderRadius: "999px" }}>
                          {AUDIENCES[a].label}
                        </Box>
                      ) : null,
                    )}
                  </Box>
                  <Typography sx={{ fontWeight: 850, fontSize: "1.15rem", lineHeight: 1.3, letterSpacing: "-0.01em", color: "#101828" }}>{p.title}</Typography>
                  {p.excerpt && <Typography sx={{ color: "#475467", fontSize: 14.5, mt: 1, lineHeight: 1.55 }}>{p.excerpt}</Typography>}
                  <Typography sx={{ color: "#98A2B3", fontSize: 13, mt: 1.5 }}>{postDate(p.publishDate)}</Typography>
                </Box>
              </ButtonBase>
            ))}
          </Box>

          <Box sx={{ mt: 6, maxWidth: 720 }}>
            <EmailCapture source="blog" />
          </Box>
        </Container>
      </Box>
      <Footer />
    </>
  );
}
