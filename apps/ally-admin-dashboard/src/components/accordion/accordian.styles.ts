// Carbon migration: these were MUI `sx` objects for the MUI Accordion. The
// component is now a plain (MUI-free) disclosure, so the styling is expressed
// as Tailwind className strings applied to the root / summary / details nodes.
export const accordionClassName =
  "shadow-none rounded-[4px] border-[0.5px] border-[#dbdbdb] bg-white";

export const accordionSummaryClassName =
  "flex flex-row items-center gap-[18px] px-4 py-[10px] w-full text-left";

export const accordionDetailsClassName = "p-0";
