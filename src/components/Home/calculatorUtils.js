import { useEffect } from "react";

export const WEEKS_PER_YEAR = 52;

export const formatMoney = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.max(0, value));

export const formatNumber = (value) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);

export const readNumberParam = (name, fallback, min, max) => {
  const rawValue = new URLSearchParams(window.location.search).get(name);
  if (rawValue === null || rawValue.trim() === "") return fallback;

  const value = Number(rawValue);
  return Number.isFinite(value) && value >= min && value <= max
    ? value
    : fallback;
};

export const copyCalculatorLink = async (values) => {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => params.set(key, value));
  const url = `${window.location.origin}${window.location.pathname}?${params}`;
  await navigator.clipboard.writeText(url);
  window.history.replaceState({}, "", `${window.location.pathname}?${params}`);
};

export const usePageMetadata = (title, description) => {
  useEffect(() => {
    const previousTitle = document.title;
    let descriptionTag = document.querySelector('meta[name="description"]');
    const previousDescription = descriptionTag?.getAttribute("content");

    if (!descriptionTag) {
      descriptionTag = document.createElement("meta");
      descriptionTag.setAttribute("name", "description");
      document.head.appendChild(descriptionTag);
    }

    document.title = title;
    descriptionTag.setAttribute("content", description);

    return () => {
      document.title = previousTitle;
      if (previousDescription) {
        descriptionTag.setAttribute("content", previousDescription);
      }
    };
  }, [description, title]);
};
