import { FC, useEffect, useRef, useState } from "react";

import { useSelector } from "react-redux";

import { logger } from "@ally-ui-mono/ui-shared";
import { useUpdateCallInfoMutation } from "@api";
import { Edit } from "@assets";
import { TextField } from "@components";
import { Permissions } from "@constants";
import { useDebounce } from "@hooks";
import { RootState } from "@store";

import { SummaryHeaderProps } from "./types";

const SummaryHeader: FC<SummaryHeaderProps> = ({
  summaryName,
  setSummaryName,
  chatId,
  canEditSummary = true,
  counsellorId,
}) => {
  const { permissions, user } = useSelector((state: RootState) => state.user);

  const summaryNameRef = useRef<HTMLInputElement>(null);
  const [isRenaming, setIsRenaming] = useState<boolean>(false);

  const [updateCallInfo] = useUpdateCallInfoMutation();

  // Determine if editing should be allowed
  // If canEditSummary is explicitly false (from ConsolidatedLogs), respect that
  // Otherwise (true/undefined/default), check permissions AND counselor match
  const hasEditSummaryPermission = permissions?.includes(Permissions.EDIT_CALL_DETAILS);
  const isCounsellorForCall = Boolean(user?.userId && counsellorId && counsellorId === user.userId);
  const shouldAllowEdit =
    canEditSummary !== false && hasEditSummaryPermission && isCounsellorForCall;

  useEffect(() => {
    if (isRenaming) {
      summaryNameRef.current?.focus();
    }
  }, [isRenaming]);

  const debouncedUpdateSummaryName = useDebounce((summaryName: string) => {
    // Clearing the field is a step in renaming, not a rename to nothing: the
    // API requires a non-empty summaryName and answers 400 otherwise, so the
    // autosave waits for the replacement instead of saving the blank pause.
    if (!summaryName.trim()) return;
    updateCallInfo({
      chatId,
      callInfo: { summaryName },
    });
  }, 500);

  const handleSummaryNameChange = e => {
    const newSummaryName = e.target.value;
    setSummaryName(newSummaryName);
    try {
      debouncedUpdateSummaryName(newSummaryName);
    } catch (error) {
      logger.info(`Error updating call summary:, ${error}`);
    }
  };

  const onRenameButtonClick = () => {
    setIsRenaming(true);
  };

  return (
    <div className="flex items-center mb-4">
      <TextField
        inputRef={summaryNameRef}
        value={summaryName}
        onChange={handleSummaryNameChange}
        onBlur={() => setIsRenaming(false)}
        className={`${isRenaming ? "" : "pointer-events-none"} w-fit`}
        inputStyles={{ fontSize: "24px", fontWeight: "700", fontFamily: "IBM_Plex_Serif" }}
        showBorder={false}
      />
      {!isRenaming && shouldAllowEdit && (
        <Edit onClick={onRenameButtonClick} className="cursor-pointer" />
      )}
    </div>
  );
};

export default SummaryHeader;
