import { FC } from "react";

import { Divider, Tooltip } from "@mui/material";

import { useGetScenarioLanguagesQuery } from "@api";
import { CustomDropdownField, Button } from "@components";
import { ButtonVariant } from "@components/types";
import { REPORT_GENERATION_MESSAGES, TURNS_OPTIONS, toolTipStyles } from "@constants";
import { ScenarioLanguage } from "@types";

import { PromptConfigurationProps } from "./types";

const PromptConfiguration: FC<PromptConfigurationProps> = ({
  prompt,
  turns,
  onPromptChange,
  onLanguageChange,
  onTurnsChange,
  onButtonClick,
  buttonText,
  buttonDisabled = false,
  buttonTooltip,
  selectedLanguage,
}) => {
  const { data: languageOptions = [] } = useGetScenarioLanguagesQuery({
    active: true,
    hasVoices: true,
  }) as {
    data: ScenarioLanguage[];
  };

  const scenarioLanguage = languageOptions?.map(language => ({
    value: String(language.language_id),
    label: language.label,
  }));

  const defaultLanguage = selectedLanguage ||
    scenarioLanguage?.[0] || { value: "1", label: "English (India)" }; // assume english should be default language(with id=1)

  return (
    <div className="space-y-4">
      {/* Helper Agent Prompt */}
      <div className="flex flex-col border border-gray-200 rounded-lg pt-4">
        <label className="text-sm font-medium text-typography-900 mb-2 block px-4">
          {REPORT_GENERATION_MESSAGES.HELPER_AGENT_PROMPT}
        </label>
        <textarea
          value={prompt}
          onChange={e => onPromptChange?.(e.target.value)}
          className="px-4 w-full min-h-[320px] bg-white p-4 font-primary text-base resize-none focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          placeholder={REPORT_GENERATION_MESSAGES.PROMPT_PLACEHOLDER}
        />
        <Divider className="py-0 my-0" />
        {/* Language, Turns, and Button */}
        <div className="flex gap-4 items-end px-4 py-3 bg-neutral-50 rounded-bl-lg rounded-br-lg">
          <div className="flex-1">
            <CustomDropdownField
              options={scenarioLanguage}
              placeholder="Select language"
              customStyle={{ minWidth: "100px" }}
              defaultOption={defaultLanguage}
              onHandleSelect={option => onLanguageChange(option)}
            />
          </div>

          <div className="flex-1">
            <CustomDropdownField
              options={TURNS_OPTIONS}
              placeholder="Select turns"
              customStyle={{ minWidth: "100px" }}
              defaultOption={{
                value: String(turns),
                label: `${turns} turns`,
              }}
              onHandleSelect={option => onTurnsChange(Number(option.value))}
            />
          </div>

          <div className="flex-shrink-0">
            {buttonDisabled && buttonTooltip ? (
              <Tooltip title={buttonTooltip} placement="top" arrow slotProps={toolTipStyles}>
                <span>
                  <Button
                    variant={ButtonVariant.PRIMARY}
                    onClick={onButtonClick}
                    disabled={buttonDisabled}
                    className="px-6 py-2.5 h-[36px]"
                  >
                    {buttonText}
                  </Button>
                </span>
              </Tooltip>
            ) : (
              <Button
                variant={ButtonVariant.PRIMARY}
                onClick={onButtonClick}
                disabled={buttonDisabled}
                className="px-6 py-2.5 h-[36px]"
              >
                {buttonText}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromptConfiguration;
