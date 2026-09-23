import { useEffect } from "react";

export const WEEKS_PER_YEAR = 52;

const BEEHIIV_MAGIC_LINK_TEMPLATE =
  "https://magic.beehiiv.com/v1/d46e492b-b716-407d-80d5-80ad8b9b4512?email=<email>";
const BEEHIIV_CAPTURE_STORAGE_KEY = "wisershifts.beehiivCapture.v1";
const MAX_CAPTURED_EMAILS = 50;
const sessionCaptureFingerprints = new Set();

const fingerprintEmail = (email) => {
  const normalizedEmail = email.trim().toLowerCase();
  let hash = 2166136261;

  for (let index = 0; index < normalizedEmail.length; index += 1) {
    hash ^= normalizedEmail.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
};

const readCaptureFingerprints = () => {
  try {
    const storedValue = window.localStorage.getItem(
      BEEHIIV_CAPTURE_STORAGE_KEY,
    );
    const parsedValue = storedValue ? JSON.parse(storedValue) : null;
    return Array.isArray(parsedValue?.fingerprints)
      ? parsedValue.fingerprints.filter(
          (fingerprint) => typeof fingerprint === "string",
        )
      : [];
  } catch {
    return [];
  }
};

const rememberCaptureFingerprint = (fingerprint) => {
  sessionCaptureFingerprints.add(fingerprint);

  try {
    const fingerprints = [
      fingerprint,
      ...readCaptureFingerprints().filter((value) => value !== fingerprint),
    ].slice(0, MAX_CAPTURED_EMAILS);
    window.localStorage.setItem(
      BEEHIIV_CAPTURE_STORAGE_KEY,
      JSON.stringify({ fingerprints }),
    );
  } catch {
    // Session memory still prevents repeat captures when storage is unavailable.
  }
};

export const openBeehiivCaptureOnce = (email) => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return false;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const fingerprint = fingerprintEmail(normalizedEmail);
  const hasBeenCaptured =
    sessionCaptureFingerprints.has(fingerprint) ||
    readCaptureFingerprints().includes(fingerprint);

  if (hasBeenCaptured) return false;

  const anchor = document.createElement("a");
  anchor.href = BEEHIIV_MAGIC_LINK_TEMPLATE.replace(
    "<email>",
    encodeURIComponent(normalizedEmail),
  );
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  rememberCaptureFingerprint(fingerprint);
  return true;
};

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
