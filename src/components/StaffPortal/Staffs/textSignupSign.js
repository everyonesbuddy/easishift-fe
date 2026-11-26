// Our texting number. Staff opt in by texting JOIN to it (we never text first).
export const SMS_NUMBER = "(855) 449-8584";

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/**
 * Open a printable staff-room sign: "Text JOIN to …", with the disclosures
 * carriers expect (what it is, frequency, rates, STOP/HELP, terms, privacy).
 */
export function printTextSignupSign(facilityName) {
  const w = window.open("", "_blank", "width=820,height=1000");
  if (!w) return false;
  const name = esc(facilityName || "Your workplace");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Get your schedule by text</title>
<style>
  @page { size: letter; margin: 0.6in; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #111; text-align: center; margin: 0; padding: 40px 24px; }
  .facility { font-size: 22px; font-weight: 600; color: #444; }
  h1 { font-size: 54px; line-height: 1.1; margin: 18px 0 28px; }
  .cta { font-size: 34px; margin: 0 0 10px; }
  .cta strong { font-size: 46px; }
  .num { font-size: 52px; font-weight: 800; letter-spacing: 0.02em; margin: 6px 0 36px; }
  ul { text-align: left; display: inline-block; font-size: 20px; line-height: 1.7; margin: 0 0 36px; }
  .fine { font-size: 14px; color: #555; line-height: 1.6; max-width: 620px; margin: 0 auto; }
  @media print { button { display: none; } }
  button { margin-top: 28px; font-size: 16px; padding: 10px 18px; border-radius: 8px; border: 1px solid #ccc; background: #fff; cursor: pointer; }
</style></head><body>
  <div class="facility">${name}</div>
  <h1>Get your work schedule by text</h1>
  <p class="cta">Text <strong>JOIN</strong> to</p>
  <div class="num">${SMS_NUMBER}</div>
  <ul>
    <li>Shift reminders and schedule changes</li>
    <li>Open shifts you can pick up</li>
    <li>Answers to your swap and time-off requests</li>
  </ul>
  <p class="fine">Text from the mobile number ${name} has on file for you. WiserShifts Schedule Alerts: work notifications only, never marketing.
  Message frequency varies. Message &amp; data rates may apply. Reply STOP to opt out, HELP for help.
  Terms: wisershifts.com/terms · Privacy: wisershifts.com/privacy</p>
  <button onclick="window.print()">Print</button>
</body></html>`);
  w.document.close();
  return true;
}
