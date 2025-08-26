import { CSSProperties } from "react";

import { TagDisplay } from "@types";

export interface TagGroupProps {
  tags: TagDisplay[];
  className?: string;
  style?: CSSProperties;
}
