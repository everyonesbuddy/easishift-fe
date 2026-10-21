import { useCallback, useEffect, useRef, useState } from "react";
import api from "../config/api";
import { useAuth } from "../context/AuthContext";

export const EMPTY_FILTER = { roles: [], areas: [] };

const clean = (f) => ({
  roles: Array.isArray(f?.roles) ? f.roles : [],
  areas: Array.isArray(f?.areas) ? f.areas : [],
});

/**
 * The roles / unit areas this scheduler chose to see on a page
 * ("schedule" = week view, "needs" = Weekly Needs). Saved on their account
 * so it follows them between the website and the app.
 */
export default function useViewFilter(kind) {
  const { user, updateCurrentUser } = useAuth();
  const saved = user?.viewFilters?.[kind];
  const [filter, setFilterState] = useState(() => clean(saved));
  const timer = useRef(null);
  const userId = user?._id;

  // Pick up the saved filter once the session loads (or the user changes).
  useEffect(() => {
    setFilterState(clean(saved));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const setFilter = useCallback(
    (next) => {
      const value = clean(next);
      setFilterState(value);
      updateCurrentUser?.({ viewFilters: { ...(user?.viewFilters || {}), [kind]: value } });
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        api.patch("/auth/me", { viewFilters: { [kind]: value } }).catch((err) => {
          // Still works for this visit; it just won't be remembered.
          console.warn("Couldn't save the view filter", err?.response?.data?.message || err?.message);
        });
      }, 400);
    },
    [kind, updateCurrentUser, user?.viewFilters],
  );

  return [filter, setFilter];
}
