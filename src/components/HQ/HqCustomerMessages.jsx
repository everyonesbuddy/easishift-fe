// HQ: try the customer messages on a real workspace. Find it by anyone's
// email, see its managers and whether they can get texts, and send the
// morning summary, the next-step nudge or a sample call-out alert, now.
import { useState } from "react";
import { Alert, Box, Button, CircularProgress, TextField, Typography } from "@mui/material";
import api from "./hqApi";
import { IOS } from "../../theme/ios";
import { Section, Tag } from "./HqBits";

const TEXTS = {
  opted_in: ["Gets texts", IOS.greenText],
  pending: ["Asked, no reply yet", IOS.orangeText],
  none: ["Not asked yet", IOS.secondary],
  opted_out: ["Said STOP", IOS.redText],
};
const STEP_LABEL = { setup: "Finish setup", staff: "Add staff", phones: "Add phone numbers", publish: "Publish the schedule", publish_next: "Publish next week", optin: "Get staff to say yes to texts" };
const SENDS = [
  ["summary", "Send the morning summary", "What managers get at 6 a.m.: today's shifts, open slots, overnight call-outs, requests, overtime, and the next step."],
  ["nudge", "Send the next-step nudge", "What managers get at 10 a.m. on quiet Mondays, Wednesdays and Fridays until setup is done."],
  ["callout", "Send a sample call-out alert", "What managers get the moment someone calls out (with made-up names)."],
];

