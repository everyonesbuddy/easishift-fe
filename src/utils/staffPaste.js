/**
 * Turns a pasted list into staff rows for POST /staff/bulk.
 * One person per line, in any order after the name:
 *   "Kim Tran, 555 123 4567, CNA"  or  "Kim Tran, kim@x.com, cna"
 * Commas or tabs (pasting from a spreadsheet) both work.
 */
export const parseStaffLines = (text, defaultRole) =>
  String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line
        .split(/[,\t]/)
        .map((part) => part.trim())
        .filter(Boolean);
      const row = { name: parts[0] || "" };
      for (const part of parts.slice(1)) {
        if (part.includes("@")) row.email = part;
        else if (
          /\d{4,}/.test(part.replace(/\D/g, "")) &&
          /^[+\d\s().-]+$/.test(part)
        )
          row.phone = part;
        else row.role = part;
      }
      if (!row.role && defaultRole) row.role = defaultRole;
      return row;
    });
