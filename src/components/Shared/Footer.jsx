import { Box, Container, Link, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

import appStoreBadge from "../../assets/images/footer-apple-appstore-badge.svg";
import googlePlayBadge from "../../assets/images/footer-google-play-badge-4.svg";

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
          py: 3,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "flex-start", sm: "center" },
          justifyContent: "space-between",
          gap: 3,
        }}
      >
        <Box>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 1.5 }}>
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
            <Link component={RouterLink} to="/contact" underline="hover">
              Contact
            </Link>
          </Stack>
        </Box>

        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
            Mobile Apps
          </Typography>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            alignItems={{ xs: "flex-start", sm: "center" }}
          >
            <Box
              component="a"
              href="https://play.google.com/store/apps/details?id=com.wisershifts.mobile&pcampaignid=web_share"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                display: "inline-flex",
                lineHeight: 0,
                transition: "transform 0.18s ease",
                "&:hover": { transform: "translateY(-1px)" },
              }}
            >
              <Box
                component="img"
                src={googlePlayBadge}
                alt="Get it on Google Play"
                sx={{ width: "100px", height: "30px" }}
              />
            </Box>
            <Box
              component="a"
              href="https://apps.apple.com/us/app/wisershifts/id6789699309"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                display: "inline-flex",
                lineHeight: 0,
                transition: "transform 0.18s ease",
                "&:hover": { transform: "translateY(-1px)" },
              }}
            >
              <Box
                component="img"
                src={appStoreBadge}
                alt="Download on the App Store"
                sx={{ width: "95px", height: "32px" }}
              />
            </Box>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}
