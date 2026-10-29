import { useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, Link, Typography } from "@mui/material";
import { FiRefreshCw } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import api from "../../config/api";
import { IOS } from "../../theme/ios";
import { Empty, NotConnected, Section, Stat, Tag } from "./HqBits";
import { ago, errorText, n, num, shortDate } from "./hqFormat";

const AUDIENCE_COLORS = { schedulers: IOS.green, directors: "#AF52DE", operators: "#FF2D55" };
const duration = (iso = "") => {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return "";
  const [h, mi, s] = [m[1], m[2], m[3]].map((x) => Number(x || 0));
  return h ? `${h}:${String(mi).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${mi}:${String(s).padStart(2, "0")}`;
};

/** Blog (Contentful), YouTube and LinkedIn: what we published and how it did. */
export default function HqContent({ reloadKey }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let off = false;
    api
      .get("/hq/content", { params: refresh ? { refresh: 1 } : {} })
      .then((res) => !off && setData(res.data))
      .catch((err) => !off && setError(errorText(err, "Couldn't load content")));
    return () => {
      off = true;
    };
  }, [reloadKey, refresh]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <CircularProgress size={22} />;
  const { blog, video, linkedin } = data;
  const posts = linkedin.posts || [];
  const li = posts.reduce((s, p) => ({ impressions: s.impressions + p.impressions, reactions: s.reactions + p.reactions + p.comments + p.reposts }), { impressions: 0, reactions: 0 });

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Button size="small" startIcon={<FiRefreshCw />} onClick={() => setRefresh((r) => r + 1)} sx={{ textTransform: "none" }}>
          Refresh from the sources
        </Button>
      </Box>

      <Section title="Blog" note={blog.fetchedAt ? `From Contentful, ${ago(blog.fetchedAt)}. Views are the last 28 days in Google Analytics.` : ""}>
        {blog.error === "not_configured" ? (
          <NotConnected what="Contentful" env={["CONTENTFUL_SPACE_ID", "CONTENTFUL_DELIVERY_TOKEN"]} />
        ) : (
          <>
            {blog.error && <Alert severity="warning" sx={{ mb: 1 }}>{blog.error}</Alert>}
            {!blog.data?.length && <Empty>No posts published yet.</Empty>}
            {blog.data?.map((p) => (
              <Box key={p.id} sx={{ display: "flex", gap: 2, py: 1, borderBottom: `1px solid ${IOS.hairline}`, alignItems: "center", flexWrap: "wrap" }}>
                <Box sx={{ flex: "1 1 320px", minWidth: 0 }}>
                  <Link href={`/blog/${p.slug}`} target="_blank" rel="noreferrer" underline="hover" sx={{ fontWeight: 600, fontSize: 14.5, color: IOS.ink }}>
                    {p.title}
                  </Link>
                  <Box sx={{ display: "flex", gap: 0.5, mt: 0.25 }}>
                    {(p.audience || []).map((a) => (
                      <Tag key={a} color={AUDIENCE_COLORS[a] || IOS.secondary}>{a}</Tag>
                    ))}
                  </Box>
                </Box>
                <Typography sx={{ fontSize: 13, color: IOS.secondary, width: 90 }}>{shortDate(p.publishDate)}</Typography>
                <Typography sx={{ fontSize: 13.5, fontWeight: 700, width: 90, textAlign: "right", ...num }}>{p.views28 === null ? "–" : `${n(p.views28)} views`}</Typography>
              </Box>
            ))}
          </>
        )}
      </Section>

      <Section title="YouTube" note={video.fetchedAt ? `Updated ${ago(video.fetchedAt)}.` : ""}>
        {video.error === "not_configured" ? (
          <NotConnected what="YouTube" env={["YOUTUBE_API_KEY", "YOUTUBE_CHANNEL_ID"]} />
        ) : (
          <>
            {video.error && <Alert severity="warning" sx={{ mb: 1 }}>{video.error}</Alert>}
            {video.data && (
              <>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(3, 1fr)" }, gap: 1, mb: 2 }}>
                  <Stat label="Subscribers" value={n(video.data.channel.subscribers)} />
                  <Stat label="Total views" value={n(video.data.channel.views)} />
                  <Stat label="Videos" value={n(video.data.channel.videos)} />
                </Box>
                {video.data.videos.map((v) => (
                  <Box key={v.id} sx={{ display: "flex", gap: 1.5, py: 1, borderBottom: `1px solid ${IOS.hairline}`, alignItems: "center" }}>
                    {v.thumbnail && <Box component="img" src={v.thumbnail} alt="" sx={{ width: 96, height: 54, objectFit: "cover", borderRadius: "8px", flexShrink: 0 }} />}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Link href={v.url} target="_blank" rel="noreferrer" underline="hover" sx={{ fontWeight: 600, fontSize: 14, color: IOS.ink, display: "block" }} noWrap>
                        {v.title}
                      </Link>
                      <Typography sx={{ fontSize: 12.5, color: IOS.secondary }}>
                        {shortDate(v.publishedAt)} · {duration(v.duration)}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 14, ...num }}>{n(v.views)} views</Typography>
                      <Typography sx={{ fontSize: 12, color: IOS.secondary, ...num }}>
                        {n(v.likes)} likes · {n(v.comments)} comments
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </>
            )}
          </>
        )}
      </Section>

      <Section
        title="LinkedIn"
        note="LinkedIn has no API for personal posts. Export your post analytics from LinkedIn and upload it under Connections."
        right={
          <Button size="small" variant="outlined" onClick={() => navigate("/hq/connections")} sx={{ borderRadius: IOS.radius.round, textTransform: "none" }}>
            Upload export
          </Button>
        }
      >
        {!posts.length && <Empty>No LinkedIn numbers yet.</Empty>}
        {posts.length > 0 && (
          <>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(3, 1fr)" }, gap: 1, mb: 2 }}>
              <Stat label="Posts" value={n(posts.length)} />
              <Stat label="Impressions" value={n(li.impressions)} />
              <Stat label="Engagement" value={n(li.reactions)} detail={li.impressions ? `${((li.reactions / li.impressions) * 100).toFixed(1)}% of impressions` : ""} />
            </Box>
            {posts.map((p) => (
              <Box key={p._id} sx={{ display: "flex", gap: 2, py: 1, borderBottom: `1px solid ${IOS.hairline}`, alignItems: "center" }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Link href={p.url} target="_blank" rel="noreferrer" underline="hover" sx={{ fontSize: 14, color: IOS.ink, display: "block" }} noWrap>
                    {p.text || p.url}
                  </Link>
                  <Typography sx={{ fontSize: 12.5, color: IOS.secondary }}>{shortDate(p.postedAt)}{p.author ? ` · ${p.author}` : ""}</Typography>
                </Box>
                <Typography sx={{ fontSize: 13.5, fontWeight: 700, textAlign: "right", ...num }}>
                  {n(p.impressions)}
                  <Box component="span" sx={{ color: IOS.secondary, fontWeight: 400 }}> impr. · {n(p.reactions + p.comments + p.reposts)} eng.</Box>
                </Typography>
              </Box>
            ))}
          </>
        )}
      </Section>
    </Box>
  );
}
