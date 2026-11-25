import { useState } from "react";
import { Box, Button, Checkbox, FormControlLabel, Typography } from "@mui/material";

// The exact words they agree to (the backend keeps the same wording with their yes).
const CONSENT_WORDING =
  "Text me my schedule: shift reminders, schedule changes, open shifts I can pick up and replies to my requests. Msg frequency varies. Msg & data rates may apply. Reply STOP to opt out, HELP for help.";

/**
 * "Text me my schedule": their own yes to texts. The box starts unticked and
 * nothing is sent until they tick it and press the button; then one
 * confirmation text. Shown only when their workplace texts, they have a
 * number on file, and they haven't said yes yet.
 */
export default function TextConsentCard({ client, staff, onChanged }) {
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const off = staff?.smsStatus === "opted_out";

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await client.post("/text-consent", { agree: true });
      onChanged?.(res.data?.smsStatus || "opted_in", res.data?.confirmationSent);
    } catch (err) {
      setError(err?.response?.data?.message || "Couldn't turn on texts. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ bgcolor: "#fff", borderRadius: "14px", border: "1px solid rgba(60,60,67,0.12)", p: 2, mb: 2 }}>
      <Typography sx={{ fontWeight: 700, fontSize: 16 }}>{off ? "Texts are off" : "Get your schedule by text"}</Typography>
      <Typography sx={{ fontSize: 13.5, color: "#6E6E73", mt: 0.25, mb: 1 }}>
        {off ? "You turned texts off. Tick the box to turn them back on." : "We only text you if you say yes here."}
        {staff?.phoneLast4 ? ` Texts go to the number ending ${staff.phoneLast4}.` : ""}
      </Typography>
      <FormControlLabel
        sx={{ alignItems: "flex-start", m: 0 }}
        control={<Checkbox checked={agree} onChange={(e) => setAgree(e.target.checked)} sx={{ p: 0.5, mt: -0.25 }} />}
        label={<Typography sx={{ fontSize: 13.5, color: "#3C3C43", pt: 0.25 }}>{CONSENT_WORDING}</Typography>}
      />
      {error && <Typography sx={{ color: "#B91C1C", fontSize: 13, mt: 1 }}>{error}</Typography>}
      <Button
        variant="contained"
        disableElevation
        disabled={!agree || busy}
        onClick={submit}
        sx={{ mt: 1.5, textTransform: "none", borderRadius: "10px", fontWeight: 600 }}
      >
        {busy ? "Turning on…" : "Text me"}
      </Button>
      <Typography sx={{ fontSize: 12, color: "#8E8E93", mt: 1.25 }}>
        Or text JOIN to (855) 449-8584. Terms: wisershifts.com/terms · Privacy: wisershifts.com/privacy
      </Typography>
    </Box>
  );
}
