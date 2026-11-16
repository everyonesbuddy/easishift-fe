/**
 * Printable schedule exports (PDF), built from plain data so they look the
 * same everywhere: the facility's name on top, US Letter, readable type,
 * "Page 1 of 3" at the bottom.
 *
 *   rosterPdf      the month, one week at a time: people down the side, days across
 *   calendarPdf    a month calendar: who works each day, by shift
 *   openShiftsPdf  a sign-up sheet for open spots, with lines for a name and phone
 *
 * ScheduleList prepares the rows (names, roles, compact times); this file
 * only lays them out.
 */
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const C = {
  ink: [17, 24, 39],
  body: [51, 65, 85],
  muted: [100, 116, 139],
  rule: [226, 232, 240],
  head: [241, 245, 249],
  group: [248, 250, 252],
  weekend: [252, 250, 240],
  outside: [248, 250, 252],
  red: [185, 28, 28],
  redBg: [254, 242, 242],
  orange: [194, 65, 12],
  orangeBg: [255, 247, 237],
  blue: [29, 78, 216],
};

const MARGIN = 30;
const TOP = 70; // below the page header

/** "7a", "3:30p", in the facility's time zone. */
export function compactTime(value, timeZone) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true, ...(timeZone ? { timeZone } : {}) }).formatToParts(d);
  const get = (t) => parts.find((p) => p.type === t)?.value || "";
  const minute = get("minute");
  return `${get("hour")}${minute && minute !== "00" ? `:${minute}` : ""}${get("dayPeriod").toLowerCase().startsWith("p") ? "p" : "a"}`;
}

/** "7a–3p", "11p–7a". */
export const compactRange = (start, end, timeZone) => {
  const a = compactTime(start, timeZone);
  const b = compactTime(end, timeZone);
  return a && b ? `${a}–${b}` : a || b;
};

const keyToDate = (key) => {
  const [y, m, d] = String(key).split("-").map(Number);
  return new Date(y, m - 1, d);
};
const dateKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const printedAt = () => `Printed ${new Date().toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}`;

/** Facility name, title, a line under it; once on every page. */
function drawHeader(doc, { facility, title, note }) {
  const page = doc.internal.getCurrentPageInfo().pageNumber;
  doc.headerPages = doc.headerPages || new Set();
  if (doc.headerPages.has(page)) return;
  doc.headerPages.add(page);
  const w = doc.internal.pageSize.getWidth();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...C.muted);
  doc.text(facility || "Schedule", MARGIN, 32);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...C.ink);
  doc.text(title, MARGIN, 50);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...C.muted);
  doc.text(printedAt(), w - MARGIN, 32, { align: "right" });
  if (note) doc.text(doc.splitTextToSize(note, w / 2 - MARGIN), w - MARGIN, 44, { align: "right" });
  doc.setDrawColor(...C.ink);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, 58, w - MARGIN, 58);
}

/** "Page 1 of 3" and "WiserShifts" on every page (once the page count is known). */
function drawFooters(doc) {
  const total = doc.internal.getNumberOfPages();
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= total; i += 1) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...C.muted);
    doc.text(`Page ${i} of ${total}`, w - MARGIN, h - 16, { align: "right" });
    doc.text("WiserShifts", MARGIN, h - 16);
  }
}

const newDoc = (orientation) => new jsPDF({ orientation, unit: "pt", format: "letter" });

