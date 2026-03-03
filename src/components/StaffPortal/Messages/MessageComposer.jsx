import { useState, useEffect } from "react";
import {
  TextField,
  Button,
  Typography,
  MenuItem,
  Box,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import api from "../../../config/api";
import { toast } from "react-toastify";
import { useAuth } from "../../../context/AuthContext";

export default function MessageComposer({
  onSuccess,
  onClose,
  initialRecipientId = "",
  lockRecipient = false,
  initialSubject = "",
}) {
  const { user } = useAuth();

  const [form, setForm] = useState({
    receiverId: initialRecipientId,
    subject: initialSubject,
    body: "",
  });

  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStaff() {
      try {
        const res = await api.get("/auth/users");
        setStaffList(res.data.filter((u) => u._id !== user._id)); // don't message yourself
      } catch (err) {
        console.error("Failed to load staff", err);
      } finally {
        setLoading(false);
      }
    }

    loadStaff();
  }, []);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      receiverId: initialRecipientId,
      subject: initialSubject,
    }));
  }, [initialRecipientId, initialSubject]);

  const handleSubmit = async () => {
    try {
      await api.post("/messages", {
        senderId: user._id,
        senderModel: "User",
        receiverId: form.receiverId,
        receiverModel: "User",
        subject: form.subject,
        body: form.body,
      });

      toast.success("Message sent", { position: "top-right", autoClose: 2000 });
      onSuccess(); // close
    } catch (err) {
      console.error("Failed to send message", err);
      toast.error("Failed to send message", {
        position: "top-right",
        autoClose: 4000,
      });
    }
  };

  return (
    <Box sx={{ position: "relative" }}>
      {onClose && (
        <IconButton
          aria-label="Close"
          onClick={onClose}
          sx={{ position: "absolute", top: -8, right: -8 }}
        >
          <CloseIcon />
        </IconButton>
      )}
      <Typography variant="h6" sx={{ mb: 2 }}>
        Send Message
      </Typography>

      <TextField
        select
        fullWidth
        label="Recipient"
        sx={{ mb: 2 }}
        value={form.receiverId}
        disabled={lockRecipient}
        onChange={(e) => setForm({ ...form, receiverId: e.target.value })}
      >
        {staffList.map((s) => (
          <MenuItem key={s._id} value={s._id}>
            {s.name}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        fullWidth
        label="Subject"
        sx={{ mb: 2 }}
        value={form.subject}
        onChange={(e) => setForm({ ...form, subject: e.target.value })}
      />

      <TextField
        fullWidth
        label="Message Body"
        multiline
        rows={4}
        sx={{ mb: 2 }}
        value={form.body}
        onChange={(e) => setForm({ ...form, body: e.target.value })}
      />

      <Box sx={{ display: "flex", gap: 2 }}>
        <Button variant="contained" fullWidth onClick={handleSubmit}>
          Send
        </Button>
      </Box>
    </Box>
  );
}
