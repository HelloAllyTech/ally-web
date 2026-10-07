export const ToggleSwitch: React.FC<{
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label?: string;
  switchStyles?: React.CSSProperties;
}> = ({ enabled, onChange, label, switchStyles }) => (
  <button
    type="button"
    onClick={() => onChange(!enabled)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none max-md:before:absolute max-md:before:-inset-y-2.5 max-md:before:inset-x-0 max-md:before:content-[''] ${
      enabled ? "bg-success-200" : "bg-neutral-200"
    }`}
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
