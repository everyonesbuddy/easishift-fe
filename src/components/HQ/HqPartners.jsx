// HQ referral partners: anyone owners trust who introduces clients. They
// don't get an account, just a code (their Stripe promotion code) and a
// signup link with it. Workspaces that sign up with the code show under the
// partner, with months paid (from Stripe) and when the fee is due. Calls and
// emails logged here count toward the Referral partners campaign.
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  Collapse,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import { FiChevronDown, FiCopy, FiPlus, FiRefreshCw, FiX } from "react-icons/fi";
import { toast } from "react-toastify";
import api from "./hqApi";
import { IOS } from "../../theme/ios";
import { Empty, Section, Stat, Tag } from "./HqBits";
import { errorText } from "./hqFormat";

const KINDS = [
  ["email", "Email"],
  ["call", "Call"],
  ["meeting", "Meeting / demo"],
  ["text", "Text"],
  ["note", "Note"],
];
const STATUS_COLOR = { new: IOS.secondary, contacted: IOS.blue, call: "#AF52DE", agreed: IOS.orangeText, active: IOS.greenText, quiet: IOS.tertiary };
const when = (d) => (d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "–");
const toInput = (d) => {
  if (!d) return "";
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};
const fromInput = (v) => (v ? new Date(`${v}T10:00:00`).toISOString() : null);
const money = (n) => {
  const v = Number(n || 0);
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 })}`;
};

async function copy(text, what = "Copied") {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(what);
  } catch {
    toast.error("Couldn't copy. Select it and copy by hand.");
  }
}

/** Is the code set up in Stripe? Shown next to the code. */
function StripeCode({ code, stripe }) {
  if (!code) return <Typography sx={{ fontSize: 13, color: IOS.orangeText }}>No code yet. Give them one (e.g. SAFEHANDS) and make it in Stripe.</Typography>;
  if (!stripe) return <Typography sx={{ fontSize: 13, color: IOS.secondary }}>Stripe isn't connected, so we can't check the code.</Typography>;
  if (!stripe.found)
    return (
      <Typography sx={{ fontSize: 13, color: IOS.orangeText }}>
        {stripe.error || `${code} isn't in Stripe yet. Make it: Stripe → Product catalog → Coupons → your partner coupon → Add promotion code → ${code}.`}
      </Typography>
    );
  return (
    <Typography sx={{ fontSize: 13, color: stripe.active ? IOS.greenText : IOS.orangeText }}>
      {stripe.active ? "Set up in Stripe" : "In Stripe but turned off"}
      {stripe.offer ? ` · ${stripe.offer}` : ""} · used {stripe.timesRedeemed} time{stripe.timesRedeemed === 1 ? "" : "s"}
    </Typography>
  );
}

function FeeTag({ r, percent }) {
  if (r.feeStatus === "due") return <Tag color={IOS.redText}>Owed: {money(r.owed)}</Tag>;
  if (r.feeStatus === "paid") return <Tag color={IOS.greenText}>{percent ? `Paid ${money(r.paidOut)} in full` : `Fee paid ${when(r.feePaidAt)}`}</Tag>;
  if (r.feeStatus === "running") return <Tag color={IOS.blue}>Earning until {when(r.windowEndsAt)}</Tag>;
  return <Tag color={IOS.tertiary}>{percent ? "Earns from their first payment" : "Fee after 2 paid months"}</Tag>;
}

/**
 * The partner's deal: flat fee (default $250 once per client) or a
 * percentage of what each client pays for a number of months. Every
 * change is kept below, with who and when.
 */
