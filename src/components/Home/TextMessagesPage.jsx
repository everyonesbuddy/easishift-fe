import { Box, Checkbox, Container, Link, Paper, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import Footer from "../Shared/Footer";

/**
 * Public page describing the WiserShifts text message program: who sends
 * it, what's sent, how people opt in (with the exact wording they see),
 * rates, STOP/HELP and privacy. It's the "opt-in proof" link for Twilio's
 * toll-free verification, so keep the wording in sync with utils/notify.js
 * and the Members page checkbox.
 */

const NUMBER = "(855) 449-8584";
const SUPPORT = "info@wisershifts.com";

const MESSAGES = [
  {
    title: "Open shifts (call-outs)",
    who: "Staff",
    example: "Maple Grove needs a CNA Sat 7a–3p. Reply YES to take it, or tap: wisershifts.com/s/…",
  },
  {
    title: "Shift reminders",
    who: "Staff",
    example: "Reminder: you work Tue 3p–11p at Maple Grove. Can't make it? wisershifts.com/s/…",
  },
  {
    title: "Schedule changes",
    who: "Staff",
    example: "Maple Grove: you've been added to Fri 11p–7a (Med Tech). wisershifts.com/s/…",
  },
  {
    title: "Time-off answers",
    who: "Staff",
    example: "Maple Grove: your time-off request (Dec 24–26) was approved.",
  },
  {
    title: "Call-out and time-off alerts",
    who: "Managers",
    example: "WiserShifts: Ana L. called out of CNA tonight 11p–7a. Fill it: wisershifts.com/…",
  },
];

function Bubble({ from, children }) {
  return (
    <Box sx={{ display: "flex", justifyContent: from === "me" ? "flex-end" : "flex-start", mb: 1 }}>
      <Box
        sx={{
          maxWidth: 360,
          px: 1.75,
          py: 1,
          borderRadius: "18px",
          fontSize: 14.5,
          lineHeight: 1.4,
          bgcolor: from === "me" ? "#0a84ff" : "#e9e9eb",
          color: from === "me" ? "#fff" : "#111",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

function Phone({ caption, children }) {
  return (
    <Box sx={{ flex: "1 1 300px", minWidth: 0 }}>
      <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: "22px", p: 2, bgcolor: "#fff" }}>
        <Typography sx={{ textAlign: "center", fontSize: 12, color: "text.secondary", mb: 1.5 }}>Text message · {NUMBER}</Typography>
        {children}
      </Box>
      <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
        {caption}
      </Typography>
    </Box>
  );
}

/** A picture of a consent box as it appears in the app: always unticked. */
const ConsentBox = ({ title, wording, phone, button, caption }) => (
  <Box sx={{ maxWidth: 440 }}>
    <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: "14px", p: 2, bgcolor: "#fff" }}>
      <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1 }}>{title}</Typography>
      {phone && (
        <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: "8px", px: 1.5, py: 1, fontSize: 14, mb: 1.5 }}>{phone}</Box>
      )}
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.5 }}>
        <Checkbox checked={false} readOnly size="small" sx={{ p: 0.5 }} inputProps={{ "aria-label": "Example consent checkbox, unticked" }} />
        <Typography sx={{ fontSize: 13.5, color: "text.secondary", pt: 0.5 }}>{wording}</Typography>
      </Box>
      {button && (
        <Box sx={{ mt: 1.5, display: "inline-block", px: 2, py: 0.75, borderRadius: "8px", bgcolor: "#e5e7eb", color: "#6b7280", fontSize: 14, fontWeight: 600 }}>
          {button}
        </Box>
      )}
    </Box>
    <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
      {caption}
    </Typography>
  </Box>
);

const H = ({ children }) => (
  <Typography variant="h6" component="h2" sx={{ fontWeight: 700, mt: 4, mb: 1 }}>
    {children}
  </Typography>
);
const P = ({ children, sx }) => (
  <Typography variant="body1" sx={{ color: "text.secondary", mb: 1.5, ...sx }}>
    {children}
  </Typography>
);

