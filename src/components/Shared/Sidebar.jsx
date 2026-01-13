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
} from "@mui/material";
import {
  MdDashboard,
  MdCalendarToday,
  MdPeople,
  MdSchedule,
  MdMessage,
  MdSettings,
  MdAssignment,
  MdAccountCircle,
} from "react-icons/md";
import logo from "../../assets/logos/easishift-logo-plus-text2.svg";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";

function Sidebar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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
      label: "Time Off Approvals",
      to: "/timeoff-decisions",
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
      label: "Time Off",
      to: "/timeoff-requests",
    },
    { id: "messages", icon: MdMessage, label: "Messages", to: "/messages" },
  ];

  const menuItems = role === "admin" ? adminMenuItems : staffMenuItems;
  const activePath = location.pathname;

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 260,
        flexShrink: 0,
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
      <Box sx={{ p: 3, borderBottom: "1px solid #1f2937" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            component="img"
            src={logo}
            alt="Easishift logo"
            sx={{
              width: 200,
              height: "auto",
              display: "block",
              objectFit: "contain",
            }}
          />
        </Box>
        <Typography
          variant="caption"
          sx={{ color: "#9ca3af", mt: 0.5, display: "block" }} // gray-400
        >
          Healthcare Scheduling
        </Typography>
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
        </Box>
      </Box>
    </Drawer>
  );
}

export default Sidebar;
