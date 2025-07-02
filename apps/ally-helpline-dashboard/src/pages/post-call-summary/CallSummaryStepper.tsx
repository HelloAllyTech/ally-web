import { FC } from "react";
import { ToggleButtonGroup, ToggleButton, styled } from "@mui/material";

import { CallSummaryStepperProps, SectionType } from "./types";

const StyledToggleButtonGroup = styled(ToggleButtonGroup)(() => ({
  padding: 0,
  gap: 0,
  width: "100%",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  "& .MuiToggleButtonGroup-grouped": {
    color: "#1D1B20",
    "&:hover": {
      // backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
    "&.Mui-selected": {
      backgroundColor: "#DDEDFF",
      color: "#0278FE",
      border: "1px solid #0278FE",
      "&:hover": {
        // backgroundColor: '#DDEDFF',
      },
    },
    "&.completed": {
      color: "#0278FE",
      border: "1px solid #0278FE",
      "&:hover": {
        backgroundColor: "rgba(2, 120, 254, 0.04)",
      },
    },
    "&:first-of-type": {
      borderTopLeftRadius: "100px !important",
      borderBottomLeftRadius: "100px !important",
    },
    "&:last-of-type": {
      borderTopRightRadius: "100px !important",
      borderBottomRightRadius: "100px !important",
    },
  },
}));

const StyledToggleButton = styled(ToggleButton)({
  "&.MuiToggleButton-root": {
    textTransform: "none",
    height: "40px",
    fontWeight: 500,
    fontSize: "14px",
    transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
});

const CallSummaryStepper: FC<CallSummaryStepperProps> = ({
  activeSection,
  setActiveSection,
  completedSections,
  className,
}) => {
  const handleSectionChange = (event: React.MouseEvent<HTMLElement>, newSection: SectionType) => {
    if (newSection !== null && completedSections?.includes(newSection)) {
      setActiveSection(newSection);
    }
  };

  return (
    <StyledToggleButtonGroup
      value={activeSection}
      exclusive
      className={className}
      onChange={handleSectionChange}
      aria-label="call summary sections"
      fullWidth
    >
      {Object.values(SectionType).map(section => (
        <StyledToggleButton
          key={section}
          disabled={!completedSections?.includes(section)}
          value={section}
          aria-label={section}
          className={completedSections?.includes(section) ? "completed" : ""}
        >
          {section}
        </StyledToggleButton>
      ))}
    </StyledToggleButtonGroup>
  );
};

export default CallSummaryStepper;
