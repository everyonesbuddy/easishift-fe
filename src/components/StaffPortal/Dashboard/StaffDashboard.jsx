import { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Box,
  Button,
  Grid,
  CircularProgress,
  Modal,
  Paper,
} from "@mui/material";

import { useAuth } from "../../../context/AuthContext";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import {
  FiUsers,
  FiMessageSquare,
  FiUserCheck,
  FiCalendar,
} from "react-icons/fi";
import {
  FiCheckCircle,
  FiAlertTriangle,
  FiClock,
  FiMail,
} from "react-icons/fi";

import StatCard from "./StatCard";
import ScheduleAndCoverageCharts from "./ScheduleAndCoverageCharts";
import StaffCreateAndEditForm from "../Staffs/StaffCreateAndEditForm";
import MessageComposer from "../Messages/MessageComposer";
import CoverageCreateForm from "../Coverage/CoverageCreateForm";
import ScheduleForm from "../Schedule/ScheduleForm";
import AutoGenerateScheduleForm from "../Schedule/AutoGenerateScheduleForm";

export default function StaffDashboard() {
  const { user, isAdmin } = useAuth();

  const [summary, setSummary] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  const [openStaffModal, setOpenStaffModal] = useState(false);
  const [openMessageModal, setOpenMessageModal] = useState(false);
  const [openCoverageModal, setOpenCoverageModal] = useState(false);
  const [openScheduleModal, setOpenScheduleModal] = useState(false);
  const [openAutoModal, setOpenAutoModal] = useState(false);

  const [staffList, setStaffList] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    async function loadDashboardData() {
      try {
        if (!user || !user.tenantId) throw new Error("No tenant ID");

        // 🔥 USE THE NEW ROUTES WITH ID
        const endpoint = isAdmin
          ? `/summary/admin/${user._id}`
          : `/summary/staff/${user._id}`;

        // Summary
        const summaryRes = await axios.get(
          `http://localhost:5000/api/v1${endpoint}`,
          { withCredentials: true }
        );

        setSummary(summaryRes.data);

        // Tenant
        const tenantRes = await axios.get(
          `http://localhost:5000/api/v1/tenants/${user.tenantId}`,
          { withCredentials: true }
        );
        setTenant(tenantRes.data);

        // Staff List (required for schedule form)
        const staffRes = await axios.get(
          `http://localhost:5000/api/v1/auth/users`,
          { withCredentials: true }
        );
        setStaffList(staffRes.data);
      } catch (err) {
        console.error("Failed to load dashboard", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [user, isAdmin]);

  if (loading)
    return (
      <Box display="flex" justifyContent="center" mt={10}>
        <CircularProgress />
      </Box>
    );

  if (!summary) return <p>Error loading dashboard.</p>;

  /* ------------------------------------------------------------------ */
  /*                UPDATED CARD DATA USING NEW SUMMARY FIELDS          */
  /* ------------------------------------------------------------------ */

  // Admin cards
  const adminCards = [
    {
      title: "Active Staff",
      value: summary.activeStaffCount ?? 0,
      subtitle: "Active Staff",
      icon: <FiUsers size={20} color="#1e88e5" />,
      bgColor: "#e3f2fd",
      layout: "center",
    },
    {
      title: "Fully Staffed Today",
      value: summary.fullyStaffedCount ?? 0,
      subtitle: "Fully Staffed Today",
      icon: <FiCheckCircle size={20} color="#2e7d32" />,
      bgColor: "#e8f5e9",
      layout: "center",
    },
    {
      title: "Understaffed Today",
      value: summary.understaffedCount ?? 0,
      subtitle: "Understaffed Shifts Today",
      icon: <FiAlertTriangle size={20} color="#c62828" />,
      bgColor: "#ffebee",
      layout: "center",
      badge: summary.understaffedCount > 0 ? "Alert" : null,
    },
    {
      title: "Pending Requests",
      value: summary.pendingTimeOffCount ?? 0,
      subtitle: "Pending Requests",
      icon: <FiClock size={20} color="#f9a825" />,
      bgColor: "#fff8e1",
      layout: "center",
      badge: summary.pendingTimeOffCount ?? 0,
    },
  ];

  // Staff cards
  const staffCards = [
    {
      title: "Upcoming Shifts",
      value: summary.shiftsThisWeekCount ?? 0,
      subtitle: "Upcoming Shifts",
      icon: <FiCalendar size={20} color="#1e88e5" />,
      bgColor: "#e3f2fd",
      layout: "side",
    },
    {
      title: "Hours This Week",
      value: summary.hoursThisWeek ?? 0,
      subtitle: "Hours This Week",
      icon: <FiClock size={20} color="#2e7d32" />,
      bgColor: "#e8f5e9",
      layout: "side",
    },
    {
      title: "Unread Messages",
      value: summary.unreadMessages ?? 0,
      subtitle: "Unread Messages",
      icon: <FiMail size={20} color="#8e24aa" />,
      bgColor: "#f3e5f5",
      layout: "side",
    },
    {
      title: "Approved Time Off",
      value: summary.approvedUpcomingTimeOffCount ?? 0,
      subtitle: "Approved Time Off",
      icon: <FiCheckCircle size={20} color="#f9a825" />,
      bgColor: "#fff8e1",
      layout: "side",
    },
  ];

  return (
    <Container sx={{ mt: 5, mb: 5 }}>
      {/* Welcome Banner */}
      <Box
        sx={{
          mb: 5,
          p: 4,
          borderRadius: 3,
          color: "white",
          background: "linear-gradient(90deg, #1e88e5, #1565c0)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
        }}
      >
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          gap={3}
        >
          {/* Left content */}
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
              Welcome back, {user?.name?.split(" ")[0]}!
            </Typography>

            <Typography
              variant="body1"
              sx={{ color: "rgba(255,255,255,0.85)", mb: 2 }}
            >
              {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
              {tenant && ` • ${tenant.tenant.name}`}
            </Typography>

            <Box display="flex" gap={1}>
              <Box
                sx={{
                  px: 2,
                  py: 0.5,
                  borderRadius: 999,
                  backgroundColor: "rgba(255,255,255,0.2)",
                  fontSize: "0.85rem",
                }}
              >
                {user?.email}
              </Box>
            </Box>
          </Box>

          {/* Avatar */}
          <Box
            sx={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "2rem",
              fontWeight: 700,
              backgroundColor: "rgba(255,255,255,0.2)",
            }}
          >
            {user?.name
              ?.split(" ")
              .map((n) => n[0])
              .join("")}
          </Box>
        </Box>
      </Box>

      {/* Cards */}
      <Grid container spacing={4} alignItems="center" justifyContent="center">
        {(isAdmin ? adminCards : staffCards).map((card) => (
          <Grid item xs={12} md={6} lg={3} key={card.title}>
            <StatCard
              title={card.title}
              value={card.value}
              subtitle={card.subtitle}
              icon={card.icon}
              layout={card.layout}
              bgColor={card.bgColor}
              badge={card.badge}
            />
          </Grid>
        ))}
      </Grid>

      {/* Charts */}
      {/* 🔥 CHARTS STILL USE SCHEDULES + COVERAGE DIRECTLY — NOTHING TO CHANGE */}
      <ScheduleAndCoverageCharts userId={user._id} isAdmin={isAdmin} />
    </Container>
  );
}
