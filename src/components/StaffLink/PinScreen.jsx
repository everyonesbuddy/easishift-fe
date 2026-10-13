import { useEffect, useRef, useState } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import { FiLock } from "react-icons/fi";
import { IOS, tint } from "../../theme/ios";

/**
 * PIN gate for a staff link. First time: choose a 4-digit PIN and type it
 * again. On a new phone or computer: enter it. `onSubmit(mode, pin)` returns
 * an error message (string) or nothing on success.
 */
export default function PinScreen({ firstName, facilityName, pinSet, onSubmit }) {
  const [step, setStep] = useState(pinSet ? "enter" : "choose"); // choose | confirm | enter
  const [pin, setPin] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  // Keep the number pad up: refocus after each step and after a check.
  useEffect(() => {
    if (!busy) inputRef.current?.focus();
  }, [step, busy]);

  const submit = async (value) => {
    if (step === "choose") {
      setFirstPin(value);
      setPin("");
      setStep("confirm");
      return;
    }
    if (step === "confirm" && value !== firstPin) {
      setError("Those didn't match. Choose your PIN again.");
      setPin("");
      setFirstPin("");
      setStep("choose");
      return;
    }
    setBusy(true);
    const message = await onSubmit(step === "enter" ? "verify" : "setup", value);
    setBusy(false);
    if (message) {
      setError(message);
      setPin("");
    }
  };

  const onChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 4);
    setPin(value);
    if (value) setError("");
    if (value.length === 4 && !busy) submit(value);
  };

  const title =
    step === "choose" ? "Choose a 4-digit PIN" : step === "confirm" ? "Type it once more" : "Enter your PIN";
  const help =
    step === "enter"
      ? "You'll only need it once on this phone or computer."
      : "You'll enter it the first time you open your link on a new phone or computer.";

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: IOS.canvas,
        fontFamily: IOS.font,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        px: 3,
        pt: { xs: 10, sm: 14 },
      }}
      onClick={() => inputRef.current?.focus()}
    >
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: "16px",
          bgcolor: tint(IOS.blue, 0.12),
          color: IOS.blue,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mb: 2.5,
        }}
      >
        <FiLock size={26} />
      </Box>
      <Typography sx={{ color: IOS.secondary, fontSize: 15 }}>{facilityName}</Typography>
      <Typography sx={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", color: IOS.ink, mt: 0.25 }}>
        Hi {firstName}
      </Typography>
      <Typography sx={{ fontSize: 17, fontWeight: 600, color: IOS.ink, mt: 3 }}>{title}</Typography>
      <Typography sx={{ fontSize: 14, color: IOS.secondary, mt: 0.5, textAlign: "center", maxWidth: 300 }}>{help}</Typography>

      {/* Four dots; the real input is invisible on top so the number pad opens. */}
      <Box sx={{ position: "relative", mt: 4, mb: 2 }}>
        <Box sx={{ display: "flex", gap: 2.5 }} aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <Box
              key={i}
              sx={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                border: `2px solid ${error ? IOS.red : IOS.ink}`,
                bgcolor: i < pin.length ? (error ? IOS.red : IOS.ink) : "transparent",
                transition: "background-color 120ms ease",
              }}
            />
          ))}
        </Box>
        <Box
          component="input"
          ref={inputRef}
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={step === "enter" ? "current-password" : "new-password"}
          aria-label={title}
          value={pin}
          onChange={onChange}
          disabled={busy}
          sx={{ position: "absolute", inset: -12, opacity: 0, width: "calc(100% + 24px)", fontSize: 16 }}
        />
      </Box>

      <Box sx={{ minHeight: 48, textAlign: "center", maxWidth: 320 }}>
        {busy ? (
          <CircularProgress size={22} />
        ) : error ? (
          <Typography sx={{ color: IOS.redText, fontSize: 14 }} role="alert">
            {error}
          </Typography>
        ) : null}
      </Box>

      {step === "enter" && (
        <Typography sx={{ fontSize: 13, color: IOS.secondary, mt: 2, textAlign: "center" }}>
          Forgot it? Ask your scheduler to reset your PIN.
        </Typography>
      )}
    </Box>
  );
}
