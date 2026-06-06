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
  Checkbox,
  FormControlLabel,
  FormHelperText,
  Link,
} from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import api from "../../config/api";

const TERMS_VERSION = "1.0";

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
  const [industry, setIndustry] = useState("");
  const [error, setError] = useState("");
  const [hospitalNameError, setHospitalNameError] = useState("");
  const [adminNameError, setAdminNameError] = useState("");
  const [addressError, setAddressError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [industryError, setIndustryError] = useState("");
  const [tenantPhoneError, setTenantPhoneError] = useState("");
  const [adminPhoneError, setAdminPhoneError] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState("");
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

  const industries = [
    "Healthcare",
    "Senior Living",
    "Retail",
    "Hospitality",
    "Manufacturing",
    "Education",
    "Transportation",
    "Finance",
    "Police",
    "Warehouse and Logistics",
    "Security Service",
    "Other",
  ];

  const hasTenantPhoneCountryCode = Boolean(tenantPhoneCountryCode.trim());
  const hasTenantPhone = Boolean(tenantPhone.trim());
  const hasAdminPhoneCountryCode = Boolean(userPhoneCountryCode.trim());
  const hasAdminPhone = Boolean(userPhone.trim());

  const isFormValid =
    Boolean(hospitalName.trim()) &&
    Boolean(address.trim()) &&
    Boolean(adminName.trim()) &&
    Boolean(adminPassword.trim()) &&
    adminPassword.length >= 8 &&
    validateEmail(adminEmail) &&
    Boolean(industry) &&
    hasTenantPhoneCountryCode === hasTenantPhone &&
    hasAdminPhoneCountryCode === hasAdminPhone &&
    termsAccepted;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setHospitalNameError("");
    setAdminNameError("");
    setAddressError("");
    setPasswordError("");
    setEmailError("");
    setIndustryError("");
    setTenantPhoneError("");
    setAdminPhoneError("");
    setTermsError("");

    if (!hospitalName.trim()) {
      setHospitalNameError("Facility name is required");
      return;
    }

    if (!address.trim()) {
      setAddressError("Facility address is required");
      return;
    }

    if (!adminName.trim()) {
      setAdminNameError("Admin name is required");
      return;
    }

    if (!adminPassword.trim()) {
      setPasswordError("Password is required");
      return;
    }

    if (adminPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }

    if (hasTenantPhoneCountryCode !== hasTenantPhone) {
      setTenantPhoneError(
        "Facility phone and country code must be provided together",
      );
      return;
    }

    if (hasAdminPhoneCountryCode !== hasAdminPhone) {
      setAdminPhoneError(
        "Admin phone and country code must be provided together",
      );
      return;
    }

    if (!validateEmail(adminEmail)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    if (!industry) {
      setIndustryError("Please select an industry");
      return;
    }

    if (!termsAccepted) {
      setTermsError("You must accept the Terms and Conditions to continue");
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
        industry,
        adminName,
        termsAccepted: true,
        termsVersion: TERMS_VERSION,
        termsAcceptedAt: new Date().toISOString(),
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
            Sign Up Facility
          </Typography>

          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Facility Name"
            fullWidth
            value={hospitalName}
            onChange={(e) => {
              setHospitalName(e.target.value);
              setHospitalNameError("");
            }}
            error={!!hospitalNameError}
            helperText={hospitalNameError}
            variant="outlined"
            sx={whiteTextField}
            required
          />

          <Box display="flex" gap={2}>
            <TextField
              select
              label="Country Code"
              value={tenantPhoneCountryCode}
              onChange={(e) => {
                setTenantPhoneCountryCode(e.target.value);
                setTenantPhoneError("");
              }}
              error={!!tenantPhoneError}
              helperText={tenantPhoneError}
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
              onChange={(e) => {
                setTenantPhone(e.target.value);
                setTenantPhoneError("");
              }}
              error={!!tenantPhoneError}
              variant="outlined"
              sx={whiteTextField}
            />
          </Box>

          <TextField
            label="Facility Address"
            fullWidth
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              setAddressError("");
            }}
            error={!!addressError}
            helperText={addressError}
            variant="outlined"
            sx={whiteTextField}
            required
          />

          <TextField
            select
            label="Industry"
            fullWidth
            value={industry}
            onChange={(e) => {
              setIndustry(e.target.value);
              setIndustryError("");
            }}
            error={!!industryError}
            helperText={industryError}
            variant="outlined"
            sx={whiteTextField}
            required
          >
            <MenuItem value="">Select Industry</MenuItem>
            {industries.map((item) => (
              <MenuItem key={item} value={item}>
                {item}
              </MenuItem>
            ))}
          </TextField>

          <Typography variant="h6" sx={{ color: "black" }}>
            Admin Info
          </Typography>

          <TextField
            label="Admin Name"
            fullWidth
            value={adminName}
            onChange={(e) => {
              setAdminName(e.target.value);
              setAdminNameError("");
            }}
            error={!!adminNameError}
            helperText={adminNameError}
            variant="outlined"
            sx={whiteTextField}
            required
          />

          <Box display="flex" gap={2}>
            <TextField
              select
              label="Country Code"
              value={userPhoneCountryCode}
              onChange={(e) => {
                setUserPhoneCountryCode(e.target.value);
                setAdminPhoneError("");
              }}
              error={!!adminPhoneError}
              helperText={adminPhoneError}
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
              onChange={(e) => {
                setUserPhone(e.target.value);
                setAdminPhoneError("");
              }}
              error={!!adminPhoneError}
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
            required
          />

          <TextField
            label="Password"
            type="password"
            fullWidth
            value={adminPassword}
            onChange={(e) => {
              setAdminPassword(e.target.value);
              setPasswordError("");
            }}
            error={!!passwordError}
            helperText={passwordError}
            variant="outlined"
            sx={whiteTextField}
            required
          />

          <Box>
            <FormControlLabel
              control={
                <Checkbox
                  checked={termsAccepted}
                  onChange={(e) => {
                    setTermsAccepted(e.target.checked);
                    setTermsError("");
                  }}
                  sx={{ color: "black", "&.Mui-checked": { color: "black" } }}
                />
              }
              label={
                <Typography variant="body2" sx={{ color: "black" }}>
                  I agree to the{" "}
                  <Link
                    component={RouterLink}
                    to="/terms-and-conditions"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Terms and Conditions
                  </Link>
                  ,{" "}
                  <Link
                    component={RouterLink}
                    to="/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Privacy Policy
                  </Link>
                  , and{" "}
                  <Link
                    component={RouterLink}
                    to="/eula"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    End User License Agreement
                  </Link>
                </Typography>
              }
            />
            {termsError && (
              <FormHelperText error sx={{ ml: 1.75 }}>
                {termsError}
              </FormHelperText>
            )}
          </Box>

          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!isFormValid}
            sx={{
              mt: 2,
              py: 1.5,
              bgcolor: "#42a5f5",
              "&:hover": { bgcolor: "#1e88e5" },
              color: "white",
              fontWeight: 600,
              borderRadius: 999,
            }}
          >
            Create Facility
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
