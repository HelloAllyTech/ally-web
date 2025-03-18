import { Dispatch, FC, SetStateAction } from "react";
import { ToggleButtonGroup, ToggleButton, styled } from "@mui/material";

import { SectionType } from "./types";

interface CallSummaryStepperProps {
  activeSection: SectionType;
  setActiveSection: (section: SectionType) => void;
  completedSections: SectionType[];
  setCompletedSections: Dispatch<SetStateAction<SectionType[]>>;
}

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
      backgroundColor: "#DDEDFF",
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
  setCompletedSections
}) => {
  const handleSectionChange = (event: React.MouseEvent<HTMLElement>, newSection: SectionType) => {
    if (newSection !== null) {
      const sections = Object.values(SectionType);
      const newIndex = sections.indexOf(newSection);
      const currentIndex = sections.indexOf(activeSection);

      // Allow clicking if:
      // 1. It's a completed section (can go back)
      // 2. It's the immediatley next section and all previous sections are completed
      if (completedSections.includes(newSection) || newIndex === currentIndex + 1) {
        // Mark current section as completed only when moving forward
        if (newIndex > currentIndex) {
          setCompletedSections(prev => [...prev, activeSection]);
        }

        setActiveSection(newSection);
      }
    }
  };

  return (
    <StyledToggleButtonGroup
      value={activeSection}
      exclusive
      onChange={handleSectionChange}
      aria-label="call summary sections"
      fullWidth
    >
      {Object.values(SectionType).map((section) => (
        <StyledToggleButton
          key={section}
          value={section}
          aria-label={section}
          className={completedSections.includes(section) ? "completed" : ""}
        >
          {section}
        </StyledToggleButton>
      ))}
    </StyledToggleButtonGroup>
  );
};

export default CallSummaryStepper;
