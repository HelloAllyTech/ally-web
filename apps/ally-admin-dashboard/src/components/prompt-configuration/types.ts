export interface PromptConfigurationProps {
  prompt: string;
  language: string;
  turns: number;
  onPromptChange?: (prompt: string) => void;
  onLanguageChange: (language: string) => void;
  onTurnsChange: (turns: number) => void;
  onButtonClick: () => void;
  buttonText: string;
  buttonDisabled?: boolean;
}
