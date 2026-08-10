import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import { FiMail, FiPhoneCall } from "react-icons/fi";

export default function ContactPage() {
  return (
    <Box
      sx={{
        minHeight: "calc(100vh - 80px)",
        bgcolor: "#f8f9fb",
        py: { xs: 6, md: 10 },
      }}
    >
      <Container maxWidth="md">
        <Card
          variant="outlined"
          sx={{
            borderRadius: 4,
            p: { xs: 2.5, md: 3.5 },
            boxShadow: "0 16px 44px rgba(15, 23, 42, 0.06)",
          }}
        >
          <CardContent sx={{ p: 0 }}>
            <Stack spacing={3}>
              <Box>
                <Typography
                  variant="overline"
                  sx={{ letterSpacing: 1.2, color: "text.secondary" }}
                >
                  Contact us
                </Typography>
                <Typography
                  variant="h3"
                  sx={{ fontWeight: 900, lineHeight: 1.1, mt: 0.5 }}
                >
                  We’d love to help with your scheduling goals.
                </Typography>
                <Typography
                  sx={{ color: "text.secondary", mt: 1.5, maxWidth: 620 }}
                >
                  Whether you are exploring Easishift for the first time or want
                  to improve an existing rollout, our team can help you find the
                  right next step.
                </Typography>
              </Box>

              <Stack spacing={1.5}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    p: 2,
                    borderRadius: 3,
                    bgcolor: "rgba(25,118,210,0.05)",
                  }}
                >
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 2,
                      display: "grid",
                      placeItems: "center",
                      bgcolor: "rgba(25,118,210,0.12)",
                      color: "primary.main",
                      flexShrink: 0,
                    }}
                  >
                    <FiMail size={20} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>Email</Typography>
                    <Link href="mailto:info@wisershifts.com" underline="hover">
                      info@wisershifts.com
                    </Link>
                  </Box>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    p: 2,
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 2,
                      display: "grid",
                      placeItems: "center",
                      bgcolor: "rgba(25,118,210,0.08)",
                      color: "primary.main",
                      flexShrink: 0,
                    }}
                  >
                    <FiPhoneCall size={20} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>
                      Book a demo
                    </Typography>
                    <Typography sx={{ color: "text.secondary" }}>
                      Prefer a call? We’re happy to walk through your needs
                      live.
                    </Typography>
                  </Box>
                </Box>
              </Stack>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <Button
                  variant="contained"
                  size="large"
                  component="a"
                  href="mailto:info@wisershifts.com"
                  sx={{ fontWeight: 700, borderRadius: 999 }}
                >
                  Email us
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  component="a"
                  href="https://calendly.com/wisershifts-info/30min"
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ fontWeight: 700, borderRadius: 999 }}
                >
                  Request a demo
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
