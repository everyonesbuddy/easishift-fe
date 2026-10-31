// Read an .xlsx in the browser and turn one sheet into CSV text for HQ imports.

const cellText = (v) => {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    if (v.hyperlink) return String(v.hyperlink).replace(/^mailto:/, "");
    const link = typeof v.formula === "string" && v.formula.match(/HYPERLINK\(\s*"([^"]+)"/i);
    if (link) return link[1];
    if (Array.isArray(v.richText)) return v.richText.map((r) => r.text).join("");
    if ("result" in v) return cellText(v.result);
    if ("text" in v) return String(v.text);
    return ""; // errors, formulas with no cached result
  }
  return String(v);
};

const esc = (s) => (/[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

export async function readWorkbook(file) {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  return wb;
}

export function sheetToCsv(worksheet) {
  const lines = [];
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    const values = Array.isArray(row.values) ? row.values.slice(1) : [];
    lines.push(values.map((v) => esc(cellText(v))).join(","));
  });
  return lines.join("\n");
}

/** Best sheet for an import kind, by name. */
export function guessSheet(names, kind) {
  const find = (re) => names.find((n) => re.test(n));
  if (kind === "contacts") return find(/lead\s*bank/i) || names[0];
  if (kind === "activities") return find(/outreach/i) || names[0];
  if (kind === "facilities") return find(/^\s*[1-4]\s/) || names[0];
  if (kind === "linkedin") return find(/all\s*posts/i) || find(/post/i) || names[0];
  return names[0];
}
