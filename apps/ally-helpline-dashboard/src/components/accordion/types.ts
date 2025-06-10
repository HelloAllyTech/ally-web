import { ComponentType, ReactNode, SVGProps } from "react";

export type AccordionProps = {
    children: ReactNode;
    defaultExpanded?: boolean;
    title: string;
    titleIcon?: {
        icon: ComponentType<SVGProps<SVGSVGElement>>;
        alt: string;
    };
}