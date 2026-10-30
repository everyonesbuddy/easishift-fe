import { Box, Link, Typography } from "@mui/material";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

// A post body written as Markdown (a Long text field in Contentful) instead
// of Rich text. Same look as RichText. Raw HTML is not rendered.

const FILE = /\.(pdf|xlsx?|csv|docx?)(\?|#|$)/i;
const fullUrl = (u = "") => (u.startsWith("//") ? `https:${u}` : u);
const safeUrl = (u) => {
  const href = fullUrl(String(u || ""));
  return /^(https?:|mailto:|\/(?!\/))/i.test(href) ? href : "#";
};

function A({ href, children }) {
  const url = safeUrl(href);
  const file = FILE.test(url);
  const external = /^https?:/i.test(url) && !/wisershifts\.com/i.test(url);
  return (
    <Link href={url} {...(file ? { download: true } : {})} {...(external || file ? { target: "_blank", rel: "noopener noreferrer" } : {})} sx={{ color: "#2563EB", fontWeight: 600 }}>
      {children}
    </Link>
  );
}

const p = { fontSize: "1.08rem", lineHeight: 1.75, color: "#1D2939" };
const h = (component, fontSize) =>
  function Heading({ children }) {
    return <Typography component={component} sx={{ fontSize, fontWeight: 850, letterSpacing: "-0.02em", lineHeight: 1.25, mt: 4, mb: 1.5, color: "#101828" }}>{children}</Typography>;
  };

const components = {
  p: ({ children }) => <Typography component="p" sx={{ ...p, my: 2 }}>{children}</Typography>,
  h1: h("h2", "1.9rem"),
  h2: h("h2", "1.6rem"),
  h3: h("h3", "1.3rem"),
  h4: h("h4", "1.1rem"),
  a: A,
  ul: ({ children }) => <Box component="ul" sx={{ pl: 3, my: 2, "& li": { ...p, mb: 0.5 } }}>{children}</Box>,
  ol: ({ children }) => <Box component="ol" sx={{ pl: 3, my: 2, "& li": { ...p, mb: 0.5 } }}>{children}</Box>,
  blockquote: ({ children }) => <Box component="blockquote" sx={{ borderLeft: "4px solid #2563EB", pl: 2, ml: 0, my: 3, color: "#344054" }}>{children}</Box>,
  hr: () => <Box component="hr" sx={{ border: 0, borderTop: "1px solid #E4E7EC", my: 4 }} />,
  img: ({ src, alt }) => {
    const url = safeUrl(src);
    // An inserted PDF or Excel file is a download, not a picture.
    if (FILE.test(url)) return <A href={url}>{alt || "Download"}</A>;
    return (
      <Box component="figure" sx={{ my: 3, mx: 0 }}>
        <Box component="img" src={url} alt={alt || ""} loading="lazy" sx={{ width: "100%", height: "auto", borderRadius: "14px", display: "block" }} />
      </Box>
    );
  },
  table: ({ children }) => (
    <Box sx={{ overflowX: "auto", my: 3 }}>
      <Box component="table" sx={{ borderCollapse: "collapse", width: "100%", "& td, & th": { border: "1px solid #E4E7EC", p: 1, textAlign: "left", verticalAlign: "top", fontSize: "0.95rem" } }}>{children}</Box>
    </Box>
  ),
};

export default function MarkdownBody({ text }) {
  return (
    <Markdown remarkPlugins={[remarkGfm]} components={components}>
      {text}
    </Markdown>
  );
}
