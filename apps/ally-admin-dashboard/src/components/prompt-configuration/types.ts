export interface PromptConfigurationProps {
  prompt: string;
  turns: number;
  onPromptChange?: (prompt: string) => void;
  onLanguageChange: (language: { value: string; label: string }) => void;
  onTurnsChange: (turns: number) => void;
  onButtonClick: () => void;
  buttonText: string;
  buttonDisabled?: boolean;
  buttonTooltip?: string;
  disabled?: boolean;
  selectedLanguage?: { value: string; label: string };
  /**
   * Human-readable name of the main-agent prompt variant the scenario
   * is currently configured to use (e.g. "Main Agent Prompt #2").
   * Rendered as a small read-only line above the helper-agent prompt
   * so the author can see which "skill" the next report will run on
   * without leaving the Report tab. Pass `undefined` to hide.
   *
   * NOTE: this reflects the variant CURRENTLY selected on the form, not
   * the variant the most recent report ran on. If the user has just
   * switched variants without saving, the line updates immediately.
   */
  currentMainPromptName?: string;
}
