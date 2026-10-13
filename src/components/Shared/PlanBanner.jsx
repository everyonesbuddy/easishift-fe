import { Box, Button, Typography } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { daysLeft } from "../../config/billingPlans";

const TONES = {
  info: { bg: "#EFF6FF", fg: "#1E3A8A", line: "#BFDBFE" },
  warn: { bg: "#FFFBEB", fg: "#78350F", line: "#FDE68A" },
};

/**
 * One thin line under the top bar for plan states that change what people
 * can do: a running trial, being over the plan's limits, or a scheduler who
 * is read-only until the owner sorts it out.
 */
export default function PlanBanner() {
  const { session, can } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  if (!session || pathname.startsWith("/setup")) return null;

  const isOwner = can("billing.manage");
  const paying =
    session.paidPlan &&
    session.paidPlan !== "free" &&
    ["active", "trialing", "past_due"].includes(session.subscriptionStatus);
  const onTrial = !paying && session.plan?.key !== "free" && session.trialEndsAt;
  const grace = session.grace;

  let tone = null;
  let text = "";
  let action = null;

  if (session.readOnlyReason) {
    tone = "warn";
    text =
      "You can look but not make changes right now: this workspace has more schedulers than its plan allows. Ask the owner to upgrade or choose who stays a scheduler.";
  } else if (session.usage?.overLimit && isOwner) {
    tone = "warn";
    const planName = session.plan?.label || "Free";
    const graceOpen = grace?.available && !grace.weekStart;
    text = graceOpen
      ? `Your trial ended and you have more people than ${planName} allows. You can publish one more week until ${new Date(grace.endsAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}; after that, publishing pauses until you upgrade or choose who to keep. Nothing was deleted.`
      : `You have more people than ${planName} allows, so publishing new weeks is paused until you upgrade or choose who to keep. Nothing was deleted.`;
    action = { label: "Choose who to keep", to: "/billing/keep", secondary: { label: "Upgrade", to: "/billing" } };
  } else if (onTrial && isOwner) {
    const left = daysLeft(session.trialEndsAt);
    tone = left <= 3 ? "warn" : "info";
    text = `Starter trial: ${left} day${left === 1 ? "" : "s"} left. After that you go back to Free; nothing is deleted.`;
    action = { label: "Choose a plan", to: "/billing" };
  }

  if (!tone || pathname.startsWith("/billing")) return null;
  const colors = TONES[tone];

  return (
    <Box
      role="status"
      sx={{
        px: { xs: 2, sm: 3 },
        py: 1,
        bgcolor: colors.bg,
        borderBottom: `1px solid ${colors.line}`,
        display: "flex",
        alignItems: "center",
        gap: 2,
        flexWrap: "wrap",
        justifyContent: "space-between",
      }}
    >
      <Typography variant="body2" sx={{ color: colors.fg, fontWeight: 500 }}>
        {text}
      </Typography>
      {action && (
        <Box sx={{ display: "flex", gap: 1 }}>
          {action.secondary && (
            <Button size="small" onClick={() => navigate(action.secondary.to)} sx={{ textTransform: "none", color: colors.fg }}>
              {action.secondary.label}
            </Button>
          )}
          <Button
            size="small"
            variant="outlined"
            onClick={() => navigate(action.to)}
            sx={{ textTransform: "none", fontWeight: 700, color: colors.fg, borderColor: colors.line, bgcolor: "#fff" }}
          >
            {action.label}
          </Button>
        </Box>
      )}
    </Box>
  );
}