function DealBox({ p, patch, saving }) {
  const [type, setType] = useState(p.dealType || "flat");
  const [fee, setFee] = useState(String(p.fee ?? 250));
  const [percent, setPercent] = useState(String(p.percent ?? 15));
  const [months, setMonths] = useState(String(p.percentMonths ?? 12));
  const [note, setNote] = useState(p.dealNote || "");
  const changed =
    type !== (p.dealType || "flat") ||
    (type === "flat" && Number(fee) !== (p.fee ?? 250)) ||
    (type === "percent" && (Number(percent) !== (p.percent ?? 15) || Number(months) !== (p.percentMonths ?? 12))) ||
    note !== (p.dealNote || "");
  const save = () => patch(type === "flat" ? { dealType: "flat", fee, dealNote: note } : { dealType: "percent", percent, percentMonths: months, dealNote: note }, "deal").then((ok) => ok && toast.success("Deal saved. The change is recorded below."));

  return (
    <Box sx={{ bgcolor: IOS.canvas, borderRadius: IOS.radius.cell, p: 1.5, display: "grid", gap: 1.25 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, flexWrap: "wrap", alignItems: "baseline" }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: IOS.secondary }}>Their deal</Typography>
        <Typography sx={{ fontSize: 13.5, fontWeight: 650 }}>{p.deal}</Typography>
      </Box>
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
        <ToggleButtonGroup size="small" exclusive value={type} onChange={(e, v) => v && setType(v)} sx={{ "& .MuiToggleButton-root": { textTransform: "none", px: 1.5 } }}>
          <ToggleButton value="flat">Flat fee</ToggleButton>
          <ToggleButton value="percent">% for a time</ToggleButton>
        </ToggleButtonGroup>
        {type === "flat" ? (
          <TextField size="small" type="number" label="Per client ($)" value={fee} onChange={(e) => setFee(e.target.value)} inputProps={{ min: 0, step: 25 }} sx={{ width: 140 }} />
        ) : (
          <>
            <TextField size="small" type="number" label="Percent" value={percent} onChange={(e) => setPercent(e.target.value)} inputProps={{ min: 1, max: 50, step: 1 }} sx={{ width: 110 }} />
            <TextField size="small" type="number" label="For months" value={months} onChange={(e) => setMonths(e.target.value)} inputProps={{ min: 1, max: 60, step: 1 }} sx={{ width: 120 }} />
          </>
        )}
        <TextField size="small" label="Why (optional)" placeholder="Renegotiated on call, Nov 20" value={note} onChange={(e) => setNote(e.target.value)} sx={{ flex: 1, minWidth: 180 }} />
        <Button variant="contained" disableElevation disabled={!changed || saving === "deal"} onClick={save} sx={{ textTransform: "none" }}>
          Save deal
        </Button>
      </Box>
      <Typography sx={{ fontSize: 12.5, color: IOS.secondary }}>
        {type === "flat"
          ? "Paid once per client, after they've paid 2 months (the free month doesn't count)."
          : `They earn ${percent || "?"}% of each payment a client makes in their first ${months || "?"} months. Pay out whenever it's owed.`}{" "}
        A new deal applies to all their clients from now on; payouts already made stay.
      </Typography>
      {p.dealHistory?.length > 0 && (
        <Box>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: IOS.secondary }}>Deal changes</Typography>
          {p.dealHistory.map((h, i) => (
            <Typography key={`${h.at}:${i}`} sx={{ fontSize: 12.5, color: IOS.secondary }}>
              {when(h.at)}
              {h.by ? ` · ${h.by}` : ""}: {h.from} → <Box component="span" sx={{ color: IOS.ink }}>{h.to}</Box>
            </Typography>
          ))}
        </Box>
      )}
    </Box>
  );
}

