import axios from "axios";

// Default API base (used when nothing else is provided)
const DEFAULT_API_BASE = "http://localhost:5000";

// Runtime detection: let the deployed bundle decide the backend using
// the browser location. In production prefer setting VITE_API_BASE at
// build time, but if that isn't available we detect hostname here.
const runtimeBase =
  typeof window !== "undefined"
    ? // If running on localhost (dev), use local backend; otherwise use production host
      window.location.hostname.includes("localhost")
      ? "http://localhost:5000"
      : "https://easishift-be-1df7f9547644.herokuapp.com"
    : undefined;
export const API_BASE = runtimeBase || DEFAULT_API_BASE;

const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  withCredentials: true,
});

export default api;
