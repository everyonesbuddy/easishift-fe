import axios from "axios";

// Default API base (change if you want a hard-coded production URL)
const DEFAULT_API_BASE = "http://localhost:5000";

// Prefer Vite env var VITE_API_BASE. import.meta is undefined in older runtimes, so guard it.
const viteBase =
  typeof import.meta !== "undefined" && import.meta.env
    ? import.meta.env.VITE_API_BASE
    : undefined;

export const API_BASE = viteBase || DEFAULT_API_BASE;

const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  withCredentials: true,
});

export default api;
