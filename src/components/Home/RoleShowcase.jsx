import { useState } from "react";
import { Box, Button, ButtonBase, Typography } from "@mui/material";
import { FiArrowRight } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import RoleMocks from "./RoleMocks";
import { ROLES } from "./roleContent";

/**
 * "Built for your role" on the home page: one tab per buyer, each with what
 * it does for them, a drawing of the screen they'd use, and a link to their
 * own page.
 */
export default function RoleShowcase() {
  const navigate = useNavigate();
  const [slug, setSlug] = useState(ROLES[0].slug);
  const role = ROLES.find((r) => r.slug === slug);

  return (
    <Box>
      <Box
        role="tablist"
        aria-label="Choose your role"
        sx={{
          display: "flex",
          justifyContent: "center",
          gap: 0.5,
          p: 0.5,
          mx: "auto",
          mb: { xs: 4, md: 5 },
          width: "fit-content",
          maxWidth: "100%",
          borderRadius: 999,
          bgcolor: "#F2F4F7",
        }}
      >
        {ROLES.map((r) => {
          const active = r.slug === slug;
          return (
            <ButtonBase
              key={r.slug}
              role="tab"
              aria-selected={active}
              onClick={() => setSlug(r.slug)}
              sx={{
                px: { xs: 1.25, sm: 2.25 },
                py: 1,
                borderRadius: 999,
                fontWeight: 750,
                fontSize: { xs: "0.85rem", sm: "0.95rem" },
                whiteSpace: "nowrap",
                color: active ? "#111827" : "#475467",
                bgcolor: active ? "#fff" : "transparent",
                boxShadow: active ? "0 1px 3px rgba(16,24,40,0.12)" : "none",
                fontFamily: "inherit",
              }}
            >
              <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>{r.tabShort}</Box>
              <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>{r.tab}</Box>
            </ButtonBase>
          );
        })}
      </Box>

      <Box
        role="tabpanel"
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1.05fr" },
          gap: { xs: 4, md: 7 },
          alignItems: "center",
          maxWidth: 1150,
          mx: "auto",
        }}
      >
        <Box>
          <Typography sx={{ color: "#2563EB", fontSize: "0.78rem", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            {role.eyebrow}
          </Typography>
          <Typography component="h3" sx={{ fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.1, fontSize: { xs: "1.7rem", md: "2.2rem" }, color: "#111827", mt: 1 }}>
            {role.title}
          </Typography>
          <Typography sx={{ color: "#667085", lineHeight: 1.6, mt: 1.5, fontSize: "1.02rem" }}>{role.subtitle}</Typography>
          <Box sx={{ display: "grid", gap: 2, mt: 3 }}>
            {role.points.slice(0, 4).map((p) => {
              const Icon = p.icon;
              return (
                <Box key={p.title} sx={{ display: "flex", gap: 1.5 }}>
                  <Box sx={{ width: 36, height: 36, minWidth: 36, borderRadius: "11px", display: "grid", placeItems: "center", bgcolor: "rgba(37,99,235,0.08)", color: "#2563EB" }}>
                    <Icon size={18} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontWeight: 800, color: "#111827" }}>{p.title}</Typography>
                    <Typography sx={{ color: "#667085", lineHeight: 1.5, fontSize: "0.95rem" }}>{p.text}</Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
          <Button
            endIcon={<FiArrowRight />}
            onClick={() => navigate(`/for/${role.slug}`)}
            sx={{ mt: 3, px: 0, textTransform: "none", fontWeight: 800, fontSize: "1rem" }}
          >
            More for {role.tab.toLowerCase().replace("dons", "DONs")}
          </Button>
        </Box>
        <RoleMocks names={role.mocks} />
      </Box>
    </Box>
  );
}
