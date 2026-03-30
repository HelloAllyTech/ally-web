import { SxProps, Theme } from "@mui/material";

export const accordionSx: SxProps<Theme> = {
  boxShadow: "none",
  borderRadius: "4px",
  border: "0.5px solid #dbdbdb",
  "&::before": {
    opacity: 0,
    content: "none",
  },
  "&.Mui-expanded": {
    margin: 0,
  },
};

export const accordionSummarySx: SxProps<Theme> = {
  minHeight: "auto",
  padding: "10px 16px",
  flexDirection: "row-reverse",
  "&.Mui-expanded": {
    minHeight: "auto",
  },
  "& .MuiAccordionSummary-content": {
    margin: 0,
    marginLeft: "18px",
    "&.Mui-expanded": {
      margin: 0,
      marginLeft: "18px",
    },
  },
  "& .MuiAccordionSummary-expandIconWrapper": {
    marginRight: 0,
    marginLeft: 0,
  },
};

export const accordionDetailsSx: SxProps<Theme> = {
  padding: 0,
};
