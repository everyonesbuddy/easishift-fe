// HQ Money: a simple P&L. Income from Stripe (read only), expenses from the
// expense sheet, kept here and editable like a spreadsheet.
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert, Box, Button, ButtonBase, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, InputBase, MenuItem, TextField, Tooltip, Typography,
} from "@mui/material";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import api from "./hqApi";
import { IOS } from "../../theme/ios";
import { Section, Stat, Tag, Empty } from "./HqBits";
import { num } from "./hqFormat";

const usd = (v, { cents = true, blankZero = false } = {}) => {
  if (v === null || v === undefined) return "–";
  const x = Number(v) || 0;
  if (blankZero && x === 0) return "–";
  const s = Math.abs(x).toLocaleString("en-US", { minimumFractionDigits: cents && x % 1 ? 2 : 0, maximumFractionDigits: 2 });
  return `${x < 0 ? "−" : ""}$${s}`;
};
const CADENCE = { monthly: "a month", yearly: "a year", one_time: "once" };
const STATUS_COLOR = { active: IOS.greenText, trialing: IOS.blue, past_due: IOS.orangeText, unpaid: IOS.redText, canceled: IOS.secondary };
const SHEET_KEY = "hq_money_sheet_url";
const memo = { get: () => { try { return localStorage.getItem(SHEET_KEY) || ""; } catch { return ""; } }, set: (v) => { try { localStorage.setItem(SHEET_KEY, v); } catch { /* fine */ } } };

const cell = { px: 1, py: 0.75, fontSize: 13, fontFamily: IOS.font, textAlign: "right", whiteSpace: "nowrap", borderBottom: `1px solid ${IOS.hairline}`, ...num };
const head = { ...cell, fontSize: 12, fontWeight: 700, color: IOS.secondary, py: 0.75 };
const first = { ...cell, textAlign: "left", position: "sticky", left: 0, bgcolor: IOS.surface, zIndex: 1, minWidth: 150 };

/** A number you click to change. Empty = back to the usual cost. */
function MoneyCell({ value, own, onSave, future, sx }) {
  const [edit, setEdit] = useState(false);
  const [text, setText] = useState("");
  const done = useRef(false);
  const open = () => { setText(own ? String(value) : ""); done.current = false; setEdit(true); };
  const save = () => {
    if (done.current) return;
    done.current = true;
    setEdit(false);
    const t = text.trim();
    if (t === (own ? String(value) : "")) return;
    onSave(t === "" ? null : t);
  };
  if (edit) {
    return (
      <Box component="td" sx={{ ...cell, p: 0.25, ...sx }}>
        <InputBase
          autoFocus
          value={text}
          placeholder={String(value || 0)}
          onChange={(e) => setText(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") { done.current = true; setEdit(false); }
          }}
          inputProps={{ style: { textAlign: "right", padding: "4px 6px", fontSize: 13, width: 64 }, "aria-label": "Cost" }}
          sx={{ bgcolor: IOS.canvas, borderRadius: "6px", outline: `2px solid ${IOS.blue}` }}
        />
      </Box>
    );
  }
  return (
    <Box component="td" sx={{ ...cell, p: 0, ...sx }}>
      <Tooltip title={own ? "What it cost this month. Click to change; clear it to use the usual cost." : "The usual cost. Click to set what it actually cost."} placement="top" enterDelay={600}>
        <ButtonBase
          onClick={open}
          sx={{ width: "100%", justifyContent: "flex-end", px: 1, py: 0.75, fontSize: 13, ...num, color: own ? IOS.ink : IOS.tertiary, fontWeight: own ? 500 : 400, opacity: future ? 0.75 : 1, "&:hover": { bgcolor: IOS.canvas } }}
        >
          {usd(value, { blankZero: true })}
        </ButtonBase>
      </Tooltip>
    </Box>
  );
}

