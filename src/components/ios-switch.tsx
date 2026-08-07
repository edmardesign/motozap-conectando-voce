interface IOSSwitchProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  ariaLabel?: string;
}

export function IOSSwitch({ checked, onChange, disabled, ariaLabel }: IOSSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onChange}
      className="relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#000000] disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        backgroundColor: checked ? "#00FF1A" : "#3A4A52",
        boxShadow: checked ? "0 0 12px rgba(0,168,132,0.5)" : "inset 0 1px 2px rgba(0,0,0,0.4)",
      }}
    >
      <span
        className="absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-200"
        style={{ transform: checked ? "translateX(20px)" : "translateX(0)" }}
      />
    </button>
  );
}
