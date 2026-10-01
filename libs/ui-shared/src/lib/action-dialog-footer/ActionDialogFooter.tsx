import { FC, ReactNode } from "react";

import { ModalFooter } from "../../primitives";

export const ActionDialogFooter: FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <ModalFooter>
      <div className="flex gap-4 items-center w-full">{children}</div>
    </ModalFooter>
  );
};