// Both dialogs are mounted only while open, so they start fresh each time.
function ExpenseDialog({ onClose, onSave, initial }) {
  const [f, setF] = useState(() => initial || { name: "", category: "", cadence: "monthly", amount: "", startMonth: "", endMonth: "", notes: "" });
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>{initial?._id ? `Edit ${initial.name}` : "Add something we pay for"}</DialogTitle>
      <DialogContent sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5, pt: "8px !important" }}>
        <TextField label="Name" value={f.name || ""} onChange={set("name")} autoFocus size="small" placeholder="Heroku" />
        <TextField label="Category" value={f.category || ""} onChange={set("category")} size="small" placeholder="Hosting" />
        <TextField label="Usual cost ($)" value={f.amount ?? ""} onChange={set("amount")} size="small" inputMode="decimal" />
        <TextField select label="Paid" value={f.cadence || "monthly"} onChange={set("cadence")} size="small">
          <MenuItem value="monthly">Every month</MenuItem>
          <MenuItem value="yearly">Once a year (in its start month)</MenuItem>
          <MenuItem value="one_time">Once</MenuItem>
        </TextField>
        <TextField label="Started" type="month" value={f.startMonth || ""} onChange={set("startMonth")} size="small" InputLabelProps={{ shrink: true }} />
        <TextField label="Stopped (leave empty if still paying)" type="month" value={f.endMonth || ""} onChange={set("endMonth")} size="small" InputLabelProps={{ shrink: true }} />
        <TextField label="Notes" value={f.notes || ""} onChange={set("notes")} size="small" multiline minRows={2} sx={{ gridColumn: { sm: "1 / -1" } }} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disableElevation disabled={!String(f.name || "").trim()} onClick={() => onSave(f)}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}

