import { Box, Typography } from "@mui/material";
import { IOS, tint } from "../../theme/ios";
import { MESSAGE_FIELDS } from "./playFormat";

/**
 * What we say to one buyer: the promise in one line, then their pains, the
 * proof, content angles, the ask and what not to lead with.
 */
export default function BuyerMessage({ buyer, color = IOS.blue, compact = false }) {
  if (!buyer?.promise && !MESSAGE_FIELDS.some(([k]) => buyer?.[k])) return null;
  return (
    <Box sx={{ mt: compact ? 1.25 : 0 }}>
      {buyer.promise && (
        <Box sx={{ p: 1.5, borderRadius: "10px", bgcolor: tint(color, 0.08), border: `1px solid ${tint(color, 0.22)}` }}>
          <Typography sx={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color }}>What we say</Typography>
          <Typography sx={{ fontSize: compact ? 15.5 : 17, fontWeight: 700, lineHeight: 1.35, mt: 0.25 }}>“{buyer.promise}”</Typography>
        </Box>
      )}
      {MESSAGE_FIELDS.filter(([k]) => buyer[k]).map(([k, label]) => (
        <Box key={k} sx={{ mt: 1 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: k === "avoid" ? IOS.red : IOS.secondary, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</Typography>
          <Typography sx={{ fontSize: 14, lineHeight: 1.55 }}>{buyer[k]}</Typography>
        </Box>
      ))}
    </Box>
  );
}
