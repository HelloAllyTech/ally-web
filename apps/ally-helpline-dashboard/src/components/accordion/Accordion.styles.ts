import { SxProps, Theme } from "@mui/material";

export const accordionSx: SxProps<Theme> = {
  boxShadow: "none",
  borderRadius: 0,
  borderBottom: "0.5px solid #dbdbdb",
  "&::before": {
    opacity: 0,
    content: "none",
  },
};

export const accordionSummarySx: SxProps<Theme> = {
  flexDirection: "row-reverse",
  gap: "16px",
  height: "56px",
  "& .MuiAccordionSummary-content": {
    gap: "16px",
  },
};

export const accordionDetailsSx: SxProps<Theme> = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  padding: "0px 16px 0px 60px",
  fontSize: "14px",
};
