import { useCallback, useEffect, useState } from "react";
import api from "../config/api";

// Fetches GET /stripe/plans, the single source of truth for pricing,
// seat usage, current plan, and trial eligibility.
export default function useBillingPlans() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/stripe/plans");
      setData(res.data);
    } catch (err) {
      setError(
        err?.response?.data?.message || err.message || "Failed to load plans",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  return { data, loading, error, refetch: fetchPlans };
}
