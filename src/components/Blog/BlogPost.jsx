import { useEffect, useState } from "react";
import { Box, Button, CircularProgress, Container, Typography } from "@mui/material";
import { FiArrowLeft, FiArrowRight } from "react-icons/fi";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import api from "../../config/api";
import Footer from "../Shared/Footer";
import { usePageMetadata } from "../Home/calculatorUtils";
import EmailCapture from "../Home/EmailCapture";
import { NOT_AN_AGENCY } from "../Home/roleContent";
import RichText from "./RichText";
import { AUDIENCES, postDate } from "./blogFormat";

/** /blog/:slug: one post. */
export default function BlogPost() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [state, setState] = useState("loading");

  useEffect(() => {
    let off = false;
    api
      .get(`/public/blog/${encodeURIComponent(slug)}`)
      .then((res) => {
        if (off) return;
        setPost(res.data.post);
        setState("ok");
      })
      .catch((err) => !off && setState(err?.response?.status === 404 ? "missing" : "error"));
    return () => {
      off = true;
    };
  }, [slug]);

  usePageMetadata(post ? `${post.title} | WiserShifts` : "Blog | WiserShifts", post?.seoDescription || "WiserShifts blog");

  return (
    <>
      <Box sx={{ bgcolor: "#fff", minHeight: "70vh", pb: 8 }}>
        <Container maxWidth="md" sx={{ pt: { xs: 4, md: 6 } }}>
          <Button component={RouterLink} to="/blog" startIcon={<FiArrowLeft />} sx={{ textTransform: "none", fontWeight: 700, px: 0, color: "#475467" }}>
            All posts
          </Button>
          {state === "loading" && <CircularProgress size={24} sx={{ display: "block", mt: 4 }} />}
          {state === "missing" && <Typography sx={{ mt: 4, fontSize: "1.2rem" }}>That post isn't here. It may have moved.</Typography>}
          {state === "error" && <Typography sx={{ mt: 4, color: "#667085" }}>This post couldn't load right now. Try again in a minute.</Typography>}
          {post && (
            <Box component="article">
              <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mt: 3 }}>
                {post.audience.map((a) =>
                  AUDIENCES[a] ? (
                    <Box key={a} component="span" sx={{ fontSize: 12, fontWeight: 800, color: AUDIENCES[a].color, bgcolor: AUDIENCES[a].bg, px: 1.1, py: 0.3, borderRadius: "999px" }}>
                      {AUDIENCES[a].label}
                    </Box>
                  ) : null,
                )}
              </Box>
              <Typography component="h1" sx={{ mt: 1.5, fontSize: { xs: "2.1rem", md: "2.9rem" }, fontWeight: 900, letterSpacing: "-0.035em", lineHeight: 1.08, color: "#101828" }}>
                {post.title}
              </Typography>
              {post.excerpt && <Typography sx={{ mt: 2, fontSize: "1.2rem", color: "#475467", lineHeight: 1.55 }}>{post.excerpt}</Typography>}
              <Typography sx={{ mt: 2, color: "#98A2B3", fontSize: 14 }}>
                {[post.author, postDate(post.publishDate)].filter(Boolean).join(" · ")}
              </Typography>
              {post.coverImage?.url && (
                <Box component="img" src={`${post.coverImage.url}?w=1600&fm=webp&q=80`} alt="" sx={{ width: "100%", borderRadius: "18px", mt: 3, display: "block" }} />
              )}
              <Box sx={{ mt: 2 }}>
                <RichText document={post.body} assets={post.assets} />
              </Box>
            </Box>
          )}
          {post && (
            <>
              <Box sx={{ mt: 6, p: { xs: 3, md: 4 }, borderRadius: "22px", bgcolor: "#0F172A", color: "#fff" }}>
                <Typography sx={{ fontWeight: 900, fontSize: "1.5rem", letterSpacing: "-0.02em" }}>See your own numbers</Typography>
                <Typography sx={{ color: "rgba(255,255,255,0.72)", mt: 1, lineHeight: 1.55 }}>
                  WiserShifts is scheduling software for care facilities: open shifts, call-outs, overtime and hours per resident day in one place. Free to start.
                </Typography>
                <Typography sx={{ color: "rgba(255,255,255,0.5)", mt: 1, fontSize: "0.85rem" }}>{NOT_AN_AGENCY}</Typography>
                <Button variant="contained" endIcon={<FiArrowRight />} onClick={() => navigate("/signup-tenant")} sx={{ mt: 2, borderRadius: "11px", bgcolor: "#2563EB", fontWeight: 800, textTransform: "none" }}>
                  Start free
                </Button>
              </Box>
              <Box sx={{ mt: 3 }}>
                <EmailCapture source="blog" summary={post.slug} />
              </Box>
            </>
          )}
        </Container>
      </Box>
      <Footer />
    </>
  );
}
