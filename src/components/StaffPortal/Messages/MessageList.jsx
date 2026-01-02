import { useEffect, useMemo, useState } from "react";
import {
  Container,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Box,
  Button,
  Modal,
  Paper,
  Avatar,
  TextField,
  InputAdornment,
  Divider,
  Stack,
  Badge,
  Tabs,
  Tab,
} from "@mui/material";
import { FiEye, FiSearch, FiPlus, FiMail, FiSend } from "react-icons/fi";
import axios from "axios";
import { useAuth } from "../../../context/AuthContext";
import MessageComposer from "./MessageComposer";

// role colors (local mapping)
const ROLE_COLORS = {
  admin: "#7c3aed",
  doctor: "#0ea5a4",
  nurse: "#f97316",
  receptionist: "#2563eb",
  billing: "#f59e0b",
  general: "#6b7280",
};

const getRoleColor = (r) => ROLE_COLORS[r] || "#6b7280";

export default function MessageList() {
  const { user } = useAuth();
  const [inboxMessages, setInboxMessages] = useState([]);
  const [sentMessages, setSentMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [mainTab, setMainTab] = useState("inbox"); // inbox | sent

  const [openMessageModal, setOpenMessageModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);

  const [openComposerModal, setOpenComposerModal] = useState(false);

  const fetchInbox = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/v1/messages/receiver/${user._id}`,
        { withCredentials: true }
      );
      setInboxMessages(res.data || []);
    } catch (err) {
      console.error("Failed to fetch inbox", err);
    }
  };

  const fetchSent = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/v1/messages/sender/${user._id}`,
        { withCredentials: true }
      );
      setSentMessages(res.data || []);
    } catch (err) {
      console.error("Failed to fetch sent messages", err);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchInbox(), fetchSent()]).finally(() => setLoading(false));
  }, []);

  const formatMessageDate = (m) => {
    const d = m.createdAt || m.sentAt || m.updatedAt;
    const date = d ? new Date(d) : null;
    return date ? date.toLocaleString() : "";
  };

  const handleMainTabChange = (e, val) => setMainTab(val);

  const handleViewMessage = async (msg) => {
    if (!msg.read && mainTab === "inbox") {
      try {
        await axios.put(
          `http://localhost:5000/api/v1/messages/${msg._id}/read`,
          {},
          { withCredentials: true }
        );
        setInboxMessages((prev) =>
          prev.map((m) => (m._id === msg._id ? { ...m, read: true } : m))
        );
      } catch (err) {
        console.error("Failed to mark message as read", err);
      }
    }

    const source = mainTab === "inbox" ? inboxMessages : sentMessages;
    const full = source.find((m) => m._id === msg._id) || msg;
    setSelectedMessage(full);
    setOpenMessageModal(true);
  };

  const inboxFiltered = useMemo(() => {
    return inboxMessages
      .filter((m) => {
        const q = searchTerm.toLowerCase();
        const senderName = m.senderId?.name || "";
        return (
          m.subject.toLowerCase().includes(q) ||
          m.body.toLowerCase().includes(q) ||
          senderName.toLowerCase().includes(q)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt || b.sentAt || b.updatedAt) -
          new Date(a.createdAt || a.sentAt || a.updatedAt)
      );
  }, [inboxMessages, searchTerm]);

  const sentFiltered = useMemo(() => {
    return sentMessages
      .filter((m) => {
        const q = searchTerm.toLowerCase();
        const receiverName = m.receiverId?.name || "";
        return (
          m.subject.toLowerCase().includes(q) ||
          m.body.toLowerCase().includes(q) ||
          receiverName.toLowerCase().includes(q)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt || b.sentAt || b.updatedAt) -
          new Date(a.createdAt || a.sentAt || a.updatedAt)
      );
  }, [sentMessages, searchTerm]);

  const activeFiltered = mainTab === "inbox" ? inboxFiltered : sentFiltered;

  return (
    <Container sx={{ mt: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h5">Messages</Typography>
          <Typography color="text.secondary">
            Internal team communication
          </Typography>
        </Box>

        <Button
          startIcon={<FiPlus />}
          variant="contained"
          onClick={() => setOpenComposerModal(true)}
          sx={{ textTransform: "none" }}
        >
          New Message
        </Button>
      </Box>

      {/* Stats */}
      <Box
        display="grid"
        gridTemplateColumns={{ xs: "1fr", md: "repeat(3,1fr)" }}
        gap={2}
        mt={3}
      >
        <Paper sx={{ p: 2 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Box>
              <Typography variant="h6">
                {inboxMessages.filter((m) => !m.read).length}
              </Typography>
              <Typography color="text.secondary">Unread Messages</Typography>
            </Box>
            {inboxMessages.filter((m) => !m.read).length > 0 && (
              <Badge color="primary" badgeContent="New" />
            )}
          </Stack>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography variant="h6">{inboxMessages.length}</Typography>
          <Typography color="text.secondary">Inbox</Typography>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography variant="h6">{sentMessages.length}</Typography>
          <Typography color="text.secondary">Sent</Typography>
        </Paper>
      </Box>

      <Box
        display="grid"
        gridTemplateColumns={{ xs: "1fr", lg: "320px 1fr" }}
        gap={3}
        mt={3}
      >
        {/* Left: Message List */}
        <Paper>
          <Box p={1} borderBottom="1px solid" borderColor="divider">
            <Tabs
              value={mainTab}
              onChange={handleMainTabChange}
              variant="fullWidth"
            >
              <Tab label={`Inbox (${inboxMessages.length})`} value="inbox" />
              <Tab label={`Sent (${sentMessages.length})`} value="sent" />
            </Tabs>
          </Box>

          <Box p={2} borderBottom="1px solid" borderColor="divider">
            <TextField
              fullWidth
              size="small"
              placeholder="Search messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <FiSearch />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <Box maxHeight={600} overflow="auto">
            {activeFiltered.length === 0 ? (
              <Box textAlign="center" p={6} color="text.secondary">
                <FiMail size={48} />
                <Typography>No messages</Typography>
              </Box>
            ) : (
              <List>
                {activeFiltered.map((m) => {
                  const isInbox = mainTab === "inbox";
                  const person = isInbox ? m.senderId : m.receiverId;
                  const dateLabel = formatMessageDate(m);

                  return (
                    <ListItem
                      key={m._id}
                      button
                      onClick={() => handleViewMessage(m)}
                      sx={{ alignItems: "flex-start" }}
                    >
                      <Avatar
                        sx={{
                          bgcolor: getRoleColor(person?.role),
                          width: 48,
                          height: 48,
                          mr: 2,
                        }}
                      >
                        {(person?.name || "?")
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")}
                      </Avatar>
                      <ListItemText
                        primary={
                          <Typography noWrap fontWeight={600}>
                            {person?.name || "Unknown"}
                          </Typography>
                        }
                        secondary={
                          <>
                            <Typography noWrap variant="body2">
                              {m.subject}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {dateLabel}
                            </Typography>
                          </>
                        }
                      />
                      {!m.read && isInbox && (
                        <Box ml={1}>
                          <Box
                            sx={{
                              width: 10,
                              height: 10,
                              bgcolor: "primary.main",
                              borderRadius: "50%",
                            }}
                          />
                        </Box>
                      )}
                    </ListItem>
                  );
                })}
              </List>
            )}
          </Box>
        </Paper>

        {/* Right: Detail pane */}
        <Paper sx={{ p: 0 }}>
          {selectedMessage ? (
            <Box display="flex" flexDirection="column" height="100%">
              <Box p={3} borderBottom="1px solid" borderColor="divider">
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar
                    sx={{
                      bgcolor: getRoleColor(
                        (mainTab === "inbox"
                          ? selectedMessage.senderId
                          : selectedMessage.receiverId
                        )?.role
                      ),
                      width: 56,
                      height: 56,
                    }}
                  >
                    {(
                      (mainTab === "inbox"
                        ? selectedMessage.senderId
                        : selectedMessage.receiverId
                      )?.name || "?"
                    )
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </Avatar>
                  <Box>
                    <Typography variant="h6">
                      {selectedMessage.subject}
                    </Typography>
                    <Typography color="text.secondary">
                      {mainTab === "inbox" ? "From" : "To"}:
                      {(mainTab === "inbox"
                        ? selectedMessage.senderId?.name
                        : selectedMessage.receiverId?.name) || "Unknown"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatMessageDate(selectedMessage)}
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              <Box p={3} flex={1} overflow="auto">
                <Typography style={{ whiteSpace: "pre-wrap" }}>
                  {selectedMessage.body}
                </Typography>
              </Box>

              <Box p={3} borderTop="1px solid" borderColor="divider">
                <Button
                  startIcon={<FiSend />}
                  variant="contained"
                  onClick={() => {
                    setOpenComposerModal(true);
                  }}
                >
                  Reply
                </Button>
              </Box>
            </Box>
          ) : (
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              p={6}
              color="text.secondary"
            >
              <Box textAlign="center">
                <FiMail size={64} />
                <Typography>Select a message to view</Typography>
              </Box>
            </Box>
          )}
        </Paper>
      </Box>

      {/* Compose Modal */}
      <Modal
        open={openComposerModal}
        onClose={() => setOpenComposerModal(false)}
      >
        <Paper
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            width: 640,
            maxWidth: "95%",
            p: 4,
            borderRadius: 2,
          }}
        >
          <MessageComposer
            onSuccess={() => {
              setOpenComposerModal(false);
              fetchInbox();
              fetchSent();
            }}
          />
        </Paper>
      </Modal>
    </Container>
  );
}