export default function HqCustomerMessages() {
  const [email, setEmail] = useState("");
  const [w, setW] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const [result, setResult] = useState(null);

  const find = async () => {
    setBusy("find");
    setErr("");
    setResult(null);
    try {
      const { data } = await api.get("/hq/customers/lookup", { params: email.includes("@") ? { email } : { q: email } });
      setW(data);
    } catch (e) {
      setW(null);
      setErr(e?.response?.data?.message || "Couldn't find it.");
    } finally {
      setBusy("");
    }
  };
  const optIn = async () => {
    setBusy("optin");
    setErr("");
    setResult(null);
    try {
      const { data } = await api.post(`/hq/customers/${w.tenant._id}/opt-in`, {});
      setResult({ ...data, which: "optin", skipped: data.results.length ? null : "No managers to ask." });
      const { data: fresh } = await api.get("/hq/customers/lookup", { params: email.includes("@") ? { email } : { q: email } });
      setW(fresh);
    } catch (e) {
      setErr(e?.response?.data?.message || "Couldn't send it.");
    } finally {
      setBusy("");
    }
  };
  const send = async (which) => {
    setBusy(which);
    setErr("");
    setResult(null);
    try {
      const { data } = await api.post(`/hq/customers/${w.tenant._id}/test-message`, { which });
      setResult(data);
    } catch (e) {
      setErr(e?.response?.data?.message || "Couldn't send it.");
    } finally {
      setBusy("");
    }
  };

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Section title="Try the customer messages" note="Find a workspace by anyone's email, or its name. Sends are real: they go to that workspace's managers by text (if they've said yes) or email.">
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <TextField size="small" label="Email or workspace name" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && email.trim() && find()} sx={{ minWidth: 300, flex: 1 }} />
          <Button variant="contained" disableElevation onClick={find} disabled={!email.trim() || busy === "find"}>
            {busy === "find" ? <CircularProgress size={18} /> : "Find"}
          </Button>
        </Box>
        {err && <Alert severity="error" sx={{ mt: 2 }}>{err}</Alert>}
      </Section>

      {w && (
        <>
          <Section title={w.tenant.name} note={`${w.tenant.plan} plan · ${w.tenant.texting ? "texting on" : "email only (no texting on this plan)"} · ${w.tenant.setupDone ? "set up" : "setup not finished"}`}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: IOS.secondary, mb: 0.5 }}>Managers (who gets these)</Typography>
            {w.managers.map((m) => {
              const [label, color] = TEXTS[m.texts] || TEXTS.none;
              return (
                <Box key={m._id} sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap", py: 0.6, borderBottom: `1px solid ${IOS.hairline}` }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, minWidth: 160 }}>{m.name}</Typography>
                  <Typography sx={{ fontSize: 13, color: IOS.secondary, minWidth: 90 }}>{m.role}</Typography>
                  <Typography sx={{ fontSize: 13, color: IOS.secondary, flex: 1, minWidth: 200 }}>{[m.phone, m.email].filter(Boolean).join(" · ") || "No phone or email"}</Typography>
                  <Tag color={m.phone ? color : IOS.secondary}>{m.phone ? label : "No phone"}</Tag>
                  {!m.morningSummary && <Tag>Summary off</Tag>}
                  {!m.loginEnabled && <Tag>Login off: skipped</Tag>}
                </Box>
              );
            })}
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, mt: 2 }}>
              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: IOS.secondary }}>Today</Typography>
                <Typography sx={{ fontSize: 14 }}>
                  {w.today.shifts} shifts · {w.today.open} open · {w.today.callouts} call-outs · {w.today.pendingTimeOff} time-off waiting · {w.today.overtime} heading into overtime
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: IOS.secondary }}>Getting started</Typography>
                <Typography sx={{ fontSize: 14 }}>
                  {w.setup.staff} staff · {w.setup.staffWithPhone} with a phone · {w.setup.optedIn} said yes to texts · this week {w.setup.thisWeekPublished ? "published" : "not published"} · next week {w.setup.nextWeekPublished ? "published" : "not published"}
                </Typography>
                <Typography sx={{ fontSize: 14, mt: 0.5, color: w.nextStep ? IOS.orangeText : IOS.greenText, fontWeight: 600 }}>
                  {w.nextStep ? `Next step: ${STEP_LABEL[w.nextStep.key] || w.nextStep.key}` : "Nothing left to set up"}
                </Typography>
              </Box>
            </Box>
          </Section>

          <Section title="Send for real, now">
            <Box sx={{ display: "grid", gap: 1.25 }}>
              <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap" }}>
                <Button variant="outlined" onClick={optIn} disabled={Boolean(busy) || !w.tenant.texting || !w.managers.some((m) => m.phone && !["opted_in", "opted_out"].includes(m.texts))} sx={{ minWidth: 250 }}>
                  {busy === "optin" ? <CircularProgress size={18} /> : "Ask managers to opt in to texts"}
                </Button>
                <Typography sx={{ fontSize: 13, color: IOS.secondary, flex: 1, minWidth: 220 }}>
                  {!w.tenant.texting
                    ? "This plan doesn't include texting."
                    : w.managers.every((m) => !m.phone)
                      ? "No manager has a phone yet. Add it on their Members page (Texts → Add phone)."
                      : "Texts each manager with a phone who hasn't said yes. Once they reply START or YES, alerts come by text."}
                </Typography>
              </Box>
              {SENDS.map(([k, label, note]) => (
                <Box key={k} sx={{ display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap" }}>
                  <Button variant="outlined" onClick={() => send(k)} disabled={Boolean(busy) || (k === "nudge" && !w.nextStep)} sx={{ minWidth: 250 }}>
                    {busy === k ? <CircularProgress size={18} /> : label}
                  </Button>
                  <Typography sx={{ fontSize: 13, color: IOS.secondary, flex: 1, minWidth: 220 }}>{k === "nudge" && !w.nextStep ? "Nothing left to set up, so there's no nudge." : note}</Typography>
                </Box>
              ))}
            </Box>
            {result && (
              <Alert severity={result.sent ? "success" : "warning"} sx={{ mt: 2 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{result.sent ? `Sent to ${result.sent}` : result.skipped || "Nothing was delivered"}</Typography>
                {result.results.map((r) => (
                  <Typography key={r.name} sx={{ fontSize: 13 }}>{r.name}: {r.note}</Typography>
                ))}
              </Alert>
            )}
          </Section>
        </>
      )}
    </Box>
  );
}