export default function TextMessagesPage() {
  return (
    <>
      <Box sx={{ py: { xs: 4, md: 6 }, px: 2, bgcolor: "#f8f9fb", minHeight: "calc(100vh - 72px)" }}>
        <Container maxWidth="md">
          <Paper elevation={0} sx={{ p: { xs: 3, md: 5 }, borderRadius: 3, border: "1px solid", borderColor: "divider", bgcolor: "#fff" }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 800, mb: 1 }}>
              WiserShifts text messages
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
              Program name: WiserShifts Schedule Alerts · Sent from {NUMBER}
            </Typography>

            <P>
              WiserShifts is scheduling and time tracking software for 24/7 care teams, such as senior living communities, group homes and
              behavioral health facilities. When a facility uses WiserShifts, we text its own employees and managers about their work schedule:
              open shifts they can pick up, shift reminders, schedule changes and replies to their requests. These are work notifications only.
              We never send marketing or promotional texts.
            </P>

            <H>How people agree to get texts</H>
            <P>
              We never text anyone who hasn&apos;t agreed first, not even to ask. Each person opts in themselves, in one of three ways, and we
              keep a record of when and how they did. An employer adding someone&apos;s number to the schedule does not opt them in.
            </P>

            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
              1. Staff text JOIN to {NUMBER}
            </Typography>
            <P>
              Facilities post a sign in the staff room and tell staff in person. Texting JOIN (or START) from the number their workplace has
              on file subscribes them, and we reply with a confirmation. A number no workplace has added is told to ask their scheduler.
            </P>
            <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap", mt: 1, mb: 3 }}>
              <Box sx={{ flex: "1 1 260px", minWidth: 0, maxWidth: 340, border: "2px solid", borderColor: "text.primary", borderRadius: "14px", p: 2.5, bgcolor: "#fff", textAlign: "center" }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "text.secondary" }}>
                  Staff room sign
                </Typography>
                <Typography sx={{ fontSize: 22, fontWeight: 800, mt: 1, lineHeight: 1.2 }}>Get your schedule by text</Typography>
                <Typography sx={{ fontSize: 16, mt: 1 }}>
                  Text <strong>JOIN</strong> to <strong>{NUMBER}</strong>
                </Typography>
                <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 1.5, lineHeight: 1.5 }}>
                  WiserShifts Schedule Alerts from your workplace: shift reminders, schedule changes and open shifts. Msg frequency varies.
                  Msg &amp; data rates may apply. Reply STOP to opt out, HELP for help. Terms: wisershifts.com/terms · Privacy:
                  wisershifts.com/privacy
                </Typography>
              </Box>
              <Phone caption="They text us first. Nothing is sent before this.">
                <Bubble from="me">JOIN</Bubble>
                <Bubble>
                  You&apos;re subscribed to WiserShifts schedule texts from Maple Grove. Your schedule: wisershifts.com/s/… Msg frequency varies.
                  Msg &amp; data rates may apply. Reply STOP to opt out, HELP for help.
                </Bubble>
              </Phone>
            </Box>

            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
              2. Staff tick the box on their schedule page
            </Typography>
            <P>
              Every employee has a personal schedule page (shared by email, or by their scheduler in person). It has this box. It starts
              unticked, and nothing is sent until they tick it and press the button. We then send one confirmation text.
            </P>
            <ConsentBox
              title="Text me my schedule"
              wording="Text me my schedule: shift reminders, schedule changes, open shifts I can pick up and replies to my requests. Msg frequency varies. Msg & data rates may apply. Reply STOP to opt out, HELP for help."
              button="Text me"
              phone="Texts go to (•••) •••-4477"
              caption="On each employee's own schedule page. The box starts unticked."
            />

            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5, mt: 3 }}>
              3. Managers tick the box in WiserShifts
            </Typography>
            <P>
              A manager signed in to WiserShifts can add their own mobile number in Settings → Members and tick this box (also unticked to
              start). Only the person themselves can tick it, never someone else. They can also text JOIN.
            </P>
            <ConsentBox
              title="Mobile phone"
              wording="Text me when someone calls out or asks for time off, plus a short morning summary. Msg & data rates may apply; reply STOP any time."
              phone="(555) 201-4477"
              caption="Settings → Members, on the manager's own number. The box starts unticked."
            />
            <Box sx={{ mb: 3 }} />

            <H>What we text</H>
            <Box component="ul" sx={{ pl: 3, color: "text.secondary", mt: 0 }}>
              {MESSAGES.map((m) => (
                <Box component="li" key={m.title} sx={{ mb: 1.25 }}>
                  <Typography sx={{ color: "text.primary", fontWeight: 600 }}>
                    {m.title} <Typography component="span" sx={{ color: "text.secondary", fontWeight: 400 }}>({m.who})</Typography>
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic" }}>
                    &ldquo;{m.example}&rdquo;
                  </Typography>
                </Box>
              ))}
            </Box>

            <H>How often</H>
            <P>
              Message frequency varies with your schedule: usually a few texts a week, and more when your workplace has open shifts to fill.
            </P>

            <H>Cost, stopping and help</H>
            <Box component="ul" sx={{ pl: 3, color: "text.secondary", mt: 0 }}>
              <li>
                <P sx={{ mb: 0.75 }}>Message and data rates may apply. WiserShifts doesn&apos;t charge you for texts.</P>
              </li>
              <li>
                <P sx={{ mb: 0.75 }}>
                  Reply <strong>STOP</strong> to any text to stop getting them. You&apos;ll get one text confirming it and nothing after that. Reply{" "}
                  <strong>START</strong> to turn them back on.
                </P>
              </li>
              <li>
                <P sx={{ mb: 0.75 }}>
                  Reply <strong>HELP</strong> for help, or email <Link href={`mailto:${SUPPORT}`}>{SUPPORT}</Link>.
                </P>
              </li>
              <li>
                <P sx={{ mb: 0.75 }}>Carriers are not liable for delayed or undelivered messages.</P>
              </li>
            </Box>

            <H>Your privacy</H>
            <P>
              We use your phone number only to send the work texts described here. No mobile information will be shared with third parties or
              affiliates for marketing or promotional purposes. Text messaging opt-in data and consent are not shared with any third parties.
            </P>
            <P>
              See our <Link component={RouterLink} to="/privacy-policy">Privacy Policy</Link> and{" "}
              <Link component={RouterLink} to="/terms-and-conditions">Terms and Conditions</Link>.
            </P>
          </Paper>
        </Container>
      </Box>
      <Footer />
    </>
  );
}
