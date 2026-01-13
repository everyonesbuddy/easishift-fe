import React from "react";
import { Box, Typography, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";

export default function BillingCancel() {
  const navigate = useNavigate();

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 2 }}>
        Payment cancelled
      </Typography>
      <Typography sx={{ color: "text.secondary", mb: 3 }}>
        Your payment was not completed. You can try again or return to the
        dashboard.
      </Typography>
      <Button variant="contained" onClick={() => navigate("/billing")}>
        Back to billing
      </Button>
    </Box>
  );
}
