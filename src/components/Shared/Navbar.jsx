import {
  AppBar,
  Toolbar,
  Box,
  Typography,
  IconButton,
  Badge,
  Button,
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { MdNotifications, MdLogout } from "react-icons/md";
import logo from "../../assets/logos/easishift-logo-plus-text1.svg";

export default function Navbar() {
  const { user, isStaff, isAdmin, logout, role } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <AppBar
      position="sticky"
      sx={{
        bgcolor: "background.paper",
        borderBottom: 1,
        borderColor: "divider",
        zIndex: 30,
      }}
    >
      <Toolbar sx={{ px: 4, height: 80, minHeight: 80 }}>
        <Box sx={{ flex: 1 }}>
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
                  alt="Easishift logo"
                  aria-label="Easishift"
                  sx={{
                    width: 220,
                    height: 44,
                    display: "block",
                    objectFit: "contain",
                  }}
                />
              </Box>
            </>
          ) : (
            <>
              <Typography variant="h5" sx={{ color: "text.primary" }}>
                {role.charAt(0).toUpperCase() + role.slice(1)} Dashboard
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "text.secondary", mt: 0.5 }}
              >
                Manage your healthcare workforce efficiently
              </Typography>
            </>
          )}
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {!user ? (
            <>
              <Button component={Link} to="/login" sx={{ color: "black" }}>
                Login
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
