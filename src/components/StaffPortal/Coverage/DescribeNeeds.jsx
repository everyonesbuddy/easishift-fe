import { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, IconButton, Paper, TextField, Tooltip, Typography } from "@mui/material";
import { MdMic, MdMicOff } from "react-icons/md";
import { toast } from "react-toastify";
import api from "../../../config/api";
import { mergeNeeds, describeMerge } from "../../../utils/mergeNeeds";
import { IOS, tint } from "../../../theme/ios";

const EXAMPLE =
  "4 CNAs on day shift during the week, 3 on weekends. 1 med tech every shift. Nights need 2 CNAs and a nurse.";

const getRecognizer = () =>
  typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

/**
 * "Describe your week": type or say what a normal week needs; it's read by
 * POST /nl/parse (formType weeklyNeeds) and merged into the table below for
 * review. Nothing is saved until Save.
 */
export default function DescribeNeeds({ rules, onRules }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState([]);
  const [listening, setListening] = useState(false);
  const recognition = useRef(null);
  const textBefore = useRef("");
  const Recognizer = getRecognizer();

  useEffect(() => () => recognition.current?.stop(), []);

  const toggleMic = () => {
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const rec = new Recognizer();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    textBefore.current = text;
    rec.onresult = (event) => {
      let final = "";
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const said = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += said;
        else interim += said;
      }
      const join = (a, b) => (a && b ? `${a}${a.endsWith(" ") ? "" : " "}${b}` : a || b);
      if (final) textBefore.current = join(textBefore.current, final.trim());
      setText(join(textBefore.current, interim.trim()));
    };
    rec.onerror = () => {
      setListening(false);
      toast.error("Couldn't hear that. Check the microphone permission and try again.");
    };
    rec.onend = () => setListening(false);
    recognition.current = rec;
    rec.start();
    setListening(true);
  };

  const fillIn = async () => {
    recognition.current?.stop();
    setBusy(true);
    setNotes([]);
    try {
      const res = await api.post("/nl/parse", {
        formType: "weeklyNeeds",
        message: text.trim(),
        currentFormState: { rules },
      });
      const draft = res.data?.draft || {};
      const result = mergeNeeds(rules, draft.rows || []);
      setNotes(draft.notUnderstood || []);
      if (result.added || result.changed || result.removed) {
        onRules(result.rules);
        setText("");
        toast.success(`${describeMerge(result)}. Look it over, then press Save.`, { position: "top-right", autoClose: 4000 });
      } else {
        toast.info("Nothing to change from that. Try naming the shift, the role and how many.", { position: "top-right" });
      }
    } catch (err) {
      const data = err?.response?.data;
      const gaps = (data?.gaps || []).map((g) => g.message);
      setNotes(gaps.length ? gaps : []);
      toast.error(gaps.length ? "Finish Facility Preferences first." : data?.message || "Couldn't read that. Try again.", {
        position: "top-right",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{ p: { xs: 2, md: 2.5 }, mb: 2, borderRadius: IOS.radius.card, boxShadow: IOS.shadow, border: `1px solid ${IOS.hairline}` }}
    >
      <Typography sx={{ fontWeight: 700, color: IOS.ink }}>Describe your week</Typography>
      <Typography sx={{ color: IOS.secondary, fontSize: 14, mb: 1.5 }}>
        Type or say what a normal week needs. We fill in the table below; you check it and save.
      </Typography>
      <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
        <TextField
          fullWidth
          multiline
          minRows={2}
          maxRows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && text.trim() && !busy) fillIn();
          }}
          placeholder={`e.g. ${EXAMPLE}`}
          disabled={busy}
          inputProps={{ "aria-label": "Describe your week" }}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: IOS.canvas, fontSize: 14 }, "& fieldset": { border: "none" } }}
        />
        {Recognizer && (
          <Tooltip title={listening ? "Stop" : "Speak"}>
            <IconButton
              onClick={toggleMic}
              disabled={busy}
              aria-label={listening ? "Stop listening" : "Speak your week"}
              sx={{
                mt: 0.5,
                color: listening ? "#fff" : IOS.blue,
                bgcolor: listening ? IOS.red : tint(IOS.blue, 0.1),
                "&:hover": { bgcolor: listening ? IOS.red : tint(IOS.blue, 0.18) },
              }}
            >
              {listening ? <MdMicOff size={20} /> : <MdMic size={20} />}
            </IconButton>
          </Tooltip>
        )}
      </Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1.25, gap: 2, flexWrap: "wrap" }}>
        <Typography sx={{ color: listening ? IOS.red : IOS.tertiary, fontSize: 13 }}>
          {listening ? "Listening… tap the mic again when you're done." : "You can also change a few days, e.g. \"Saturdays only 2 CNAs on days\"."}
        </Typography>
        <Button
          variant="contained"
          disableElevation
          disabled={busy || !text.trim()}
          onClick={fillIn}
          sx={{ borderRadius: "10px", px: 2.5, bgcolor: IOS.blue, "&.Mui-disabled": { bgcolor: IOS.fill, color: IOS.tertiary } }}
        >
          {busy ? "Reading…" : "Fill in"}
        </Button>
      </Box>
      {notes.length > 0 && (
        <Alert severity="warning" sx={{ mt: 1.5, borderRadius: "12px" }} onClose={() => setNotes([])}>
          {notes.length === 1 ? notes[0] : (
            <Box component="ul" sx={{ m: 0, pl: 2 }}>
              {notes.map((n) => <li key={n}>{n}</li>)}
            </Box>
          )}
        </Alert>
      )}
    </Paper>
  );
}
