export const AUDIENCES = {
  schedulers: { label: "For schedulers", color: "#067647", bg: "#ECFDF3" },
  directors: { label: "For DONs and administrators", color: "#6941C6", bg: "#F4F3FF" },
  operators: { label: "For regional operators", color: "#C11574", bg: "#FDF2FA" },
};

export const postDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }) : "");
