// "memory_care" -> "Memory Care", "cna" -> "CNA", "med pass" -> "Med Pass".
const ACRONYMS = new Set(["cna", "lpn", "lvn", "rn", "np", "cma", "cmt", "hha", "pca", "qmap", "don", "adon", "cpr", "bls", "acls"]);

export const toLabel = (value) =>
  String(value || "")
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const lower = word.toLowerCase();
      return ACRONYMS.has(lower) ? lower.toUpperCase() : lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
