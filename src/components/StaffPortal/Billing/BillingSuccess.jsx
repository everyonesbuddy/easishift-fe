import React, { useEffect } from "react";
import { Box, Typography, Button } from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../../context/AuthContext";

export default function BillingSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshTenant } = useAuth();

  useEffect(() => {
    // Optionally inform backend or refresh tenant state
    refreshTenant && refreshTenant();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 2 }}>
        Payment successful
      </Typography>
      <Typography sx={{ color: "text.secondary", mb: 3 }}>
        Thank you — your subscription should activate shortly. We'll update your
        account automatically.
      </Typography>
      <Button variant="contained" onClick={() => navigate("/dashboard")}>
        Go to dashboard
      </Button>
    </Box>
  );
}