/** Email a customer whose payment failed the invoice's pay link. Test it on yourself first. */
function NudgeDialog({ sub, onClose, onSent }) {
  const [info, setInfo] = useState(null);
  const [err, setErr] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [tested, setTested] = useState(false);
  useEffect(() => {
    let live = true;
    api.get(`/hq/money/nudge/${sub.id}`).then(
      ({ data }) => {
        if (!live) return;
        setInfo(data);
        setSubject(data.draft.subject);
        setMessage(data.draft.message);
      },
      (e) => live && setErr(e?.response?.data?.message || "Couldn't load the invoice."),
    );
    return () => { live = false; };
  }, [sub.id]);
  const send = async (test) => {
    setBusy(true);
    setErr("");
    setSent("");
    try {
      const { data } = await api.post(`/hq/money/nudge/${sub.id}`, { subject, message, test });
      if (test) {
        setTested(true);
        setSent(`Test sent to ${data.to}. Check your inbox, then send it for real.`);
      } else onSent(`Sent to ${data.to}.`);
    } catch (e) {
      setErr(e?.response?.data?.message || "Couldn't send it.");
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  };
  const day = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return (
    <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>Nudge {sub.customer || "them"} to pay</DialogTitle>
      <DialogContent>
        {!info && !err && <Box sx={{ py: 4, textAlign: "center" }}><CircularProgress size={24} /></Box>}
        {info && (
          <>
            <Box sx={{ p: 1.5, mb: 2, borderRadius: IOS.radius.cell, bgcolor: IOS.canvas, fontSize: 13.5 }}>
              <Typography sx={{ fontSize: 13.5 }}>
                <b>{usd(info.amountDue)}</b> unpaid{info.invoiceNumber ? ` on invoice ${info.invoiceNumber}` : ""} · goes to <b>{info.to || "no email in Stripe"}</b>
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: IOS.secondary, mt: 0.25 }}>
                Stripe has tried {info.attempts} time{info.attempts === 1 ? "" : "s"}{info.nextTry ? `, next try ${day(info.nextTry)}` : ", and won't retry on its own"}. The button in the email opens Stripe's page for this invoice, where they can pay or change their card.{" "}
                <a href={info.payUrl} target="_blank" rel="noreferrer">Open it</a>
              </Typography>
              {info.history.length > 0 && (
                <Typography sx={{ fontSize: 12.5, color: IOS.secondary, mt: 0.5 }}>
                  Sent before: {info.history.map((h) => `${day(h.at)}${h.test ? " (test)" : ` to ${h.to}`}`).join(" · ")}
                </Typography>
              )}
            </Box>
            <TextField label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} fullWidth size="small" sx={{ mb: 1.5 }} />
            <TextField label="Message" value={message} onChange={(e) => setMessage(e.target.value)} fullWidth multiline minRows={9} helperText="The pay button goes in after the second paragraph. Change the greeting to their name." />
          </>
        )}
        {sent && <Alert severity="success" sx={{ mt: 2 }}>{sent}</Alert>}
        {err && <Alert severity="error" sx={{ mt: 2 }}>{err}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, flexWrap: "wrap", gap: 1 }}>
        <Button onClick={onClose} disabled={busy}>Close</Button>
        <Box sx={{ flex: 1 }} />
        {info && (
          <>
            <Button variant="outlined" disabled={busy || !subject.trim() || !message.trim()} onClick={() => send(true)}>
              Send test to me{info.testTo ? ` (${info.testTo})` : ""}
            </Button>
            {confirm ? (
              <Button variant="contained" color="warning" disableElevation disabled={busy} onClick={() => send(false)}>
                Yes, email {info.to}
              </Button>
            ) : (
              <Tooltip title={tested ? "" : "Send yourself a test first to see how it looks"}>
                <span>
                  <Button variant="contained" disableElevation disabled={busy || !info.to || !subject.trim() || !message.trim()} onClick={() => setConfirm(true)}>
                    Send to {sub.customer || "them"}
                  </Button>
                </span>
              </Tooltip>
            )}
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

function ImportDialog({ onClose, year, onDone }) {
  const [url, setUrl] = useState(memo.get);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const go = async () => {
    setBusy(true);
    setErr("");
    try {
      const { data } = await api.post("/hq/money/import", { url: url.trim(), year });
      memo.set(url.trim());
      onDone(`Imported ${data.services.length} services (${data.added} new, ${data.updated} updated).`);
    } catch (e) {
      setErr(e?.response?.data?.message || "Couldn't import that sheet.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>Import the expense sheet</DialogTitle>
      <DialogContent>
        <Typography sx={{ color: IOS.secondary, fontSize: 13.5, mb: 2 }}>
          Paste the Google Sheets link. It needs a row with Service, Category and Jan … Dec. Each service is added or updated by name, and the
          sheet's months for {year} replace what's here. The sheet has to be viewable by anyone with the link.
        </Typography>
        <TextField label="Google Sheets link" value={url} onChange={(e) => setUrl(e.target.value)} fullWidth size="small" autoFocus placeholder="https://docs.google.com/spreadsheets/d/…" />
        {err && <Alert severity="error" sx={{ mt: 2 }}>{err}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="contained" disableElevation disabled={busy || !url.trim()} onClick={go}>{busy ? "Importing…" : "Import"}</Button>
      </DialogActions>
    </Dialog>
  );
}

const shortDate = (d, year) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", ...(year ? { year: "numeric" } : {}) }) : "–");
const days = (n) => `${n} day${n === 1 ? "" : "s"}`;

/** Where a subscription stands on paying: an open invoice first (overdue or not), then its last payment. */
function PaymentCell({ p }) {
  if (!p) return <Typography sx={{ fontSize: 12, color: IOS.tertiary }}>–</Typography>;
  return (
    <Box>
      {p.open && (
        <Box sx={{ mb: p.lastPaid ? 0.25 : 0 }}>
          <Tag color={p.open.daysOverdue ? IOS.redText : IOS.orangeText}>
            {p.open.daysOverdue ? `Overdue ${days(p.open.daysOverdue)} · ${usd(p.open.amount)}` : `Invoice open · ${usd(p.open.amount)} due ${shortDate(p.open.due)}`}
          </Tag>
          {p.open.url && (
            <Box component="a" href={p.open.url} target="_blank" rel="noreferrer" sx={{ ml: 0.75, fontSize: 12, color: IOS.blue }}>
              Invoice
            </Box>
          )}
        </Box>
      )}
      {p.lastPaid ? (
        <Typography sx={{ fontSize: 12, color: p.lastPaid.daysLate > 7 ? IOS.orangeText : IOS.secondary }}>
          Paid {shortDate(p.lastPaid.paidAt)}
          {p.lastPaid.daysAfter > 1 ? ` · ${days(p.lastPaid.daysAfter)} after the invoice` : " · on time"}
          {p.latePaid > 1 ? ` · late ${p.latePaid} of ${p.paidCount} times` : ""}
        </Typography>
      ) : (
        !p.open && <Typography sx={{ fontSize: 12, color: IOS.tertiary }}>No payments yet</Typography>
      )}
    </Box>
  );
}

export default function HqMoney() {
  const nowYear = new Date().getFullYear();
  const [year, setYear] = useState(nowYear);
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");
  const [importing, setImporting] = useState(false);
  const [editing, setEditing] = useState(null); // {} = new, expense = edit
  const [openCats, setOpenCats] = useState(false);

  const load = useCallback(async (refresh) => {
    setLoading(true);
    try {
      const { data: d } = await api.get("/hq/money", { params: { year, ...(refresh ? { refresh: 1 } : {}) } });
      setData(d);
      setErr("");
    } catch (e) {
      setErr(e?.response?.data?.message || "Couldn't load the money page.");
    } finally {
      setLoading(false);
    }
  }, [year]);
  useEffect(() => { load(); }, [load]);

  const saveCell = async (e, month, cost) => {
    try {
      await api.patch(`/hq/money/expenses/${e._id}`, { month, cost });
      load();
    } catch (x) {
      setErr(x?.response?.data?.message || "Couldn't save that.");
    }
  };
  const saveExpense = async (f) => {
    try {
      if (f._id) await api.patch(`/hq/money/expenses/${f._id}`, f);
      else await api.post("/hq/money/expenses", f);
      setEditing(null);
      load();
    } catch (x) {
      setErr(x?.response?.data?.message || "Couldn't save that.");
    }
  };
  const [nudging, setNudging] = useState(null);
  const hide = async (s, hidden) => {
    try {
      await api.post("/hq/money/hide", { customerId: s.customerId, hidden, label: s.customer || s.label || s.email || "" });
      load();
    } catch (x) {
      setErr(x?.response?.data?.message || "Couldn't change that.");
    }
  };
  const remove = async (e) => {
    if (!window.confirm(`Remove ${e.name}? Its costs come off the P&L.`)) return;
    await api.delete(`/hq/money/expenses/${e._id}`);
    load();
  };

  const months = useMemo(() => data?.months || [], [data]);
  const current = months.find((m) => m.current) || null;
  const last = useMemo(() => [...months].reverse().find((m) => !m.future && !m.current) || null, [months]);
  const categories = useMemo(() => {
    const set = new Set();
    for (const e of data?.expenses || []) set.add(e.category || "Other");
    return [...set].sort();
  }, [data]);

  if (!data && !err) return <Box sx={{ py: 6, textAlign: "center" }}><CircularProgress size={26} /></Box>;

  const st = data?.stripe || {};
  const profitTone = (v) => (v === null || v === undefined ? IOS.ink : v < 0 ? IOS.redText : v > 0 ? IOS.greenText : IOS.ink);
  const rowTotal = (k) => usd(data?.totals?.[k]);

  return (
    <Box sx={{ minWidth: 0 }}>
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1, mb: 2 }}>
        <TextField select size="small" value={year} onChange={(e) => setYear(Number(e.target.value))} sx={{ width: 110 }} inputProps={{ "aria-label": "Year" }}>
          {[nowYear - 1, nowYear, nowYear + 1].map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
        </TextField>
        <Box sx={{ flex: 1 }} />
        <Button size="small" startIcon={<RefreshRoundedIcon />} onClick={() => load(true)} disabled={loading}>Refresh Stripe</Button>
        <Button size="small" variant="outlined" onClick={() => setImporting(true)}>Import from Google Sheet</Button>
        <Button size="small" variant="contained" disableElevation startIcon={<AddRoundedIcon />} onClick={() => setEditing({})}>Add expense</Button>
      </Box>

      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr("")}>{err}</Alert>}
      {note && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNote("")}>{note}</Alert>}
      {data && !st.configured && <Alert severity="info" sx={{ mb: 2 }}>Stripe isn't connected, so income shows $0. Add STRIPE_SECRET_KEY (or a read-only HQ_STRIPE_KEY) to the server's config vars.</Alert>}
      {st.error && <Alert severity="warning" sx={{ mb: 2 }}>Stripe didn't answer: {st.error}. Expenses still show; try Refresh Stripe.</Alert>}
      {st.configured && st.live === false && !st.error && <Alert severity="info" sx={{ mb: 2 }}>This is Stripe's test mode, so income here is test data.</Alert>}

      {data && (
        <>
          {data.failing > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {data.subscriptions.filter((s) => s.status === "past_due" || s.status === "unpaid").map((s) => s.customer).join(", ")}
              {data.failing === 1 ? "'s payment" : "'s payments"} failed ({usd(data.atRisk)} a month). It isn't counted in MRR or income until it goes through. Use Nudge in Subscriptions to email them the pay link.
            </Alert>
          )}
          {data.overdue > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {data.subscriptions
                .filter((s) => s.payments?.open?.daysOverdue > 0)
                .map((s) => `${s.customer} (${usd(s.payments.open.amount)}, ${days(s.payments.open.daysOverdue)} overdue)`)
                .join(", ")}{" "}
              {data.overdue === 1 ? "has an unpaid invoice" : "have unpaid invoices"}. See Subscriptions below.
            </Alert>
          )}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(3, minmax(0, 1fr))", xl: "repeat(6, minmax(0, 1fr))" }, gap: 1, mb: 2.5 }}>
            <Stat
              label="MRR"
              value={usd(data.mrr)}
              detail={[`${data.paying} paying`, data.failing ? `${data.failing} payment failed` : "", data.trialing ? `${data.trialing} on trial` : ""].filter(Boolean).join(" · ")}
            />
            <Stat label={`Income · ${current?.label || "this month"}`} value={usd(current?.net ?? 0)} detail={last ? `${usd(last.net)} in ${last.label}` : "after refunds and fees"} />
            <Stat label="Spending a month" value={usd(data.burn)} detail="usual costs now" />
            <Stat label={`Profit · ${current?.label || "this month"}`} value={usd(current?.profit ?? 0)} tone={profitTone(current?.profit)} detail={last ? `${usd(last.profit)} in ${last.label}` : ""} />
            <Stat label={`Profit · ${year} so far`} value={usd(data.totals.profit)} tone={profitTone(data.totals.profit)} detail={`${usd(data.totals.net)} in · ${usd(data.totals.expenses)} out`} />
            <Stat
              label="To break even"
              value={data.covered ? "Covered" : data.breakEven === null ? "–" : `${data.breakEven} more`}
              tone={data.covered ? IOS.greenText : IOS.ink}
              detail={data.covered ? "MRR covers monthly costs" : data.breakEven === null ? `${usd(data.burn - data.mrr)} a month to cover` : `paying customer${data.breakEven === 1 ? "" : "s"} to cover ${usd(data.burn - data.mrr)} a month`}
            />
          </Box>

          {data.cash && (
            <Section
              title="Where the money is"
              note="Earned and settling are WiserShifts payments only, after Stripe's fees. Settling is paid but not in your Stripe balance yet. The balance and payouts are for the whole Stripe account, since Stripe can't split them by business."
              sx={{ mb: 2.5 }}
            >
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" }, gap: 1 }}>
                <Stat label={`Earned · ${year}`} value={usd(data.cash.earned)} detail="WiserShifts, after fees" />
                <Stat
                  label="Settling"
                  value={usd(data.cash.settling)}
                  tone={data.cash.settling ? IOS.blue : undefined}
                  detail={data.cash.settling ? (data.cash.landsOn ? `paid; available by ${shortDate(data.cash.landsOn)}` : "paid; available soon") : "nothing waiting"}
                />
                <Stat
                  label="Stripe balance"
                  value={data.cash.account ? usd(data.cash.account.available) : "–"}
                  tone={data.cash.account?.available < 0 ? IOS.orangeText : undefined}
                  detail={data.cash.account ? `${usd(data.cash.account.pending)} on the way in · whole account` : "key can't read the balance"}
                />
                <Stat
                  label={`Paid out to the bank · ${year}`}
                  value={data.cash.payouts ? usd(data.cash.payouts.total) : "–"}
                  detail={
                    data.cash.payouts?.last
                      ? `last ${usd(data.cash.payouts.last.amount)}, ${data.cash.payouts.last.status === "paid" ? "arrived" : data.cash.payouts.last.status === "in_transit" ? "arrives" : data.cash.payouts.last.status} ${shortDate(data.cash.payouts.last.arrives)}`
                      : data.cash.payouts
                        ? "no payouts yet"
                        : "key can't read payouts"
                  }
                />
              </Box>
            </Section>
          )}

          <Section
            title={`Profit and loss · ${year}`}
            note={`Income is WiserShifts customers' payments in Stripe each month, after refunds and Stripe's fees. Months still to come show expected costs only.${
              st.left?.count || st.left?.subscriptions
                ? ` Left out as not WiserShifts: ${st.left.count ? `${st.left.count} payment${st.left.count === 1 ? "" : "s"}, refund${st.left.count === 1 ? "" : "s"} or fee${st.left.count === 1 ? "" : "s"} (${usd(st.left.amount)})` : ""}${st.left.count && st.left.subscriptions ? " and " : ""}${st.left.subscriptions ? `${st.left.subscriptions} older subscription${st.left.subscriptions === 1 ? "" : "s"}` : ""}.`
                : ""
            }`} sx={{ mb: 2.5 }}>
            <Box sx={{ overflowX: "auto", mx: { xs: -2, md: -2.5 }, px: { xs: 2, md: 2.5 } }}>
              <Box component="table" sx={{ borderCollapse: "collapse", width: "100%", minWidth: 980 }}>
                <thead>
                  <tr>
                    <Box component="th" sx={{ ...head, ...first, color: IOS.secondary }} />
                    {months.map((m) => <Box component="th" key={m.month} sx={{ ...head, color: m.current ? IOS.blue : m.future ? IOS.tertiary : IOS.secondary }}>{m.label}</Box>)}
                    <Box component="th" sx={{ ...head, color: IOS.ink }}>So far</Box>
                  </tr>
                </thead>
                <tbody>
                  {[["gross", "Sales"], ["refunds", "Refunds"], ["fees", "Stripe fees", -1]].map(([k, label, sign]) => (
                    <tr key={k}>
                      <Box component="td" sx={{ ...first, color: IOS.secondary }}>{label}</Box>
                      {months.map((m) => <Box component="td" key={m.month} sx={{ ...cell, color: m.future ? IOS.tertiary : IOS.secondary }}>{m.future ? "" : usd((sign || 1) * m[k], { blankZero: true })}</Box>)}
                      <Box component="td" sx={{ ...cell, color: IOS.secondary }}>{usd((sign || 1) * data.totals[k], { blankZero: true })}</Box>
                    </tr>
                  ))}
                  <tr>
                    <Box component="td" sx={{ ...first, fontWeight: 700 }}>Income</Box>
                    {months.map((m) => <Box component="td" key={m.month} sx={{ ...cell, fontWeight: 700, color: m.future ? IOS.tertiary : IOS.ink }}>{m.future ? "" : usd(m.net)}</Box>)}
                    <Box component="td" sx={{ ...cell, fontWeight: 700 }}>{rowTotal("net")}</Box>
                  </tr>
                  <tr>
                    <Box component="td" sx={{ ...first, fontWeight: 700, p: 0 }}>
                      <ButtonBase onClick={() => setOpenCats((v) => !v)} sx={{ px: 1, py: 0.75, fontSize: 13, fontWeight: 700, gap: 0.25, width: "100%", justifyContent: "flex-start" }}>
                        Expenses
                        <ExpandMoreRoundedIcon sx={{ fontSize: 18, color: IOS.secondary, transform: openCats ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
                      </ButtonBase>
                    </Box>
                    {months.map((m) => <Box component="td" key={m.month} sx={{ ...cell, fontWeight: 700, color: m.future ? IOS.tertiary : IOS.ink }}>{usd(-m.expenses)}</Box>)}
                    <Box component="td" sx={{ ...cell, fontWeight: 700 }}>{usd(-data.totals.expenses)}</Box>
                  </tr>
                  {openCats && categories.filter((c) => months.some((m) => m.byCategory[c])).map((c) => (
                    <tr key={c}>
                      <Box component="td" sx={{ ...first, color: IOS.secondary, pl: 2.5 }}>{c}</Box>
                      {months.map((m) => <Box component="td" key={m.month} sx={{ ...cell, color: m.future ? IOS.tertiary : IOS.secondary }}>{usd(-(m.byCategory[c] || 0), { blankZero: true })}</Box>)}
                      <Box component="td" sx={{ ...cell, color: IOS.secondary }}>{usd(-months.filter((m) => !m.future).reduce((a, m) => a + (m.byCategory[c] || 0), 0), { blankZero: true })}</Box>
                    </tr>
                  ))}
                  <tr>
                    <Box component="td" sx={{ ...first, fontWeight: 800, borderBottom: "none" }}>Profit</Box>
                    {months.map((m) => <Box component="td" key={m.month} sx={{ ...cell, fontWeight: 800, borderBottom: "none", color: m.future ? IOS.tertiary : profitTone(m.profit), bgcolor: m.current ? "rgba(0,122,255,0.05)" : undefined }}>{m.future ? "" : usd(m.profit)}</Box>)}
                    <Box component="td" sx={{ ...cell, fontWeight: 800, borderBottom: "none", color: profitTone(data.totals.profit) }}>{usd(data.totals.profit)}</Box>
                  </tr>
                  <tr>
                    <Box component="td" sx={{ ...first, color: IOS.secondary, fontSize: 12, borderBottom: "none" }}>Subscriptions new / canceled</Box>
                    {months.map((m) => <Box component="td" key={m.month} sx={{ ...cell, fontSize: 12, color: IOS.secondary, borderBottom: "none" }}>{m.future ? "" : m.started || m.canceled ? `+${m.started} / −${m.canceled}` : "–"}</Box>)}
                    <Box component="td" sx={{ ...cell, borderBottom: "none" }} />
                  </tr>
                </tbody>
              </Box>
            </Box>
          </Section>

          <Section
            title="Expenses"
            note={`Grey numbers are the usual cost; black ones are what a month actually cost. Click any month to change it. ${year} expected total: ${usd(data.totals.yearExpenses)}.`}
            sx={{ mb: 2.5 }}
          >
            {data.expenses.length === 0 ? (
              <Empty>Nothing here yet. Import the expense sheet or add what you pay for.</Empty>
            ) : (
              <Box sx={{ overflowX: "auto", mx: { xs: -2, md: -2.5 }, px: { xs: 2, md: 2.5 } }}>
                <Box component="table" sx={{ borderCollapse: "collapse", width: "100%", minWidth: 1100 }}>
                  <thead>
                    <tr>
                      <Box component="th" sx={{ ...head, ...first }}>Service</Box>
                      <Box component="th" sx={{ ...head, textAlign: "left" }}>Usual</Box>
                      {months.map((m) => <Box component="th" key={m.month} sx={{ ...head, color: m.current ? IOS.blue : m.future ? IOS.tertiary : IOS.secondary }}>{m.label}</Box>)}
                      <Box component="th" sx={{ ...head, color: IOS.ink }}>{year}</Box>
                      <Box component="th" sx={head} />
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((c) => (
                      <Fragment key={c}>
                        <tr>
                          <Box component="td" colSpan={16} sx={{ ...cell, textAlign: "left", fontSize: 11.5, fontWeight: 700, color: IOS.secondary, textTransform: "uppercase", letterSpacing: "0.04em", pt: 1.5 }}>{c}</Box>
                        </tr>
                        {data.expenses.filter((e) => (e.category || "Other") === c).map((e) => {
                          const total = months.reduce((a, m) => a + (m.byExpense[e._id] || 0), 0);
                          return (
                            <tr key={e._id}>
                              <Box component="td" sx={{ ...first, p: 0 }}>
                                <ButtonBase onClick={() => setEditing(e)} sx={{ px: 1, py: 0.75, fontSize: 13, fontWeight: 600, width: "100%", justifyContent: "flex-start", "&:hover": { color: IOS.blue } }}>
                                  {e.name}
                                </ButtonBase>
                              </Box>
                              <Box component="td" sx={{ ...cell, textAlign: "left", color: IOS.secondary, fontSize: 12.5 }}>
                                {e.amount ? `${usd(e.amount)} ${CADENCE[e.cadence]}` : <Tag color={IOS.orangeText}>No cost yet</Tag>}
                                {e.endMonth ? <Box component="span" sx={{ color: IOS.tertiary }}> · until {e.endMonth.slice(5)}/{e.endMonth.slice(2, 4)}</Box> : null}
                              </Box>
                              {months.map((m) => (
                                <MoneyCell key={m.month} value={m.byExpense[e._id] || 0} own={e.months?.[m.month] !== undefined} future={m.future} onSave={(cost) => saveCell(e, m.month, cost)} />
                              ))}
                              <Box component="td" sx={{ ...cell, fontWeight: 700 }}>{usd(total, { blankZero: true })}</Box>
                              <Box component="td" sx={{ ...cell, p: 0 }}>
                                <IconButton size="small" aria-label={`Remove ${e.name}`} onClick={() => remove(e)}><DeleteOutlineRoundedIcon sx={{ fontSize: 18, color: IOS.tertiary }} /></IconButton>
                              </Box>
                            </tr>
                          );
                        })}
                      </Fragment>
                    ))}
                    <tr>
                      <Box component="td" sx={{ ...first, fontWeight: 800, borderBottom: "none" }}>Total</Box>
                      <Box component="td" sx={{ ...cell, borderBottom: "none" }} />
                      {months.map((m) => <Box component="td" key={m.month} sx={{ ...cell, fontWeight: 800, borderBottom: "none", color: m.future ? IOS.secondary : IOS.ink }}>{usd(m.expenses)}</Box>)}
                      <Box component="td" sx={{ ...cell, fontWeight: 800, borderBottom: "none" }}>{usd(data.totals.yearExpenses)}</Box>
                      <Box component="td" sx={{ ...cell, borderBottom: "none" }} />
                    </tr>
                  </tbody>
                </Box>
              </Box>
            )}
          </Section>

          <Section title="Subscriptions" note="Every WiserShifts workspace subscription in Stripe. MRR counts only paid-up subscriptions; yearly plans count a twelfth a month. Hide your own test checkouts so they don't count.">
            {data.subscriptions.length === 0 ? (
              <Empty>{st.configured ? "No subscriptions in Stripe yet." : "Connect Stripe to see subscriptions."}</Empty>
            ) : (
              <Box sx={{ overflowX: "auto" }}>
                <Box component="table" sx={{ borderCollapse: "collapse", width: "100%", minWidth: 980 }}>
                  <thead>
                    <tr>
                      {["Customer", "Plan", "A month", "Status", "This period", "Next charge", "Payments", "Started", "", ""].map((h, i) => <Box component="th" key={h + i} sx={{ ...head, textAlign: [0, 1, 3, 4, 5, 6].includes(i) ? "left" : "right" }}>{h}</Box>)}
                    </tr>
                  </thead>
                  <tbody>
                    {data.subscriptions.map((s) => (
                      <tr key={s.id}>
                        <Box component="td" sx={{ ...cell, textAlign: "left", whiteSpace: "normal" }}>
                          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{s.customer || "—"}</Typography>
                          {s.email && s.email !== s.customer && <Typography sx={{ fontSize: 12, color: IOS.secondary }}>{s.email}</Typography>}
                        </Box>
                        <Box component="td" sx={{ ...cell, textAlign: "left", color: IOS.secondary }}>{s.plan}</Box>
                        <Box component="td" sx={{ ...cell, fontWeight: 600, color: s.status === "active" ? IOS.ink : IOS.secondary }}>{usd(s.monthly)}</Box>
                        <Box component="td" sx={{ ...cell, textAlign: "left" }}>
                          <Tag color={STATUS_COLOR[s.status] || IOS.secondary}>{s.statusLabel}</Tag>
                          {s.cancelAtPeriodEnd && s.status !== "canceled" && <Box component="span" sx={{ ml: 0.75 }}><Tag color={IOS.orangeText}>Ends at renewal</Tag></Box>}
                          {s.test && <Box component="span" sx={{ ml: 0.75 }}><Tag color={IOS.purple}>Looks like a test</Tag></Box>}
                        </Box>
                        <Box component="td" sx={{ ...cell, textAlign: "left", color: IOS.secondary, fontSize: 12.5 }}>
                          {s.periodStart && s.periodEnd && s.status !== "canceled" ? `${shortDate(s.periodStart)} – ${shortDate(s.periodEnd)}` : "–"}
                        </Box>
                        <Box component="td" sx={{ ...cell, textAlign: "left", fontSize: 12.5 }}>
                          {s.nextCharge ? (
                            <>
                              <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{shortDate(s.nextCharge)} · {usd(s.amount)}</Typography>
                              <Typography sx={{ fontSize: 11.5, color: IOS.secondary }}>
                                every {s.every}
                                {s.collection === "invoice" ? " · sends an invoice" : " · card on file"}
                              </Typography>
                            </>
                          ) : (
                            <Typography sx={{ fontSize: 12.5, color: IOS.tertiary }}>{s.cancelAtPeriodEnd ? "Won't renew" : "–"}</Typography>
                          )}
                        </Box>
                        <Box component="td" sx={{ ...cell, textAlign: "left", whiteSpace: "normal", minWidth: 170 }}>
                          <PaymentCell p={s.payments} />
                        </Box>
                        <Box component="td" sx={{ ...cell, color: IOS.secondary }}>{s.started ? new Date(s.started).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "–"}</Box>
                        <Box component="td" sx={{ ...cell, color: IOS.secondary, fontSize: 12 }}>
                          {s.lastNudge ? `Nudged ${new Date(s.lastNudge.at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : s.status === "trialing" && s.trialEnd ? `Trial ends ${new Date(s.trialEnd).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : s.status === "canceled" && s.ended ? `Ended ${new Date(s.ended).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : ""}
                        </Box>
                        <Box component="td" sx={{ ...cell, py: 0.25 }}>
                          {(s.status === "past_due" || s.status === "unpaid") && (
                            <Button size="small" variant="outlined" color="warning" onClick={() => setNudging(s)} sx={{ fontSize: 12, minWidth: 0, mr: 0.5 }}>
                              Nudge
                            </Button>
                          )}
                          {s.customerId && s.status !== "past_due" && s.status !== "unpaid" && (
                            <Button size="small" onClick={() => hide(s, true)} sx={{ fontSize: 12, minWidth: 0, color: s.test ? IOS.blue : IOS.secondary }}>
                              Hide as test
                            </Button>
                          )}
                        </Box>
                      </tr>
                    ))}
                  </tbody>
                </Box>
              </Box>
            )}
            {data.hidden?.length > 0 && (
              <Box sx={{ mt: 1.5, display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
                <Typography sx={{ fontSize: 12.5, color: IOS.secondary }}>Hidden as tests (not in MRR or income):</Typography>
                {data.hidden.map((h) => (
                  <Box key={h.customerId} sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, px: 1, py: 0.25, borderRadius: IOS.radius.pill, bgcolor: IOS.canvas }}>
                    <Typography sx={{ fontSize: 12.5 }}>{h.label || h.customerId}{h.subscriptions ? ` · ${h.subscriptions} subscription${h.subscriptions === 1 ? "" : "s"}` : ""}</Typography>
                    <Button size="small" onClick={() => hide(h, false)} sx={{ fontSize: 12, minWidth: 0, py: 0 }}>Show again</Button>
                  </Box>
                ))}
              </Box>
            )}
          </Section>
          <Typography sx={{ color: IOS.tertiary, fontSize: 12, mt: 2 }}>
            A management view, not accounting or tax. Stripe is only read here; nothing is charged or changed.{st.at ? ` Stripe as of ${new Date(st.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.` : ""}
          </Typography>
        </>
      )}

      {nudging && <NudgeDialog sub={nudging} onClose={() => setNudging(null)} onSent={(msg) => { setNudging(null); setNote(msg); load(); }} />}
      {importing && <ImportDialog onClose={() => setImporting(false)} year={year} onDone={(msg) => { setImporting(false); setNote(msg); load(); }} />}
      {editing && <ExpenseDialog initial={editing._id ? editing : null} onClose={() => setEditing(null)} onSave={saveExpense} />}
    </Box>
  );
}
