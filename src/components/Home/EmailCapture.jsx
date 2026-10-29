import { useState } from "react";
import { Box, Button, Checkbox, FormControlLabel, TextField, Typography } from "@mui/material";
import { FiCheck, FiMail } from "react-icons/fi";
import { toast } from "react-toastify";
import api from "../../config/api";
import { trackEvent } from "../../utils/analytics";
import { getFirstTouch } from "../../utils/firstTouch";

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

/**
 * The newsletter consent line for calculators that email a summary. Unticked
 * by default: the summary is sent either way; the newsletter only with a tick.
 */
export function NewsletterOptIn({ checked, onChange, dark = false }) {
  return (
    <FormControlLabel
      sx={{ mt: 0.5, alignItems: "flex-start", "& .MuiFormControlLabel-label": { fontSize: 13, color: dark ? "rgba(255,255,255,0.75)" : "#475467", pt: "9px" } }}
      control={<Checkbox size="small" checked={checked} onChange={(e) => onChange(e.target.checked)} />}
      label="Also send me the WiserShifts newsletter on staffing and labor. Unsubscribe anytime."
    />
  );
}

/**
 * Newsletter sign-up box (calculators without a summary email, the blog).
 * Sending it is the opt-in, and it says so.
 */
export default function EmailCapture({ source, summary = "", title = "Get the staffing math by email", text = "Short notes for people who run or schedule care buildings: overtime, call-outs, hours per resident day, and what's working. Unsubscribe anytime." }) {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const v = email.trim();
    if (!isEmail(v)) {
      toast.error("Enter a valid email address.");
      return;
    }
    setSending(true);
    try {
      await api.post("/marketing/lead", { email: v, source, summary, newsletter: true, utm: getFirstTouch() || undefined, website });
      trackEvent("newsletter_signup", { source });
      setDone(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't sign you up. Try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Box component="form" onSubmit={submit} sx={{ p: { xs: 2.5, md: 3 }, borderRadius: "20px", border: "1px solid #E4E7EC", bgcolor: "#fff" }}>
      <Typography sx={{ fontWeight: 900, fontSize: "1.05rem" }}>{title}</Typography>
      <Typography sx={{ color: "#475467", fontSize: 14, mt: 0.5, lineHeight: 1.55 }}>{text}</Typography>
      {done ? (
        <Typography sx={{ mt: 1.5, color: "#067647", fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
          <FiCheck /> You're on the list.
        </Typography>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "minmax(0, 1fr) auto" }, gap: 1, mt: 1.5 }}>
          <TextField size="small" type="email" label="Work email" placeholder="you@facility.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Box component="input" type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} aria-hidden sx={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }} />
          <Button type="submit" variant="contained" disabled={sending} startIcon={<FiMail />} sx={{ fontWeight: 800, textTransform: "none" }}>
            {sending ? "Signing up…" : "Sign me up"}
          </Button>
        </Box>
      )}
    </Box>
  );
}
