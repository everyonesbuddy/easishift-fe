import { useState } from "react";
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Paper,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import api from "../../config/api";

export default function SignupTenant() {
  const [hospitalName, setHospitalName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await api.post("/auth/signup/tenant", {
        name: hospitalName,
        email: adminEmail,
        password: adminPassword,
        phone,
        address,
        adminName,
      });

      console.log("Tenant created:", res.data);
      navigate("/login");
    } catch (err) {
      console.error("Signup error:", err);
      setError(
        err.response?.data?.message || "Failed to create tenant. Try again."
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

          <TextField
            label="Hospital Phone"
            fullWidth
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            variant="outlined"
            sx={whiteTextField}
          />

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

          <TextField
            label="Admin Email"
            type="email"
            fullWidth
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
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
