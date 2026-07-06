import { useEffect, useRef, useState } from "react";
import {
  Container,
  Typography,
  Box,
  Button,
  CircularProgress,
} from "@mui/material";

import { useAuth } from "../../../context/AuthContext";
import api from "../../../config/api";

import { FiUsers, FiCalendar, FiUpload } from "react-icons/fi";
import {
  FiCheckCircle,
  FiAlertTriangle,
  FiClock,
  FiMail,
} from "react-icons/fi";

import StatCard from "./StatCard";
import ScheduleAndCoverageCharts from "./ScheduleAndCoverageCharts";
import { toast } from "react-toastify";

export default function StaffDashboard() {
  const { user, isAdmin, updateCurrentUser } = useAuth();

  const [summary, setSummary] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  const [uploadingProfile, setUploadingProfile] = useState(false);
  const profileInputRef = useRef(null);

  // Extracted loader so we can refresh after modal actions
  async function loadDashboardData() {
    setLoading(true);
    try {
      if (!user || !user.tenantId) throw new Error("No tenant ID");

      // 🔥 USE THE NEW ROUTES WITH ID
      const endpoint = isAdmin
        ? `/summary/admin/${user._id}`
        : `/summary/staff/${user._id}`;

      // Summary
      const summaryRes = await api.get(`${endpoint}`);
      setSummary(summaryRes.data);

      // Tenant
      const tenantRes = await api.get(`/tenants/${user.tenantId}`);
      setTenant(tenantRes.data);
    } catch (err) {
      console.error("Failed to load dashboard", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin]);

  const handleProfileButtonClick = () => {
    if (profileInputRef.current) profileInputRef.current.click();
  };

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleProfileImageChange = async (event) => {
    const file = event.target.files?.[0];
    // Allow re-selecting same file on next click.
    event.target.value = "";

    if (!file || !user?._id) return;

    const maxSizeBytes = 2 * 1024 * 1024;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }

    if (file.size > maxSizeBytes) {
      toast.error("Image is too large. Please use a file under 2MB.");
      return;
    }

    try {
      setUploadingProfile(true);
      const base64Image = await fileToBase64(file);
      const response = await api.put(`/auth/${user._id}`, {
        profilePicture: base64Image,
      });

      const updatedUser = response?.data?.user;
      if (updatedUser) {
        updateCurrentUser({
          profilePicture: updatedUser.profilePicture,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          userPhone: updatedUser.userPhone,
          userPhoneCountryCode: updatedUser.userPhoneCountryCode,
        });
      }

      toast.success("Profile picture updated.");
    } catch (err) {
      const message =
        err?.response?.data?.message || "Failed to upload profile picture.";
      toast.error(message);
    } finally {
      setUploadingProfile(false);
    }
  };

  if (loading)
    return (
      <Box display="flex" justifyContent="center" mt={10}>
        <CircularProgress />
      </Box>
    );

  if (!summary) return <p>Error loading dashboard.</p>;

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

  const visibleCards = isAdmin ? adminCards : staffCards;
  const mdCardColumns = Math.max(1, Math.min(4, visibleCards.length));
  const smCardColumns = Math.max(1, Math.min(2, mdCardColumns));

  return (
    <Container sx={{ mt: 4, mb: 5 }}>
      {/* Welcome Banner */}
      <Box
        sx={{
          mb: 4,
          p: { xs: 2.5, md: 3.5 },
          borderRadius: 4,
          color: "white",
          background:
            "radial-gradient(circle at 0% 0%, rgba(255,255,255,0.22), transparent 36%), linear-gradient(120deg, #0F4C81 0%, #0E7490 58%, #06B6D4 100%)",
          boxShadow: "0 12px 28px rgba(15, 23, 42, 0.2)",
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
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.75 }}>
              Welcome back, {user?.name?.split(" ")[0]}!
            </Typography>

            <Typography
              variant="body1"
              sx={{ color: "rgba(255,255,255,0.88)", mb: 1.5 }}
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
                  backgroundColor: "rgba(255,255,255,0.16)",
                  border: "1px solid rgba(255,255,255,0.22)",
                  fontSize: "0.8rem",
                }}
              >
                {user?.email}
              </Box>
            </Box>
          </Box>

          {/* Avatar */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1.25,
            }}
          >
            <Box
              sx={{
                width: 96,
                height: 96,
                borderRadius: "50%",
                border: "2px solid rgba(255,255,255,0.45)",
                backgroundColor: "rgba(255,255,255,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {user?.profilePicture ? (
                <Box
                  component="img"
                  src={user.profilePicture}
                  alt={`${user?.name || "User"} profile`}
                  sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <Typography
                  sx={{ fontSize: "2rem", fontWeight: 700, color: "#fff" }}
                >
                  {user?.name
                    ?.split(" ")
                    .filter(Boolean)
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase() || ""}
                </Typography>
              )}
            </Box>

            <Button
              size="small"
              variant="contained"
              onClick={handleProfileButtonClick}
              disabled={uploadingProfile}
              startIcon={<FiUpload size={13} />}
              sx={{
                textTransform: "none",
                fontSize: "0.72rem",
                lineHeight: 1.2,
                px: 1.2,
                py: 0.4,
                borderRadius: 999,
                bgcolor: "rgba(255,255,255,0.2)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.25)",
                "& .MuiButton-startIcon": { mr: 0.5 },
                "&:hover": { bgcolor: "rgba(255,255,255,0.28)" },
              }}
            >
              {uploadingProfile
                ? "Uploading..."
                : user?.profilePicture
                  ? "Change Profile Picture"
                  : "Add Profile Picture"}
            </Button>

            <Box
              component="input"
              type="file"
              accept="image/*"
              ref={profileInputRef}
              onChange={handleProfileImageChange}
              sx={{ display: "none" }}
            />
          </Box>
        </Box>
      </Box>

      {/* Cards */}
      <Box
        sx={{
          display: "grid",
          gap: 2.5,
          gridTemplateColumns: {
            xs: "1fr",
            sm: `repeat(${smCardColumns}, minmax(0, 1fr))`,
            md: `repeat(${mdCardColumns}, minmax(0, 1fr))`,
          },
        }}
      >
        {visibleCards.map((card) => (
          <Box key={card.title} sx={{ display: "flex" }}>
            <StatCard
              title={card.title}
              value={card.value}
              subtitle={card.subtitle}
              icon={card.icon}
              layout={card.layout}
              bgColor={card.bgColor}
              minWidth={0}
              badge={card.badge}
              sx={{
                height: { xs: 152, md: 164 },
                width: "100%",
              }}
            />
          </Box>
        ))}
      </Box>

      {/* Charts */}
      {/* 🔥 CHARTS STILL USE SCHEDULES + COVERAGE DIRECTLY — NOTHING TO CHANGE */}
      <ScheduleAndCoverageCharts userId={user._id} isAdmin={isAdmin} />
    </Container>
  );
}