/** Split date keys into Sunday-to-Saturday weeks; days outside the range are null. */
export function weeksOf(days) {
  if (!days.length) return [];
  const first = keyToDate(days[0]);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  const inRange = new Set(days);
  const last = days[days.length - 1];
  const weeks = [];
  const cursor = new Date(start);
  while (dateKey(cursor) <= last) {
    const week = [];
    for (let i = 0; i < 7; i += 1) {
      const k = dateKey(cursor);
      week.push(inRange.has(k) ? k : null);
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

const dayHead = (k, { withMonth = false } = {}) => {
  const d = keyToDate(k);
  return `${d.toLocaleDateString(undefined, { weekday: "short" })} ${withMonth ? d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : d.getDate()}`;
};

/**
 * Roster: one table per week so the type stays readable.
 * rows: { type: "header", label }
 *     | { type: "coverage", cells: { [dateKey]: "Open: CNA 7a–3p" } }
 *     | { type: "person", name, sub, cells: { [dateKey]: [{ text, tone: "out" | "draft" | undefined }] } }
 * Only people with a shift that week (and open spots that week) are listed.
 */
export function rosterPdf({ facility, period, days, rows }) {
  const doc = newDoc("landscape");
  const header = { facility, title: `Roster · ${period}`, note: "Dashed box = not sent to staff yet · Red = called out · Orange = open" };
  const pageW = doc.internal.pageSize.getWidth();
  const nameW = 120;
  const dayW = (pageW - MARGIN * 2 - nameW) / 7;
  let y = TOP;
  let printed = 0;

  for (const week of weeksOf(days)) {
    const inWeek = week.filter(Boolean);
    const body = [];
    const meta = [];
    let pendingHeader = null;
    for (const r of rows) {
      if (r.type === "header") {
        pendingHeader = r.label;
        continue;
      }
      const has = inWeek.some((k) => (r.type === "coverage" ? r.cells[k] : r.cells[k]?.length));
      if (!has) continue;
      if (pendingHeader) {
        body.push([{ content: pendingHeader, colSpan: 8 }]);
        meta.push({ type: "header" });
        pendingHeader = null;
      }
      if (r.type === "coverage") {
        body.push(["Open spots", ...week.map((k) => (k && r.cells[k]) || "")]);
        meta.push({ type: "coverage" });
      } else {
        body.push([`${r.name}${r.sub ? `\n${r.sub}` : ""}`, ...week.map((k) => (k ? (r.cells[k] || []).map((s) => s.text).join("\n") : ""))]);
        meta.push({ type: "person", week, cells: r.cells });
      }
    }
    if (!body.length) continue;

    const label = `Week of ${keyToDate(inWeek[0]).toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${keyToDate(inWeek[inWeek.length - 1]).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
    if (printed && y > doc.internal.pageSize.getHeight() - 140) {
      doc.addPage();
      y = TOP;
    }
    drawHeader(doc, header);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...C.ink);
    doc.text(label, MARGIN, y + 6);

    autoTable(doc, {
      startY: y + 12,
      head: [["Staff", ...week.map((k, i) => (k ? dayHead(k) : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i]))]],
      body,
      theme: "grid",
      showHead: "everyPage",
      rowPageBreak: "avoid",
      margin: { left: MARGIN, right: MARGIN, top: TOP, bottom: 34 },
      styles: { font: "helvetica", fontSize: 7.5, cellPadding: 3.5, textColor: C.body, lineColor: C.rule, lineWidth: 0.4, valign: "top", overflow: "linebreak" },
      headStyles: { fillColor: C.head, textColor: C.ink, fontStyle: "bold", fontSize: 8 },
      columnStyles: { 0: { cellWidth: nameW }, ...Object.fromEntries(week.map((_, i) => [i + 1, { cellWidth: dayW }])) },
      didParseCell: (d) => {
        const col = d.column.index;
        const k = col > 0 ? week[col - 1] : null;
        if (d.section === "head") {
          if (col > 0 && !k) d.cell.styles.textColor = C.muted;
          return;
        }
        const m = meta[d.row.index];
        if (col > 0 && !k) d.cell.styles.fillColor = C.outside;
        else if (col > 0 && [0, 6].includes(keyToDate(k).getDay())) d.cell.styles.fillColor = C.weekend;
        if (m.type === "header") {
          Object.assign(d.cell.styles, { fillColor: C.group, fontStyle: "bold", textColor: C.ink, fontSize: 8 });
        } else if (m.type === "coverage") {
          if (col === 0) Object.assign(d.cell.styles, { textColor: C.orange, fontStyle: "bold" });
          else if (d.cell.raw) Object.assign(d.cell.styles, { textColor: C.orange, fillColor: C.orangeBg });
        } else if (col === 0) {
          d.cell.styles.textColor = C.ink;
        } else if (k) {
          const shifts = m.cells[k] || [];
          if (shifts.length && shifts.every((s) => s.tone === "out")) Object.assign(d.cell.styles, { textColor: C.red, fillColor: C.redBg });
        }
      },
      didDrawCell: (d) => {
        // Name in bold, role underneath in grey; draft shifts get a dashed box.
        if (d.section !== "body") return;
        const m = meta[d.row.index];
        if (m?.type !== "person") return;
        if (d.column.index === 0) {
          const [name, ...rest] = String(d.cell.raw).split("\n");
          doc.setFillColor(...(Array.isArray(d.cell.styles.fillColor) ? d.cell.styles.fillColor : [255, 255, 255]));
          doc.rect(d.cell.x + 0.5, d.cell.y + 0.5, d.cell.width - 1, d.cell.height - 1, "F");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(...C.ink);
          doc.text(name, d.cell.x + 3.5, d.cell.y + 10.5, { maxWidth: d.cell.width - 7 });
          if (rest.length) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);
            doc.setTextColor(...C.muted);
            doc.text(rest.join(" "), d.cell.x + 3.5, d.cell.y + 19.5, { maxWidth: d.cell.width - 7 });
          }
          return;
        }
        const k = m.week[d.column.index - 1];
        const shifts = (k && m.cells[k]) || [];
        if (shifts.length && shifts.every((s) => s.tone === "draft")) {
          doc.setDrawColor(...C.muted);
          doc.setLineDashPattern([1.5, 1.5], 0);
          doc.setLineWidth(0.5);
          doc.rect(d.cell.x + 1.5, d.cell.y + 1.5, d.cell.width - 3, d.cell.height - 3);
          doc.setLineDashPattern([], 0);
        }
      },
      willDrawPage: () => drawHeader(doc, header),
    });
    // Leave room for the role under the name.
    y = doc.lastAutoTable.finalY + 22;
    printed += 1;
  }
  if (!printed) {
    drawHeader(doc, header);
    doc.setFontSize(10);
    doc.setTextColor(...C.muted);
    doc.text("No shifts this month.", MARGIN, TOP + 10);
  }
  drawFooters(doc);
  return doc;
}

/**
 * Calendar: a month grid, each day listing its shifts as "7a–3p  Ann L., Tom R."
 * days: [{ key, entries: [{ time, area, names: [] }], open: ["2 open · CNA 7a–3p"] }]
 */
export function calendarPdf({ facility, period, days }) {
  const doc = newDoc("landscape");
  const header = { facility, title: `Schedule · ${period}`, note: "Each line is a shift and who's on it." };
  const byKey = new Map(days.map((d) => [d.key, d]));
  const weeks = weeksOf(days.map((d) => d.key));
  const pageW = doc.internal.pageSize.getWidth();
  const colW = (pageW - MARGIN * 2) / 7;
  const lineH = 8.6;
  const pad = 4;

  // Lay out each day's lines up front so rows get the right height.
  const linesFor = (k) => {
    const day = byKey.get(k);
    if (!day) return [];
    doc.setFontSize(7);
    const out = [];
    for (const e of day.entries) {
      const lead = `${e.time}${e.area ? ` · ${e.area}` : ""}`;
      doc.setFont("helvetica", "bold");
      const leadW = doc.getTextWidth(`${lead}  `);
      doc.setFont("helvetica", "normal");
      // Wrap between names, never inside one; later lines indent a little.
      const full = colW - pad * 2;
      let line = "";
      let first = true;
      const push = () => {
        out.push({ lead: first ? lead : "", leadW: first ? leadW : 6, text: line });
        first = false;
        line = "";
      };
      e.names.forEach((name, i) => {
        const piece = `${name}${i < e.names.length - 1 ? "," : ""}`;
        const next = line ? `${line} ${piece}` : piece;
        if (line && doc.getTextWidth(next) > full - (first ? leadW : 6)) {
          push();
          line = piece;
        } else line = next;
      });
      if (line || first) push();
    }
    for (const o of day.open || []) out.push({ open: true, text: o });
    return out;
  };

  drawHeader(doc, header);
  autoTable(doc, {
    startY: TOP,
    head: [["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]],
    body: weeks.map((w) => w.map(() => "")),
    theme: "grid",
    showHead: "everyPage",
    rowPageBreak: "avoid",
    margin: { left: MARGIN, right: MARGIN, top: TOP, bottom: 34 },
    styles: { font: "helvetica", fontSize: 7, lineColor: C.rule, lineWidth: 0.4, cellPadding: pad },
    headStyles: { fillColor: C.head, textColor: C.ink, fontStyle: "bold", halign: "center" },
    columnStyles: Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((i) => [i, { cellWidth: colW }])),
    didParseCell: (d) => {
      if (d.section !== "body") return;
      const k = weeks[d.row.index][d.column.index];
      d.cell.styles.minCellHeight = Math.max(64, 16 + linesFor(k).length * lineH + pad);
      if (!k) d.cell.styles.fillColor = C.outside;
      else if ([0, 6].includes(d.column.index)) d.cell.styles.fillColor = C.weekend;
    },
    didDrawCell: (d) => {
      if (d.section !== "body") return;
      const k = weeks[d.row.index][d.column.index];
      if (!k) return;
      const x = d.cell.x + pad;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...C.ink);
      doc.text(String(keyToDate(k).getDate()), x, d.cell.y + 11);
      let y = d.cell.y + 21;
      doc.setFontSize(7);
      for (const l of linesFor(k)) {
        if (l.open) {
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...C.orange);
          doc.text(l.text, x, y, { maxWidth: d.cell.width - pad * 2 });
        } else {
          if (l.lead) {
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...C.ink);
            doc.text(l.lead, x, y);
          }
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...C.body);
          doc.text(l.text, x + l.leadW, y);
        }
        y += lineH;
      }
    },
    willDrawPage: () => drawHeader(doc, header),
  });
  drawFooters(doc);
  return doc;
}

/**
 * Sign-up sheet for open spots, to pin on the break-room wall.
 * spots: [{ dayKey, time, role, area }], one per open spot, in order.
 */
export function openShiftsPdf({ facility, period, spots, contact }) {
  const doc = newDoc("portrait");
  const header = { facility, title: `Open shifts · ${period}` };
  const ask = `Can you take one of these shifts? Write your name and phone number on its line. ${contact ? `${contact} will` : "Your scheduler will"} confirm with you.`;
  const body = [];
  const meta = [];
  let lastDay = null;
  for (const s of spots) {
    if (s.dayKey !== lastDay) {
      body.push([{ content: keyToDate(s.dayKey).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }), colSpan: 5 }]);
      meta.push("day");
      lastDay = s.dayKey;
    }
    body.push([s.time, s.role, s.area || "", "", ""]);
    meta.push("spot");
  }
  drawHeader(doc, header);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...C.ink);
  doc.text(doc.splitTextToSize(ask, doc.internal.pageSize.getWidth() - MARGIN * 2), MARGIN, TOP + 4);
  if (!spots.length) {
    doc.setTextColor(...C.muted);
    doc.text("No open shifts.", MARGIN, TOP + 36);
  }
  autoTable(doc, {
    startY: TOP + 22,
    head: [["Shift", "Role", "Area", "Your name", "Phone"]],
    body,
    theme: "plain",
    showHead: "everyPage",
    rowPageBreak: "avoid",
    margin: { left: MARGIN, right: MARGIN, top: TOP, bottom: 34 },
    styles: { font: "helvetica", fontSize: 9.5, textColor: C.body, cellPadding: { top: 7, bottom: 7, left: 5, right: 5 }, valign: "bottom" },
    headStyles: { fillColor: C.head, textColor: C.ink, fontStyle: "bold", fontSize: 9 },
    columnStyles: { 0: { cellWidth: 72, fontStyle: "bold", textColor: C.ink }, 1: { cellWidth: 90 }, 2: { cellWidth: 80 }, 4: { cellWidth: 100 } },
    didParseCell: (d) => {
      if (d.section === "body" && meta[d.row.index] === "day") {
        Object.assign(d.cell.styles, { fontStyle: "bold", textColor: C.ink, fontSize: 10.5, cellPadding: { top: 12, bottom: 4, left: 0, right: 0 } });
      }
    },
    didDrawCell: (d) => {
      // A line to write on under "Your name" and "Phone".
      if (d.section !== "body" || meta[d.row.index] !== "spot") return;
      doc.setDrawColor(...C.rule);
      doc.setLineWidth(0.6);
      doc.line(d.cell.x, d.cell.y + d.cell.height, d.cell.x + d.cell.width, d.cell.y + d.cell.height);
      if (d.column.index >= 3) {
        doc.setDrawColor(...C.muted);
        doc.line(d.cell.x + 4, d.cell.y + d.cell.height - 6, d.cell.x + d.cell.width - 8, d.cell.y + d.cell.height - 6);
      }
    },
    willDrawPage: () => drawHeader(doc, header),
  });
  drawFooters(doc);
  return doc;
}
