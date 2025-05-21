import { ComponentType, ReactNode, SVGProps } from "react";

export type AccordionProps = {
    children: ReactNode;
    title: string;
    titleIcon?: {
        icon: ComponentType<SVGProps<SVGSVGElement>>;
        alt: string;
    };
}