function PartnerDialog({ p, types, statuses, onClose, onSaved, onRemoved }) {
  const [saving, setSaving] = useState("");
  const [kind, setKind] = useState("email");
  const [text, setText] = useState("");
  const [notes, setNotes] = useState(p.notes || "");
  const [code, setCode] = useState(p.code || "");
  useEffect(() => {
    setNotes(p.notes || "");
    setCode(p.code || "");
  }, [p._id, p.notes, p.code]);

  const patch = async (body, what = "save") => {
    setSaving(what);
    try {
      const { data } = await api.patch(`/hq/partners/${p._id}`, body);
      onSaved(data);
      return true;
    } catch (e) {
      toast.error(errorText(e, "Couldn't save it."));
      return false;
    } finally {
      setSaving("");
    }
  };
  const field = (k, label, extra = {}) => (
    <TextField size="small" label={label} defaultValue={p[k] || ""} onBlur={(e) => e.target.value !== (p[k] || "") && patch({ [k]: e.target.value }, k)} {...extra} />
  );
  const addLog = async () => {
    setSaving("log");
    try {
      const { data } = await api.post(`/hq/partners/${p._id}/log`, { kind, text });
      onSaved(data);
      setText("");
      toast.success(["call", "email", "meeting"].includes(kind) ? "Logged. It counts toward the Referral partners campaign." : "Logged.");
    } catch (e) {
      toast.error(errorText(e, "Couldn't log it."));
    } finally {
      setSaving("");
    }
  };
  const removeLog = async (id) => {
    try {
      const { data } = await api.delete(`/hq/partners/${p._id}/log/${id}`);
      onSaved(data);
    } catch (e) {
      toast.error(errorText(e, "Couldn't remove it."));
    }
  };
  const fee = async (tenantId, paid) => {
    setSaving(`fee:${tenantId}`);
    try {
      const { data } = await api.post(`/hq/partners/${p._id}/fees`, { tenantId, paid });
      onSaved(data);
      if (paid) toast.success("Marked paid.");
    } catch (e) {
      toast.error(errorText(e, "Couldn't save it."));
    } finally {
      setSaving("");
    }
  };
  const remove = async () => {
    if (!window.confirm(`Remove ${p.name}? Workspaces that used their code keep it.`)) return;
    try {
      await api.delete(`/hq/partners/${p._id}`);
      onRemoved(p._id);
    } catch (e) {
      toast.error(errorText(e, "Couldn't remove it."));
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, pb: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 19, fontWeight: 750 }}>{p.name}</Typography>
          <Typography sx={{ fontSize: 13, color: IOS.secondary }}>
            {p.typeLabel}
            {p.contactName ? ` · ${p.contactName}` : ""}
            {p.area ? ` · ${p.area}` : ""}
          </Typography>
        </Box>
        <IconButton onClick={onClose} aria-label="Close">
          <FiX />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: "grid", gap: 2.5 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 1.5, pt: 0.5 }}>
          <TextField size="small" select label="Status" value={p.status} onChange={(e) => patch({ status: e.target.value }, "status")}>
            {Object.entries(statuses).map(([k, v]) => (
              <MenuItem key={k} value={k}>{v}</MenuItem>
            ))}
          </TextField>
          <TextField size="small" type="date" label="Next step on" InputLabelProps={{ shrink: true }} value={toInput(p.nextDate)} onChange={(e) => patch({ nextDate: fromInput(e.target.value) }, "next")} />
        </Box>

        {/* Keyed on the saved deal, so it resets after a save. */}
        <DealBox key={`${p._id}:${p.dealType}:${p.fee}:${p.percent}:${p.percentMonths}:${p.dealNote}`} p={p} patch={patch} saving={saving} />

        <Box sx={{ bgcolor: IOS.canvas, borderRadius: IOS.radius.cell, p: 1.5, display: "grid", gap: 1 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: IOS.secondary }}>Their code</Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
            <TextField
              size="small"
              placeholder="SAFEHANDS"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
              onBlur={() => code !== (p.code || "") && patch({ code }, "code")}
              inputProps={{ maxLength: 30, style: { fontWeight: 700, letterSpacing: "0.04em" } }}
              sx={{ width: 200 }}
            />
            {p.link && (
              <Button size="small" startIcon={<FiCopy />} onClick={() => copy(p.link, "Signup link copied")} sx={{ textTransform: "none" }}>
                Copy their signup link
              </Button>
            )}
          </Box>
          <StripeCode code={p.code} stripe={p.stripe} />
          {p.link && (
            <Box>
              <Typography sx={{ fontSize: 12.5, fontFamily: "ui-monospace, Menlo, monospace", wordBreak: "break-all" }}>{p.link}</Typography>
              <Typography sx={{ fontSize: 12.5, color: IOS.secondary }}>
                The code fills in by itself from this link. Clients can also type {p.code} when they sign up or at checkout.
              </Typography>
            </Box>
          )}
        </Box>

        <Box>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: IOS.secondary, mb: 0.5 }}>
            Clients they introduced · {p.totals.introduced}
          </Typography>
          {!p.referrals.length && <Typography sx={{ fontSize: 13, color: IOS.tertiary }}>Nobody has signed up with {p.code || "their code"} yet.</Typography>}
          {p.referrals.map((r) => (
            <Box key={r.tenantId} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr auto auto" }, gap: { xs: 0.5, sm: 1.5 }, alignItems: "center", py: 0.9, borderBottom: `1px solid ${IOS.hairline}` }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 650 }}>{r.name}</Typography>
                <Typography sx={{ fontSize: 12.5, color: IOS.secondary }}>
                  Signed up {when(r.signedUpAt)} · {r.paidMonths} paid month{r.paidMonths === 1 ? "" : "s"}
                  {r.paidTotal ? ` (${money(r.paidTotal)})` : ""}
                  {r.subscriptionStatus ? ` · ${r.subscriptionStatus.replace("_", " ")}` : " · not subscribed yet"}
                </Typography>
                {(r.earned > 0 || r.paidOut > 0) && (
                  <Typography sx={{ fontSize: 12.5, color: IOS.secondary }}>
                    Earned {money(r.earned)} · paid out {money(r.paidOut)}
                    {r.feePaidAt ? ` (last ${when(r.feePaidAt)})` : ""}
                  </Typography>
                )}
              </Box>
              <FeeTag r={r} percent={p.dealType === "percent"} />
              {r.owed > 0 ? (
                <Button size="small" variant="contained" disableElevation disabled={saving === `fee:${r.tenantId}`} onClick={() => fee(r.tenantId, true)} sx={{ textTransform: "none" }}>
                  Mark {money(r.owed)} paid
                </Button>
              ) : r.paidOut > 0 ? (
                <ButtonBase onClick={() => fee(r.tenantId, false)} sx={{ fontSize: 12, color: IOS.tertiary }}>
                  Undo last payout
                </ButtonBase>
              ) : (
                <Box />
              )}
            </Box>
          ))}
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 1.5 }}>
          {field("name", "Business name")}
          {field("contactName", "Contact name")}
          <TextField size="small" select label="Type" value={p.type} onChange={(e) => patch({ type: e.target.value }, "type")}>
            {Object.entries(types).map(([k, v]) => (
              <MenuItem key={k} value={k}>{v}</MenuItem>
            ))}
          </TextField>
          {field("email", "Email")}
          {field("phone", "Phone")}
          {field("area", "Area", { placeholder: "Maryland & DC" })}
          {field("website", "Website or post link", { sx: { gridColumn: { sm: "1 / -1" } } })}
        </Box>

        <Box>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: IOS.secondary, mb: 0.75 }}>Log</Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "flex-start" }}>
            <TextField size="small" select value={kind} onChange={(e) => setKind(e.target.value)} sx={{ width: 170 }}>
              {KINDS.map(([k, v]) => (
                <MenuItem key={k} value={k}>{v}</MenuItem>
              ))}
            </TextField>
            <TextField size="small" multiline maxRows={4} placeholder="What happened, and what's next" value={text} onChange={(e) => setText(e.target.value)} sx={{ flex: 1, minWidth: 220 }} />
            <Button variant="contained" disableElevation disabled={saving === "log" || (kind === "note" && !text.trim())} onClick={addLog} sx={{ textTransform: "none" }}>
              {saving === "log" ? <CircularProgress size={18} /> : "Log it"}
            </Button>
          </Box>
          <Typography sx={{ fontSize: 12, color: IOS.secondary, mt: 0.5 }}>Emails, calls and meetings count toward the Referral partners campaign (2 new partners a week).</Typography>
          <Box sx={{ mt: 1 }}>
            {!p.log.length && <Typography sx={{ fontSize: 13, color: IOS.tertiary }}>Nothing logged yet.</Typography>}
            {p.log.map((e) => (
              <Box key={e._id} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "130px 1fr auto" }, gap: { sm: 1.5 }, py: 0.75, borderBottom: `1px solid ${IOS.hairline}` }}>
                <Typography sx={{ fontSize: 12.5, color: IOS.secondary }}>
                  {when(e.at)} · {KINDS.find(([k]) => k === e.kind)?.[1] || e.kind}
                </Typography>
                <Typography sx={{ fontSize: 13.5, whiteSpace: "pre-wrap" }}>
                  {e.text || "–"}
                  {e.by && <Box component="span" sx={{ color: IOS.tertiary }}> · {e.by}</Box>}
                </Typography>
                <ButtonBase onClick={() => removeLog(e._id)} sx={{ fontSize: 12, color: IOS.tertiary, alignSelf: "start" }}>
                  Remove
                </ButtonBase>
              </Box>
            ))}
          </Box>
        </Box>

        <TextField
          label="Notes"
          multiline
          minRows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => notes !== (p.notes || "") && patch({ notes }, "notes")}
          placeholder="About 12 clients, mostly DDA agencies with 3-6 homes. Prefers email. Wants a demo she can show on visits."
        />

        <Box>
          <ButtonBase onClick={remove} sx={{ fontSize: 13, color: IOS.redText }}>
            Remove this partner
          </ButtonBase>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

