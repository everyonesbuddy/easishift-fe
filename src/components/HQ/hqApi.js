// API client for HQ. HQ has its own sign-in, separate from workspace logins:
// its token lives under its own key and is never sent to workspace routes.
import axios from "axios";
import { API_BASE } from "../../config/api";

const KEY = "wisershifts_hq_token";

export const getHqToken = () => {
  try {
    return localStorage.getItem(KEY) || "";
  } catch {
    return "";
  }
};
export const setHqToken = (t) => {
  try {
    if (t) localStorage.setItem(KEY, t);
    else localStorage.removeItem(KEY);
  } catch {
    // storage blocked: the session lasts until the tab closes
  }
};

const hqApi = axios.create({ baseURL: `${API_BASE}/api/v1` });

hqApi.interceptors.request.use((config) => {
  const t = getHqToken();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

// Session expired or signed out elsewhere: back to the HQ sign-in.
hqApi.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err?.config?.url || "";
    if (err?.response?.status === 401 && !url.includes("/hq/auth/login")) {
      setHqToken("");
      if (!window.location.pathname.startsWith("/hq/login")) {
        window.location.assign(`/hq/login?next=${encodeURIComponent(window.location.pathname)}`);
      }
    }
    return Promise.reject(err);
  },
);

export default hqApi;
