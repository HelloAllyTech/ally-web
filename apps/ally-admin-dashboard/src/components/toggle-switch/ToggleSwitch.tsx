export const ToggleSwitch: React.FC<{
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label?: string;
  switchStyles?: React.CSSProperties;
  disabled?: boolean;
}> = ({ enabled, onChange, label, switchStyles, disabled = false }) => (
  <button
    type="button"
    onClick={() => {
      if (!disabled) onChange(!enabled);
    }}
    disabled={disabled}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
      enabled ? "bg-success-200" : "bg-neutral-200"
    } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    aria-label={label ?? "Toggle"}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        enabled ? "translate-x-6" : "translate-x-1"
      }`}
      style={switchStyles}
    />
  </button>
);