/** The campaign's scripts, one at a time, with copy. */
function Scripts({ play }) {
  const [open, setOpen] = useState(null);
  if (!play?.scripts?.length) return <Empty>The Referral partners campaign isn't in the playbook yet.</Empty>;
  return (
    <Box>
      {play.scripts.map((s, i) => (
        <Box key={`${s.label}:${i}`} sx={{ borderBottom: `1px solid ${IOS.hairline}` }}>
          <ButtonBase onClick={() => setOpen(open === i ? null : i)} sx={{ display: "flex", width: "100%", justifyContent: "space-between", py: 1, textAlign: "left" }}>
            <Typography sx={{ fontSize: 14, fontWeight: 650 }}>{s.label}</Typography>
            <Box component={FiChevronDown} sx={{ color: IOS.secondary, transform: open === i ? "rotate(180deg)" : "none", transition: "transform .15s", flexShrink: 0 }} />
          </ButtonBase>
          <Collapse in={open === i} unmountOnExit>
            <Box sx={{ pb: 1.5 }}>
              {s.subject && (
                <Typography sx={{ fontSize: 13.5, mb: 0.5 }}>
                  <Box component="span" sx={{ color: IOS.secondary }}>Subject: </Box>
                  {s.subject}
                </Typography>
              )}
              <Typography sx={{ fontSize: 13.5, whiteSpace: "pre-wrap", bgcolor: IOS.canvas, borderRadius: IOS.radius.cell, p: 1.5 }}>{s.body}</Typography>
              <Button size="small" startIcon={<FiCopy />} onClick={() => copy(s.subject ? `Subject: ${s.subject}\n\n${s.body}` : s.body, "Script copied")} sx={{ textTransform: "none", mt: 0.5 }}>
                Copy
              </Button>
            </Box>
          </Collapse>
        </Box>
      ))}
    </Box>
  );
}

