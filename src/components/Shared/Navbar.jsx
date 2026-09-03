import {
  AppBar,
  Toolbar,
  Box,
  Typography,
  IconButton,
  Badge,
  Button,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { MdNotifications, MdLogout } from "react-icons/md";
import { FiPhoneCall } from "react-icons/fi";
import logo from "../../assets/logos/wiserShifts-logo-light.svg";
import { MdMenu } from "react-icons/md";
import { getRoleDisplayName } from "../../constants/industryRoles";

export default function Navbar({ onMobileOpen }) {
  const { user, logout, roles } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <AppBar
      position="sticky"
      sx={{
        bgcolor: "rgba(255,255,255,0.9)",
        backdropFilter: "blur(14px)",
        borderBottom: 1,
        borderColor: "divider",
        boxShadow: "none",
        zIndex: 30,
      }}
    >
      <Toolbar sx={{ px: { xs: 1, sm: 4 }, height: 72, minHeight: 72 }}>
        <Box sx={{ flex: 1, display: "flex", alignItems: "center" }}>
          {!user ? (
            <>
              <Box
                component={Link}
                to="/"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  textDecoration: "none",
                  color: "text.primary",
                }}
              >
                <Box
                  component="img"
                  src={logo}
                  alt="Wisershifts logo"
                  aria-label="Wisershifts"
                  sx={{
                    width: { xs: 190, sm: 220 },
                    height: 40,
                    display: "block",
                    objectFit: "contain",
                    transform: { xs: "translateX(-8px)", sm: "none" },
                  }}
                />
              </Box>
            </>
          ) : (
            <>
              {isSmall ? (
                // Mobile: only show burger to open the sidebar
                <IconButton onClick={onMobileOpen} sx={{ mr: 1 }}>
                  <MdMenu />
                </IconButton>
              ) : (
                // Desktop: show title + optional collapse toggle
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box>
                    <Typography
                      variant={isSmall ? "h6" : "h5"}
                      sx={{ color: "text.primary" }}
                    >
                      {roles.length
                        ? roles.map(getRoleDisplayName).join(" / ")
                        : "Staff"}{" "}
                      Dashboard
                    </Typography>
                  </Box>
                  {/* no collapse controls on desktop */}
                </Box>
              )}
            </>
          )}
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          {!user ? (
            <>
              <Button
                component="a"
                href="https://calendly.com/wisershifts-info/30min"
                target="_blank"
                rel="noopener noreferrer"
                startIcon={<FiPhoneCall size={16} />}
                sx={{
                  display: { xs: "none", sm: "inline-flex" },
                  color: "#fff",
                  bgcolor: "#2563EB",
                  borderRadius: 999,
                  px: 2,
                  py: 0.9,
                  textTransform: "none",
                  fontWeight: 700,
                  boxShadow: "0 10px 24px rgba(37, 99, 235, 0.22)",
                  "&:hover": {
                    bgcolor: "#0F172A",
                    color: "#fff",
                    boxShadow: "0 12px 28px rgba(15, 23, 42, 0.24)",
                  },
                }}
              >
                Book a Scheduling Audit
              </Button>
              <Button
                component={Link}
                to="/login"
                sx={{ color: "black", textTransform: "none" }}
              >
                Log In
              </Button>
            </>
          ) : (
            <>
              <Button
                startIcon={<MdLogout size={18} />}
                sx={{ color: "text.secondary" }}
                onClick={handleLogout}
              >
                Logout
              </Button>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
