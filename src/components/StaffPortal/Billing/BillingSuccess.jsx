import { useEffect, useRef, useState } from "react";
import { Box, Button, CircularProgress, Container, Paper, Typography } from "@mui/material";
import { FiCheckCircle } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";

/**
 * After Stripe checkout. Stripe tells our backend a moment later (webhook),
 * so check the plan a few times. If the new plan is smaller than the team,
 * the next step is choosing who to keep.
 */
export default function BillingSuccess() {
  const navigate = useNavigate();
  const { refreshSession, plan, usage, session } = useAuth();
  const [waiting, setWaiting] = useState(true);
  const startedOn = useRef(session?.paidPlan || "free");

  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    const tick = async () => {
      tries += 1;
      const s = await refreshSession?.();
      // paidPlan turns from "free" once Stripe has told us.
      const done = s?.paidPlan && s.paidPlan !== "free" && s.paidPlan !== startedOn.current;
      if (cancelled) return;
      if (done || tries >= 6) setWaiting(false);
      else setTimeout(tick, 2000);
    };
    tick();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const needsFit = Boolean(usage?.overLimit);

  return (
    <Container maxWidth="sm" sx={{ mt: 8, mb: 8 }}>
      <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, border: "1px solid #E5E7EB", textAlign: "center" }}>
        <Box sx={{ color: "#16A34A", display: "flex", justifyContent: "center", mb: 2 }}>
          <FiCheckCircle size={44} />
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
          Payment successful
        </Typography>
        {waiting ? (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1.5, color: "text.secondary" }}>
            <CircularProgress size={18} />
            <Typography>Setting up your plan…</Typography>
          </Box>
        ) : needsFit ? (
          <>
            <Typography sx={{ color: "text.secondary", mb: 3 }}>
              You're on {plan?.label || "your new plan"}. It includes {plan?.limits?.staff} active staff and{" "}
              {plan?.limits?.schedulers} schedulers, and you have {usage?.staff} and {usage?.schedulers}. Choose who
              to keep; adding people and publishing new weeks are paused until then.
            </Typography>
            <Button variant="contained" onClick={() => navigate("/billing/keep")} sx={{ textTransform: "none", fontWeight: 700 }}>
              Choose who to keep
            </Button>
          </>
        ) : (
          <>
            <Typography sx={{ color: "text.secondary", mb: 3 }}>
              {plan?.key && plan.key !== "free"
                ? `You're on ${plan.label}. Everything is unlocked.`
                : "Your plan will update in a moment. You can carry on; refresh Plan & Billing if it hasn't changed."}
            </Typography>
            <Button variant="contained" onClick={() => navigate("/schedule")} sx={{ textTransform: "none", fontWeight: 700 }}>
              Go to the schedule
            </Button>
          </>
        )}
      </Paper>
    </Container>
  );
}
