import {
  AppBar,
  Toolbar,
  Box,
  Typography,
  IconButton,
  Button,
  Menu,
  MenuItem,
  Divider,
  ListItemIcon,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useState } from "react";
import { MdLogout, MdMenu } from "react-icons/md";
import {
  FiCalendar,
  FiChevronDown,
  FiClock,
  FiLink,
  FiMessageCircle,
  FiPhoneCall,
} from "react-icons/fi";
import logo from "../../assets/logos/wiserShifts-logo-light.svg";
import { getRoleDisplayName } from "../../constants/industryRoles";
import { isRootWorkspaceHost } from "../../utils/tenantWorkspace";

export default function Navbar({ onMobileOpen }) {
  const { user, logout, roles, publicBranding } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));
  const [featuresAnchor, setFeaturesAnchor] = useState(null);
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState(null);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const featureLinks = [
    {
      label: "Employee Scheduling",
      to: "/features/scheduling",
      icon: FiCalendar,
    },
    { label: "Time Clock", to: "/features/timeclock", icon: FiClock },
    {
      label: "Team Messaging",
      to: "/features/messaging",
      icon: FiMessageCircle,
    },
    { label: "Integrations", to: "/integrations", icon: FiLink },
  ];

  const closePublicMenus = () => {
    setFeaturesAnchor(null);
    setMobileMenuAnchor(null);
  };

  if (!user && isRootWorkspaceHost() && window.location.pathname === "/login") {
    return (
      <AppBar
        position="sticky"
        sx={{
          bgcolor: "background.paper",
          borderBottom: 1,
          borderColor: "divider",
          boxShadow: "none",
          zIndex: 30,
        }}
      >
        <Toolbar
          sx={{
            width: "100%",
            maxWidth: 1200,
            mx: "auto",
            px: { xs: 2, sm: 4 },
            minHeight: 72,
          }}
        >
          <Box
            component={Link}
            to="/"
            aria-label="WiserShifts home"
            sx={{ display: "flex", alignItems: "center" }}
          >
            <Box
              component="img"
              src={logo}
              alt="WiserShifts"
              sx={{
                width: { xs: 170, sm: 200 },
                maxHeight: 44,
                objectFit: "contain",
              }}
            />
          </Box>
          <Box sx={{ flex: 1 }} />
          <Button
            component={Link}
            to="/signup-tenant"
            variant="contained"
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            Create workspace
          </Button>
        </Toolbar>
      </AppBar>
    );
  }

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
                  textDecoration: "none",
                }}
              >
                <Box
                  component="img"
                  src={publicBranding?.logoUrl || logo}
                  alt={publicBranding?.displayName || "Wisershifts logo"}
                  sx={{
                    width: { xs: 190, sm: 220 },
                    maxHeight: 48,
                    height: "auto",
                    display: "block",
                    objectFit: "contain",
                  }}
                />
              </Box>
              {!publicBranding && (
                <Box
                  sx={{
                    display: { xs: "none", md: "flex" },
                    alignItems: "center",
                    ml: 2,
                    gap: 0.25,
                  }}
                >
                  <Button
                    onClick={(event) => setFeaturesAnchor(event.currentTarget)}
                    endIcon={<FiChevronDown size={16} />}
                    sx={{
                      color: "#111827",
                      textTransform: "none",
                      fontWeight: 700,
                    }}
                  >
                    Features
                  </Button>
                  <Menu
                    anchorEl={featuresAnchor}
                    open={Boolean(featuresAnchor)}
                    onClose={() => setFeaturesAnchor(null)}
                    MenuListProps={{ "aria-label": "Feature pages" }}
                    slotProps={{
                      paper: { sx: { mt: 1, minWidth: 220, borderRadius: 2 } },
                    }}
                  >
                    {featureLinks.map((item) => (
                      <MenuItem
                        key={item.to}
                        component={Link}
                        to={item.to}
                        onClick={closePublicMenus}
                      >
                        <ListItemIcon sx={{ minWidth: 32, color: "#2563EB" }}>
                          <item.icon size={17} />
                        </ListItemIcon>
                        {item.label}
                      </MenuItem>
                    ))}
                  </Menu>
                  <Button
                    component={Link}
                    to="/calculators"
                    sx={{
                      color: "#111827",
                      textTransform: "none",
                      fontWeight: 700,
                    }}
                  >
                    Calculators
                  </Button>
                  <Button
                    component={Link}
                    to="/pricing"
                    sx={{
                      color: "#111827",
                      textTransform: "none",
                      fontWeight: 700,
                    }}
                  >
                    Pricing
                  </Button>
                </Box>
              )}
            </>
          ) : (
            <>
              {isSmall ? (
                <IconButton
                  onClick={onMobileOpen}
                  sx={{ mr: 1 }}
                  aria-label="Open dashboard navigation"
                >
                  <MdMenu />
                </IconButton>
              ) : (
                <Typography variant="h5" sx={{ color: "text.primary" }}>
                  {roles.length
                    ? roles.map(getRoleDisplayName).join(" / ")
                    : "Staff"}{" "}
                  Dashboard
                </Typography>
              )}
            </>
          )}
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          {!user ? (
            <>
              {!publicBranding && (
                <>
                  <IconButton
                    aria-label="Open navigation menu"
                    onClick={(event) =>
                      setMobileMenuAnchor(event.currentTarget)
                    }
                    sx={{
                      display: { xs: "inline-flex", md: "none" },
                      color: "#111827",
                    }}
                  >
                    <MdMenu />
                  </IconButton>
                  <Menu
                    anchorEl={mobileMenuAnchor}
                    open={Boolean(mobileMenuAnchor)}
                    onClose={() => setMobileMenuAnchor(null)}
                    MenuListProps={{ "aria-label": "Website navigation" }}
                    slotProps={{
                      paper: { sx: { mt: 1, minWidth: 235, borderRadius: 2 } },
                    }}
                  >
                    <MenuItem
                      component={Link}
                      to="/calculators"
                      onClick={closePublicMenus}
                    >
                      Calculators
                    </MenuItem>
                    <MenuItem
                      component={Link}
                      to="/pricing"
                      onClick={closePublicMenus}
                    >
                      Pricing
                    </MenuItem>
                    <Divider />
                    {featureLinks.map((item) => (
                      <MenuItem
                        key={item.to}
                        component={Link}
                        to={item.to}
                        onClick={closePublicMenus}
                      >
                        <ListItemIcon sx={{ minWidth: 32, color: "#2563EB" }}>
                          <item.icon size={17} />
                        </ListItemIcon>
                        {item.label}
                      </MenuItem>
                    ))}
                  </Menu>
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
                      "&:hover": { bgcolor: "#0F172A", color: "#fff" },
                    }}
                  >
                    Book a Demo
                  </Button>
                </>
              )}
              <Button
                component={Link}
                to="/login"
                sx={{ color: "black", textTransform: "none" }}
              >
                Log In
              </Button>
            </>
          ) : (
            <Button
              startIcon={<MdLogout size={18} />}
              sx={{ color: "text.secondary" }}
              onClick={handleLogout}
            >
              Logout
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
