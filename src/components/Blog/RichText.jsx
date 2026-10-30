import { Box, Button, Link, Typography } from "@mui/material";
import { FiDownload } from "react-icons/fi";

// Renders Contentful rich text (the JSON "document") without extra libraries.
// Unknown node types render their children, so new Contentful features
// degrade to plain text instead of breaking the page.

const textOf = (node) => (node.nodeType === "text" ? node.value : (node.content || []).map(textOf).join(""));

function Text({ node }) {
  let out = node.value;
  for (const m of node.marks || []) {
    if (m.type === "bold") out = <strong>{out}</strong>;
    else if (m.type === "italic") out = <em>{out}</em>;
    else if (m.type === "underline") out = <u>{out}</u>;
    else if (m.type === "code") out = <Box component="code" sx={{ fontSize: "0.92em", bgcolor: "#F2F4F7", px: 0.5, borderRadius: "4px" }}>{out}</Box>;
  }
  return out;
}

const isImage = (a) => !a.contentType || a.contentType.startsWith("image/");
const KIND = { "application/pdf": "PDF", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel", "application/vnd.ms-excel": "Excel", "text/csv": "CSV", "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word" };
const sizeText = (b) => (!b ? "" : b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);

/** A file in the post (a PDF or Excel template): a download card. */
function FileCard({ a }) {
  const meta = [KIND[a.contentType] || (a.fileName.split(".").pop() || "File").toUpperCase(), sizeText(a.size)].filter(Boolean).join(" · ");
  return (
    <Box sx={{ my: 2.5, p: 2, borderRadius: "14px", border: "1px solid #E4E7EC", bgcolor: "#F9FAFB", display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
      <Box sx={{ flex: 1, minWidth: 200 }}>
        <Typography sx={{ fontWeight: 800, fontSize: "1.02rem" }}>{a.title || a.fileName}</Typography>
        {meta && <Typography sx={{ fontSize: 13.5, color: "#667085" }}>{meta}</Typography>}
      </Box>
      <Button variant="contained" startIcon={<FiDownload />} href={a.url} download={a.fileName || true} target="_blank" rel="noopener" sx={{ fontWeight: 800, textTransform: "none", borderRadius: "10px" }}>
        Download
      </Button>
    </Box>
  );
}

const Children = ({ node, assets }) => (node.content || []).map((c, i) => <Node key={i} node={c} assets={assets} />);

const HEADINGS = { "heading-1": ["h2", "1.9rem"], "heading-2": ["h2", "1.6rem"], "heading-3": ["h3", "1.3rem"], "heading-4": ["h4", "1.1rem"], "heading-5": ["h5", "1rem"], "heading-6": ["h6", "1rem"] };

export function Node({ node, assets = {} }) {
  const t = node.nodeType;
  if (t === "text") return <Text node={node} />;
  if (t === "document") return <Children node={node} assets={assets} />;
  if (t === "paragraph") {
    if (!textOf(node).trim() && !(node.content || []).some((c) => c.nodeType !== "text")) return null;
    return (
      <Typography component="p" sx={{ fontSize: "1.08rem", lineHeight: 1.75, color: "#1D2939", my: 2 }}>
        <Children node={node} assets={assets} />
      </Typography>
    );
  }
  if (HEADINGS[t]) {
    const [tag, size] = HEADINGS[t];
    return (
      <Typography component={tag} sx={{ fontSize: size, fontWeight: 850, letterSpacing: "-0.02em", lineHeight: 1.25, mt: 4, mb: 1.5, color: "#101828" }}>
        <Children node={node} assets={assets} />
      </Typography>
    );
  }
  if (t === "unordered-list" || t === "ordered-list") {
    return (
      <Box component={t === "ordered-list" ? "ol" : "ul"} sx={{ pl: 3, my: 2, "& li": { fontSize: "1.08rem", lineHeight: 1.7, color: "#1D2939", mb: 0.5 }, "& li > p": { my: 0 } }}>
        <Children node={node} assets={assets} />
      </Box>
    );
  }
  if (t === "list-item") return <li><Children node={node} assets={assets} /></li>;
  if (t === "blockquote") {
    return (
      <Box component="blockquote" sx={{ borderLeft: "4px solid #2563EB", pl: 2.5, ml: 0, my: 3, color: "#344054", "& p": { fontSize: "1.15rem", fontStyle: "italic" } }}>
        <Children node={node} assets={assets} />
      </Box>
    );
  }
  if (t === "hr") return <Box component="hr" sx={{ border: 0, borderTop: "1px solid #E4E7EC", my: 4 }} />;
  if (t === "hyperlink") {
    const href = String(node.data?.uri || "");
    const safe = /^(https?:|mailto:|\/)/i.test(href) ? href : "#";
    const external = /^https?:/i.test(safe) && !/wisershifts\.com/i.test(safe);
    return (
      <Link href={safe} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} sx={{ color: "#2563EB", fontWeight: 600 }}>
        <Children node={node} assets={assets} />
      </Link>
    );
  }
  if (t === "asset-hyperlink") {
    // "Link to asset" on words: downloads the file (or opens the image).
    const a = assets[node.data?.target?.sys?.id];
    if (!a?.url) return <Children node={node} assets={assets} />;
    return (
      <Link href={a.url} download={a.fileName || true} target="_blank" rel="noopener" sx={{ color: "#2563EB", fontWeight: 600 }}>
        <Children node={node} assets={assets} />
      </Link>
    );
  }
  if (t === "embedded-asset-block") {
    const a = assets[node.data?.target?.sys?.id];
    if (!a?.url) return null;
    if (!isImage(a)) return <FileCard a={a} />;
    return (
      <Box component="figure" sx={{ my: 3, mx: 0 }}>
        <Box component="img" src={`${a.url}?w=1400&fm=webp&q=80`} alt={a.title || ""} loading="lazy" width={a.width || undefined} height={a.height || undefined} sx={{ width: "100%", height: "auto", borderRadius: "14px", display: "block" }} />
        {a.title && <Typography component="figcaption" sx={{ fontSize: 13, color: "#667085", mt: 1 }}>{a.title}</Typography>}
      </Box>
    );
  }
  if (t === "table") {
    return (
      <Box sx={{ overflowX: "auto", my: 3 }}>
        <Box component="table" sx={{ borderCollapse: "collapse", width: "100%", "& td, & th": { border: "1px solid #E4E7EC", p: 1, textAlign: "left", verticalAlign: "top" }, "& p": { m: 0, fontSize: "0.95rem" } }}>
          <tbody>
            <Children node={node} assets={assets} />
          </tbody>
        </Box>
      </Box>
    );
  }
  if (t === "table-row") return <tr><Children node={node} assets={assets} /></tr>;
  if (t === "table-header-cell") return <th><Children node={node} assets={assets} /></th>;
  if (t === "table-cell") return <td><Children node={node} assets={assets} /></td>;
  return <Children node={node} assets={assets} />;
}

export default function RichText({ document, assets }) {
  if (!document) return null;
  return <Node node={document} assets={assets} />;
}