const SETUP = [
  "In Stripe, make one coupon for all partners: Product catalog → Coupons → New → 100% off, Duration: Repeating, 1 month. Name it \"Partner: extra free month\".",
  "For each partner, open that coupon → Add promotion code → their code (e.g. SAFEHANDS). Then type the same code on the partner here.",
  "Send them their signup link (Copy their signup link). Clients who sign up through it, or type the code at signup or checkout, show under the partner.",
  "When a client has paid 2 months, the fee shows as due here. Pay it (check or Zelle), then Mark paid.",
];

export default function HqPartners() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", type: "other", code: "" });
  const [showSetup, setShowSetup] = useState(false);

  const load = useCallback(async (refresh) => {
    setLoading(true);
    try {
      const { data: d } = await api.get("/hq/partners", { params: refresh ? { refresh: 1 } : {} });
      setData(d);
      setError("");
    } catch (e) {
      setError(errorText(e, "Couldn't load partners."));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const replace = (p) => setData((d) => ({ ...d, partners: d.partners.some((x) => x._id === p._id) ? d.partners.map((x) => (x._id === p._id ? p : x)) : [p, ...d.partners] }));
  const open = useMemo(() => data?.partners.find((p) => p._id === openId) || null, [data, openId]);
  const due = useMemo(
    () => (data?.partners || []).flatMap((p) => p.referrals.filter((r) => r.feeStatus === "due").map((r) => ({ p, r }))),
    [data],
  );
  const counts = useMemo(() => {
    const ps = data?.partners || [];
    return {
      partners: ps.filter((p) => p.status !== "quiet").length,
      active: ps.filter((p) => p.status === "active").length,
      introduced: ps.reduce((n, p) => n + p.totals.introduced, 0),
      paying: ps.reduce((n, p) => n + p.totals.paying, 0),
      dueAmount: ps.reduce((n, p) => n + p.totals.feesDueAmount, 0),
    };
  }, [data]);

  const add = async () => {
    try {
      const { data: p } = await api.post("/hq/partners", draft);
      replace(p);
      setDraft({ name: "", type: "other", code: "" });
      setAdding(false);
      setOpenId(p._id);
    } catch (e) {
      toast.error(errorText(e, "Couldn't add it."));
    }
  };

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <CircularProgress size={22} />;

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" }, gap: 1 }}>
        <Stat label="Partners" value={counts.partners} detail={`${counts.active} sending clients`} />
        <Stat label="Clients introduced" value={counts.introduced} detail="signed up with a partner's code" />
        <Stat label="Paying" value={counts.paying} detail="of those clients" />
        <Stat label="Fees due" value={money(counts.dueAmount)} tone={counts.dueAmount ? IOS.redText : undefined} detail={`for ${due.length} client${due.length === 1 ? "" : "s"}`} />
      </Box>

      {due.length > 0 && (
        <Section title="Fees to pay">
          {due.map(({ p, r }) => (
            <ButtonBase key={`${p._id}:${r.tenantId}`} onClick={() => setOpenId(p._id)} sx={{ display: "flex", gap: 1, alignItems: "baseline", justifyContent: "flex-start", textAlign: "left", width: "100%", py: 0.6, flexWrap: "wrap" }}>
              <Box component="span" sx={{ fontSize: 14, fontWeight: 650, color: IOS.redText }}>
                Pay {p.name} {money(r.owed)}
              </Box>
              <Box component="span" sx={{ fontSize: 13, color: IOS.secondary }}>
                {r.name}: earned {money(r.earned)}, paid out {money(r.paidOut)} so far
              </Box>
            </ButtonBase>
          ))}
        </Section>
      )}

      <Section
        title="Partners"
        note="Anyone owners already trust: happy customers, nurse and pharmacy consultants, coaches, training schools, payroll firms, insurance brokers, software vendors. No accounts for them, just a code. Their clients get an extra free month; they get $250 once a client has paid 2 months, or the deal you agree with them."
        right={
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <Button size="small" startIcon={loading ? <CircularProgress size={13} /> : <FiRefreshCw />} disabled={loading} onClick={() => load(true)} sx={{ textTransform: "none", borderRadius: IOS.radius.round }}>
              Refresh
            </Button>
            <Button size="small" variant="contained" disableElevation startIcon={<FiPlus />} onClick={() => setAdding((v) => !v)} sx={{ textTransform: "none", borderRadius: IOS.radius.round }}>
              Add a partner
            </Button>
          </Box>
        }
      >
        {adding && (
          <Box sx={{ display: "flex", gap: 1, mb: 1.5, flexWrap: "wrap", alignItems: "flex-start" }}>
            <TextField size="small" autoFocus label="Business name" placeholder="Safe Hands Services" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} sx={{ flex: 1, minWidth: 220 }} />
            <TextField size="small" select label="Type" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} sx={{ width: 240 }}>
              {Object.entries(data.types).map(([k, v]) => (
                <MenuItem key={k} value={k}>{v}</MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              label="Code (optional)"
              placeholder="SAFEHANDS"
              value={draft.code}
              onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })}
              onKeyDown={(e) => e.key === "Enter" && draft.name.trim() && add()}
              sx={{ width: 170 }}
            />
            <Button variant="outlined" disabled={!draft.name.trim()} onClick={add} sx={{ textTransform: "none" }}>
              Add
            </Button>
          </Box>
        )}
        {!data.partners.length && <Empty>No partners yet. Add the first one, like a happy customer or the nurse consultant from the Facebook group.</Empty>}
        {data.partners.map((p) => (
          <ButtonBase
            key={p._id}
            onClick={() => setOpenId(p._id)}
            sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(220px, 1.2fr) 1fr auto" }, gap: { xs: 0.5, md: 2 }, alignItems: "center", textAlign: "left", width: "100%", py: 1.5, borderBottom: `1px solid ${IOS.hairline}`, opacity: p.status === "quiet" ? 0.55 : 1 }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 15 }}>{p.name}</Typography>
              <Typography sx={{ fontSize: 12.5, color: IOS.secondary }}>
                {p.typeLabel}
                {p.contactName ? ` · ${p.contactName}` : ""}
                {p.area ? ` · ${p.area}` : ""}
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 13 }}>
              {p.code ? (
                <Box component="span" sx={{ fontWeight: 700, letterSpacing: "0.03em" }}>
                  {p.code}
                </Box>
              ) : (
                <Box component="span" sx={{ color: IOS.orangeText }}>No code yet</Box>
              )}
              <Box component="span" sx={{ color: IOS.secondary }}>
                {" "}· {p.dealType === "percent" ? `${p.percent}% for ${p.percentMonths} mo` : `$${p.fee ?? 250} flat`} · {p.totals.introduced} introduced · {p.totals.paying} paying
              </Box>
              {p.totals.feesDue > 0 && (
                <Box component="span" sx={{ color: IOS.redText, fontWeight: 650 }}>
                  {" "}· {money(p.totals.feesDueAmount)} due
                </Box>
              )}
            </Typography>
            <Tag color={STATUS_COLOR[p.status] || IOS.secondary}>{p.statusLabel}</Tag>
          </ButtonBase>
        ))}
      </Section>

      <Section
        title="Scripts"
        note="From the Referral partners campaign in the playbook. Edit them there."
        right={
          <Button size="small" onClick={() => setShowSetup((v) => !v)} sx={{ textTransform: "none" }} endIcon={<FiChevronDown style={{ transform: showSetup ? "rotate(180deg)" : "none" }} />}>
            How codes work
          </Button>
        }
      >
        <Collapse in={showSetup}>
          <Box component="ol" sx={{ pl: 2.5, mt: 0, mb: 2, bgcolor: IOS.canvas, borderRadius: IOS.radius.cell, py: 1.25, pr: 1.5 }}>
            {SETUP.map((s) => (
              <Box component="li" key={s} sx={{ fontSize: 13.5, mb: 0.5 }}>
                {s}
              </Box>
            ))}
          </Box>
        </Collapse>
        <Scripts play={data.play} />
      </Section>

      {!data.stripeConfigured && (
        <Typography sx={{ fontSize: 12.5, color: IOS.secondary }}>Stripe isn't connected here, so paid months and codes can't be checked.</Typography>
      )}

      {open && (
        <PartnerDialog
          p={open}
          types={data.types}
          statuses={data.statuses}
          onClose={() => setOpenId(null)}
          onSaved={(p) => replace(p)}
          onRemoved={(id) => {
            setOpenId(null);
            setData((d) => ({ ...d, partners: d.partners.filter((x) => x._id !== id) }));
          }}
        />
      )}
    </Box>
  );
}
