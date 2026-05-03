import React from "react";
import {
  Drawer,
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
} from "@mui/material";
import {
  MdDashboard,
  MdCalendarToday,
  MdPeople,
  MdSchedule,
  MdMessage,
  MdSettings,
  MdAssignment,
  MdSwapHoriz,
  MdAccountCircle,
  MdMoreVert,
  MdClose,
} from "react-icons/md";
import logo from "../../assets/logos/easishift-logo-plus-text2.svg";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import ChangePasswordModal from "../Auth/ChangePasswordModal";

function Sidebar({ mobileOpen, onMobileClose }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up("sm"));
  const [anchorEl, setAnchorEl] = useState(null);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const menuOpen = Boolean(anchorEl);

  const role = user?.role || "staff";

  const adminMenuItems = [
    { id: "overview", icon: MdDashboard, label: "Overview", to: "/dashboard" },
    {
      id: "coverage",
      icon: MdAssignment,
      label: "Coverage Planning",
      to: "/coverage-planning",
    },
    {
      id: "schedule",
      icon: MdCalendarToday,
      label: "Schedule Builder",
      to: "/schedule",
    },
    { id: "staff", icon: MdPeople, label: "Staff Management", to: "/staffs" },
    {
      id: "subscription",
      icon: MdSettings,
      label: "Manage Subscription",
      to: "/billing",
    },
    {
      id: "timeoff",
      icon: MdSchedule,
      label: "Time Off Decisions",
      to: "/timeoff-decisions",
    },
    {
      id: "my-timeoff",
      icon: MdSchedule,
      label: "My Time Off Requests",
      to: "/timeoff-requests",
    },
    { id: "messages", icon: MdMessage, label: "Messages", to: "/messages" },
  ];

  const staffMenuItems = [
    { id: "overview", icon: MdDashboard, label: "Overview", to: "/dashboard" },
    {
      id: "schedule",
      icon: MdCalendarToday,
      label: "My Schedule",
      to: "/schedule",
    },
    {
      id: "preferences",
      icon: MdSettings,
      label: "Preferences",
      to: "/preferences",
    },
    {
      id: "timeoff",
      icon: MdSchedule,
      label: "My Time Off Requests",
      to: "/timeoff-requests",
    },
    {
      id: "swap-requests",
      icon: MdSwapHoriz,
      label: "Shift Swaps",
      to: "/swap-requests",
    },
    { id: "messages", icon: MdMessage, label: "Messages", to: "/messages" },
  ];

  const menuItems = role === "admin" ? adminMenuItems : staffMenuItems;
  const activePath = location.pathname;

  return (
    <Drawer
      variant={isMdUp ? "permanent" : "temporary"}
      open={isMdUp ? true : Boolean(mobileOpen)}
      onClose={() => onMobileClose && onMobileClose()}
      ModalProps={{ keepMounted: true }}
      sx={{
        width: 260,
        flexShrink: 0,
        zIndex: (theme) => theme.zIndex.appBar - 1,
        "& .MuiDrawer-paper": {
          width: 260,
          boxSizing: "border-box",
          bgcolor: "#111827", // gray-900
          color: "white",
          borderRight: "1px solid #1f2937", // gray-800
        },
      }}
    >
      {/* Logo / Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: "1px solid #1f2937",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            component="img"
            src={logo}
            alt="Easishift logo"
            sx={{
              width: 180,
              height: "auto",
              display: "block",
              objectFit: "contain",
            }}
          />
        </Box>
        {!isMdUp && (
          <IconButton
            onClick={() => onMobileClose && onMobileClose()}
            sx={{ color: "white" }}
          >
            <MdClose />
          </IconButton>
        )}
      </Box>

      {/* Navigation */}
      <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
        <List sx={{ p: 0 }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePath === item.to;

            return (
              <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={() => navigate(item.to)}
                  sx={{
                    borderRadius: 2,
                    px: 2,
                    py: 1.5,
                    gap: 1.5,
                    color: isActive ? "white" : "#d1d5db", // gray-300
                    bgcolor: isActive ? "#2563eb" : "transparent", // blue-600
                    transition: "background-color 0.2s ease",
                    "&:hover": {
                      bgcolor: isActive ? "#1d4ed8" : "#1f2937", // blue-700 / gray-800
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32, color: "inherit" }}>
                    <Icon size={20} />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{ fontSize: "0.95rem" }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>

      {/* User Footer */}
      <Box sx={{ p: 2, borderTop: "1px solid #1f2937" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            px: 2,
            py: 1.5,
            position: "relative",
          }}
        >
          <Avatar sx={{ bgcolor: "#2563eb", width: 40, height: 40 }}>
            <MdAccountCircle size={24} />
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              sx={{
                color: "white",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user?.name || "Staff User"}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "#9ca3af", // gray-400
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                display: "block",
              }}
            >
              {user?.email || ""}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={(e) => setAnchorEl(e.currentTarget)}
            sx={{ color: "#9ca3af", "&:hover": { color: "white" } }}
          >
            <MdMoreVert size={18} />
          </IconButton>
        </Box>

        <Menu
          anchorEl={anchorEl}
          open={menuOpen}
          onClose={() => setAnchorEl(null)}
          PaperProps={{
            sx: {
              bgcolor: "#1f2937",
              color: "white",
            },
          }}
        >
          <MenuItem
            onClick={() => {
              setChangePasswordOpen(true);
              setAnchorEl(null);
            }}
            sx={{
              "&:hover": { bgcolor: "#111827" },
            }}
          >
            Change Password
          </MenuItem>
        </Menu>
      </Box>

      <ChangePasswordModal
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />
    </Drawer>
  );
}

export default Sidebar;
