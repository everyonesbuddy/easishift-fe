import { Box, Container, Link, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        borderTop: "1px solid",
        borderColor: "divider",
        bgcolor: "#ffffff",
        mt: 4,
      }}
    >
      <Container
        maxWidth="lg"
        sx={{
          py: 2,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "flex-start", sm: "center" },
          justifyContent: "space-between",
          gap: 1.5,
        }}
      >
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {new Date().getFullYear()} WiserShifts. All rights reserved.
        </Typography>

        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <Link
            component={RouterLink}
            to="/terms-and-conditions"
            underline="hover"
          >
            Terms
          </Link>
          <Link component={RouterLink} to="/privacy-policy" underline="hover">
            Privacy Policy
          </Link>
          <Link component={RouterLink} to="/eula" underline="hover">
            EULA
          </Link>
        </Stack>
      </Container>
    </Box>
  );
}
