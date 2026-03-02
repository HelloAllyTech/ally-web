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
}
