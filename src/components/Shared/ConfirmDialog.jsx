import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from "@mui/material";

export default function ConfirmDialog({
  open,
  title = "Confirm",
  message = "Are you sure?",
  onCancel,
  onConfirm,
  confirmLabel = "Delete",
}) {
  return (
    <Dialog open={open} onClose={onCancel}>
      <DialogTitle sx={{ fontWeight: "bold" }}>{title}</DialogTitle>

      <DialogContent>
        <Typography>{message}</Typography>
      </DialogContent>

      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>

        <Button color="error" variant="contained" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
