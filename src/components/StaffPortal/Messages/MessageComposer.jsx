import { useState, useEffect, useMemo } from "react";
import {
  TextField,
  Button,
  Typography,
  MenuItem,
  ListSubheader,
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
    recipientSelection: initialRecipientId ? `user:${initialRecipientId}` : "",
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
      recipientSelection: initialRecipientId
        ? `user:${initialRecipientId}`
        : "",
      subject: initialSubject,
    }));
  }, [initialRecipientId, initialSubject]);

  const roleOptions = useMemo(() => {
    const uniqueRoles = [
      ...new Set(staffList.map((staff) => staff.role).filter(Boolean)),
    ];
    return uniqueRoles.sort((a, b) => a.localeCompare(b));
  }, [staffList]);

  const resolveReceiverIds = () => {
    const selection = form.recipientSelection;

    if (!selection) return [];

    if (selection === "all_staff") {
      return staffList.map((staff) => staff._id);
    }

    if (selection.startsWith("role:")) {
      const role = selection.replace("role:", "");
      return staffList
        .filter((staff) => staff.role === role)
        .map((staff) => staff._id);
    }

    if (selection.startsWith("user:")) {
      const userId = selection.replace("user:", "");
      return userId ? [userId] : [];
    }

    return [];
  };

  const handleSubmit = async () => {
    try {
      const receiverIds = resolveReceiverIds();

      if (!receiverIds.length) {
        toast.error("Please select at least one recipient", {
          position: "top-right",
          autoClose: 3000,
        });
        return;
      }

      await api.post("/messages", {
        senderId: user._id,
        senderModel: "User",
        receiverIds,
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
        label="Recipients"
        sx={{ mb: 2 }}
        value={form.recipientSelection}
        disabled={lockRecipient}
        onChange={(e) =>
          setForm({ ...form, recipientSelection: e.target.value })
        }
      >
        <ListSubheader>Quick Select</ListSubheader>
        <MenuItem value="all_staff">All Staff (except you)</MenuItem>

        {roleOptions.length > 0 && <ListSubheader>By Role</ListSubheader>}
        {roleOptions.map((role) => (
          <MenuItem key={role} value={`role:${role}`}>
            Role: {role}
          </MenuItem>
        ))}

        <ListSubheader>Individual Staff</ListSubheader>
        {staffList.map((s) => (
          <MenuItem key={s._id} value={`user:${s._id}`}>
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
