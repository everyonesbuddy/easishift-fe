import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { FiUserPlus } from "react-icons/fi";
import { toast } from "react-toastify";
import api from "../../../config/api";
import { useAuth } from "../../../context/AuthContext";
import ConfirmDialog from "../../Shared/ConfirmDialog";

const ROLE_INFO = {
  owner: "Everything, including billing and members",
  scheduler: "Builds and publishes schedules, manages staff",
  viewer: "Can look, can't change anything. Free.",
};

const headCellSx = { fontWeight: 700, color: "#0F172A", fontSize: "0.72rem" };

const errorMessage = (err, fallback) =>
  err?.response?.data?.message || fallback;

/**
 * Members are the people who log in (owner, schedulers, viewers).
 * Staff who are only scheduled live under Staff Management.
 */
export default function MembersPage() {
  const { user, can, plan, usage, refreshSession } = useAuth();
  const canManage = can("roles.manage");
  const [members, setMembers] = useState([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ name: "", email: "", role: "scheduler" });
  const [saving, setSaving] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [ownerTarget, setOwnerTarget] = useState(null);

  const fetchMembers = async () => {
    try {
      const res = await api.get("/members");
      setMembers(res.data || []);
    } catch (err) {
      console.error("Failed to load members", err);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const afterChange = async () => {
    await fetchMembers();
    refreshSession?.();
  };

  const handleInvite = async () => {
    if (!invite.name.trim() || !invite.email.trim()) {
      toast.error("Enter a name and email", { position: "top-right" });
      return;
    }
    setSaving(true);
    try {
      const res = await api.post("/members/invite", {
        name: invite.name.trim(),
        email: invite.email.trim(),
        role: invite.role,
      });
      toast.success(
        res.data?.inviteSent
          ? `Invite sent to ${invite.email.trim()}`
          : "Added, but the invite email didn't send. Try Resend.",
        { position: "top-right", autoClose: 3000 },
      );
      setInviteOpen(false);
      setInvite({ name: "", email: "", role: "scheduler" });
      afterChange();
    } catch (err) {
      if (err?.response?.status !== 402) {
        toast.error(errorMessage(err, "Couldn't send the invite"), {
          position: "top-right",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (member, role) => {
    try {
      await api.patch(`/members/${member._id}`, { role });
      toast.success(`${member.name} is now a ${role}`, { position: "top-right", autoClose: 2000 });
      afterChange();
    } catch (err) {
      if (err?.response?.status !== 402) {
        toast.error(errorMessage(err, "Couldn't change the role"), { position: "top-right" });
      }
    }
  };

  const handleResend = async (member) => {
    try {
      const res = await api.post(`/members/${member._id}/resend-invite`);
      toast[res.data?.inviteSent ? "success" : "error"](
        res.data?.inviteSent ? `Invite re-sent to ${member.email}` : "The invite email didn't send",
        { position: "top-right", autoClose: 2500 },
      );
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't resend"), { position: "top-right" });
    }
  };

  const handleRemove = async () => {
    const member = removeTarget;
    setRemoveTarget(null);
    try {
      await api.delete(`/members/${member._id}`);
      toast.success(`${member.name} removed`, { position: "top-right", autoClose: 2000 });
      afterChange();
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't remove"), { position: "top-right" });
    }
  };

  const handleMakeOwner = async () => {
    const member = ownerTarget;
    setOwnerTarget(null);
    try {
      await api.post(`/members/${member._id}/make-owner`);
      toast.success(`${member.name} is now the owner`, { position: "top-right", autoClose: 2500 });
      afterChange();
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't transfer ownership"), { position: "top-right" });
    }
  };

  const schedulerLimit = plan?.limits?.schedulers;

  return (
    <Container sx={{ mt: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" gap={2} flexWrap="wrap">
        <Box>
          <Typography variant="h5">Team Members</Typography>
          <Typography color="text.secondary">
            People who log in to build and view schedules.
            {schedulerLimit !== undefined && (
              <Box component="span" sx={{ ml: 1, fontWeight: 600 }}>
                {usage?.schedulers ?? 0} of{" "}
                {schedulerLimit === null ? "unlimited" : schedulerLimit} schedulers on{" "}
                {plan?.label || "your plan"}. Viewers are free.
              </Box>
            )}
          </Typography>
        </Box>
        {canManage && (
          <Button
            size="small"
            variant="contained"
            startIcon={<FiUserPlus />}
            onClick={() => setInviteOpen(true)}
            sx={{
              textTransform: "none",
              borderRadius: 2,
              px: 3,
              bgcolor: "#2563EB",
              color: "#fff",
              "&:hover": { bgcolor: "#1D4ED8" },
            }}
          >
            Invite Member
          </Button>
        )}
      </Box>

      <Paper sx={{ mt: 3, overflowX: "auto" }}>
        <Table size="small">
          <TableHead sx={{ background: "#F8FAFC" }}>
            <TableRow>
              <TableCell sx={headCellSx}>Name</TableCell>
              <TableCell sx={headCellSx}>Email</TableCell>
              <TableCell sx={headCellSx}>Role</TableCell>
              {canManage && <TableCell sx={headCellSx}>Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {members.map((member) => {
              const isMe = String(member._id) === String(user?._id);
              const isOwner = member.role === "owner";
              return (
                <TableRow key={member._id} hover>
                  <TableCell>
                    {member.name}
                    {isMe && (
                      <Typography component="span" color="text.secondary" sx={{ ml: 1, fontSize: 12 }}>
                        (you)
                      </Typography>
                    )}
                    {member.invitePending && (
                      <Chip size="small" label="Invite pending" sx={{ ml: 1 }} />
                    )}
                  </TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>
                    {canManage && !isOwner ? (
                      <TextField
                        select
                        size="small"
                        value={member.role}
                        onChange={(e) => handleRoleChange(member, e.target.value)}
                        sx={{ minWidth: 140 }}
                      >
                        <MenuItem value="scheduler">Scheduler</MenuItem>
                        <MenuItem value="viewer">Viewer</MenuItem>
                      </TextField>
                    ) : (
                      <Box>
                        <Typography sx={{ textTransform: "capitalize", fontWeight: 600, fontSize: 14 }}>
                          {member.role}
                        </Typography>
                        <Typography color="text.secondary" sx={{ fontSize: 12 }}>
                          {ROLE_INFO[member.role]}
                        </Typography>
                      </Box>
                    )}
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      {!isOwner && (
                        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                          {member.invitePending && (
                            <Button size="small" variant="outlined" onClick={() => handleResend(member)} sx={{ textTransform: "none" }}>
                              Resend invite
                            </Button>
                          )}
                          {!member.invitePending && member.role === "scheduler" && (
                            <Button size="small" variant="outlined" onClick={() => setOwnerTarget(member)} sx={{ textTransform: "none" }}>
                              Make owner
                            </Button>
                          )}
                          <Button size="small" variant="contained" color="error" onClick={() => setRemoveTarget(member)} sx={{ textTransform: "none" }}>
                            Remove
                          </Button>
                        </Stack>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Invite a member</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              value={invite.name}
              onChange={(e) => setInvite({ ...invite, name: e.target.value })}
            />
            <TextField
              label="Email"
              type="email"
              value={invite.email}
              onChange={(e) => setInvite({ ...invite, email: e.target.value })}
            />
            <TextField
              select
              label="Role"
              value={invite.role}
              onChange={(e) => setInvite({ ...invite, role: e.target.value })}
              helperText={ROLE_INFO[invite.role]}
            >
              <MenuItem value="scheduler">Scheduler</MenuItem>
              <MenuItem value="viewer">Viewer</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setInviteOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={saving} onClick={handleInvite} sx={{ textTransform: "none" }}>
            {saving ? "Sending..." : "Send invite"}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title={`Remove ${removeTarget?.name || "member"}?`}
        message="They won't be able to log in to this workspace any more."
        onCancel={() => setRemoveTarget(null)}
        onConfirm={handleRemove}
        confirmLabel="Remove"
      />
      <ConfirmDialog
        open={Boolean(ownerTarget)}
        title={`Make ${ownerTarget?.name || "them"} the owner?`}
        message="They'll control billing and members. You'll become a scheduler."
        onCancel={() => setOwnerTarget(null)}
        onConfirm={handleMakeOwner}
        confirmLabel="Make owner"
      />
    </Container>
  );
}
