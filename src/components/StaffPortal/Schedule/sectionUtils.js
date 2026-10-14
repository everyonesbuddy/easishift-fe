import { getRoleDisplayName } from "../../../constants/industryRoles";
import { toLabel } from "../../../utils/labels";
import { tagKey } from "../../../utils/tags";

/**
 * "Everything" or "A section" (some roles and/or unit areas), for Publish
 * and Auto-fill when several schedulers share a week.
 * value: { mode: "all" | "section", roles: [], areas: [] }
 */
export const emptySection = { mode: "all", roles: [], areas: [] };

/** Roles and areas that appear in this week (open spots or shifts). */
export const sectionOptions = (data) => {
  const roles = new Map();
  const areas = new Map();
  for (const item of [...(data?.coverage || []), ...(data?.schedules || [])]) {
    if (item.role) roles.set(tagKey(item.role), item.role);
    if (item.unitArea) areas.set(tagKey(item.unitArea), item.unitArea);
  }
  const sort = (m) => [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  return {
    roles: sort(roles).map(([key, raw]) => ({ key, label: getRoleDisplayName(raw) })),
    areas: sort(areas).map(([key, raw]) => ({ key, label: toLabel(raw) })),
  };
};

/** Does a shift / open spot belong to the chosen section? */
export const inSection = (item, value) => {
  if (!value || value.mode !== "section") return true;
  if (value.roles.length && !value.roles.includes(tagKey(item?.role))) return false;
  if (value.areas.length && !value.areas.includes(tagKey(item?.unitArea))) return false;
  return true;
};

/** Request body fields for the chosen section ({} = everything). */
export const sectionBody = (value) =>
  value?.mode === "section" ? { roles: value.roles, areas: value.areas } : {};

/** "Concierge · Assisted Living" */
export const sectionLabel = (value, options) => {
  if (!value || value.mode !== "section") return "Everything";
  const name = (list, key) => list.find((o) => o.key === key)?.label || toLabel(key);
  const parts = [
    value.roles.map((k) => name(options.roles, k)).join(", "),
    value.areas.map((k) => name(options.areas, k)).join(", "),
  ].filter(Boolean);
  return parts.join(" · ") || "Everything";
};

export const sectionChosen = (value) =>
  value?.mode !== "section" || value.roles.length > 0 || value.areas.length > 0;

