import { useState } from "react";
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Paper,
  MenuItem,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import api from "../../config/api";

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export default function SignupTenant() {
  const [hospitalName, setHospitalName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [tenantPhoneCountryCode, setTenantPhoneCountryCode] = useState("");
  const [tenantPhone, setTenantPhone] = useState("");
  const [userPhoneCountryCode, setUserPhoneCountryCode] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const navigate = useNavigate();

  const phoneCountryCodes = [
    { code: "+1", label: "US/CA (+1)" },
    { code: "+44", label: "UK (+44)" },
    { code: "+234", label: "Nigeria (+234)" },
    { code: "+353", label: "Ireland (+353)" },
    { code: "+61", label: "Australia (+61)" },
    { code: "+64", label: "New Zealand (+64)" },
    { code: "+27", label: "South Africa (+27)" },
    { code: "+91", label: "India (+91)" },
    { code: "+49", label: "Germany (+49)" },
    { code: "+33", label: "France (+33)" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setEmailError("");

    if (!validateEmail(adminEmail)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    try {
      const res = await api.post("/auth/signup/tenant", {
        name: hospitalName,
        email: adminEmail,
        password: adminPassword,
        tenantPhoneCountryCode,
        tenantPhone,
        userPhoneCountryCode,
        userPhone,
        address,
        adminName,
      });

      console.log("Tenant created:", res.data);
      navigate("/login");
    } catch (err) {
      console.error("Signup error:", err);
      setError(
        err.response?.data?.message || "Failed to create tenant. Try again.",
      );
    }
  };

  const whiteTextField = {
    "& .MuiOutlinedInput-root": {
      "& fieldset": { borderColor: "black" },
      "&:hover fieldset": { borderColor: "#000000" },
      "&.Mui-focused fieldset": { borderColor: "#000000" },
      color: "black",
    },
    "& .MuiInputLabel-root": {
      color: "black",
      "&.Mui-focused": { color: "#000000" },
    },
  };

  return (
    <Container maxWidth="sm">
      <Paper
        elevation={6}
        sx={{
          mt: 8,
          p: 4,
          backgroundColor: "rgba(0,0,0,0.05)",
          borderRadius: 3,
        }}
      >
        <Box display="flex" flexDirection="column" gap={3}>
          <Typography
            variant="h4"
            align="center"
            sx={{ color: "black", mb: 2 }}
          >
            Sign Up Hospital
          </Typography>

          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Hospital Name"
            fullWidth
            value={hospitalName}
            onChange={(e) => setHospitalName(e.target.value)}
            variant="outlined"
            sx={whiteTextField}
          />

          <Box display="flex" gap={2}>
            <TextField
              select
              label="Country Code"
              value={tenantPhoneCountryCode}
              onChange={(e) => setTenantPhoneCountryCode(e.target.value)}
              variant="outlined"
              sx={{ ...whiteTextField, minWidth: 160 }}
            >
              <MenuItem value="">Select</MenuItem>
              {phoneCountryCodes.map((item) => (
                <MenuItem key={item.code} value={item.code}>
                  {item.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Facility Phone"
              fullWidth
              value={tenantPhone}
              onChange={(e) => setTenantPhone(e.target.value)}
              variant="outlined"
              sx={whiteTextField}
            />
          </Box>

          <TextField
            label="Hospital Address"
            fullWidth
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            variant="outlined"
            sx={whiteTextField}
          />

          <Typography variant="h6" sx={{ color: "black" }}>
            Admin Info
          </Typography>

          <TextField
            label="Admin Name"
            fullWidth
            value={adminName}
            onChange={(e) => setAdminName(e.target.value)}
            variant="outlined"
            sx={whiteTextField}
          />

          <Box display="flex" gap={2}>
            <TextField
              select
              label="Country Code"
              value={userPhoneCountryCode}
              onChange={(e) => setUserPhoneCountryCode(e.target.value)}
              variant="outlined"
              sx={{ ...whiteTextField, minWidth: 160 }}
            >
              <MenuItem value="">Select</MenuItem>
              {phoneCountryCodes.map((item) => (
                <MenuItem key={item.code} value={item.code}>
                  {item.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Admin Phone"
              fullWidth
              value={userPhone}
              onChange={(e) => setUserPhone(e.target.value)}
              variant="outlined"
              sx={whiteTextField}
            />
          </Box>

          <TextField
            label="Admin Email"
            type="email"
            fullWidth
            value={adminEmail}
            onChange={(e) => {
              setAdminEmail(e.target.value);
              setEmailError("");
            }}
            error={!!emailError}
            helperText={emailError}
            variant="outlined"
            sx={whiteTextField}
          />

          <TextField
            label="Password"
            type="password"
            fullWidth
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            variant="outlined"
            sx={whiteTextField}
          />

          <Button
            variant="contained"
            onClick={handleSubmit}
            sx={{
              mt: 2,
              py: 1.5,
              bgcolor: "#42a5f5",
              "&:hover": { bgcolor: "#1e88e5" },
              color: "white",
              fontWeight: 600,
            }}
          >
            Create Hospital
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
