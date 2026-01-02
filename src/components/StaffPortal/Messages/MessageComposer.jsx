import { useState, useEffect } from "react";
import { TextField, Button, Typography, MenuItem, Box } from "@mui/material";
import axios from "axios";
import { useAuth } from "../../../context/AuthContext";

export default function MessageComposer({ onSuccess }) {
  const { user } = useAuth();

  const [form, setForm] = useState({
    receiverId: "",
    subject: "",
    body: "",
  });

  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStaff() {
      try {
        const res = await axios.get("http://localhost:5000/api/v1/auth/users", {
          withCredentials: true,
        });
        setStaffList(res.data.filter((u) => u._id !== user._id)); // don't message yourself
      } catch (err) {
        console.error("Failed to load staff", err);
      } finally {
        setLoading(false);
      }
    }

    loadStaff();
  }, []);

  const handleSubmit = async () => {
    try {
      await axios.post(
        "http://localhost:5000/api/v1/messages",
        {
          senderId: user._id,
          senderModel: "User",
          receiverId: form.receiverId,
          receiverModel: "User",
          subject: form.subject,
          body: form.body,
        },
        { withCredentials: true }
      );

      onSuccess(); // close
    } catch (err) {
      console.error("Failed to send message", err);
    }
  };

  return (
    <>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Send Message
      </Typography>

      <TextField
        select
        fullWidth
        label="Recipient"
        sx={{ mb: 2 }}
        value={form.receiverId}
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
        <Button variant="outlined" fullWidth onClick={() => onSuccess(false)}>
          Cancel
        </Button>
      </Box>
    </>
  );
}
