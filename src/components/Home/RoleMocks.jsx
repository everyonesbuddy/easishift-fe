import { Box } from "@mui/material";
import { BudgetMock, MondayEmailMock, OvertimeMock, TrendMock, WeekMock } from "./ProductMocks";

const MOCKS = { week: WeekMock, overtime: OvertimeMock, budget: BudgetMock, email: MondayEmailMock, trend: TrendMock };

/** One or two product drawings for a role, the second slightly offset. */
export default function RoleMocks({ names }) {
  return (
    <Box sx={{ display: "grid", gap: 2, position: "relative" }}>
      {names.map((name, i) => {
        const Mock = MOCKS[name];
        return (
          <Box key={name} sx={{ ml: { md: i ? 6 : 0 }, mr: { md: i ? 0 : 6 } }}>
            <Mock />
          </Box>
        );
      })}
    </Box>
  );
}
