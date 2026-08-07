import { Link } from "@tanstack/react-router";

export function TermsCheckbox({
  checked,
  onChange,
  accent = "#00FF1A",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  accent?: string;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 w-5 h-5 rounded accent-current cursor-pointer flex-shrink-0"
        style={{ accentColor: accent }}
      />
      <span className="text-sm text-white/80 leading-snug">
        Li e aceito os{" "}
        <Link
          to="/termos"
          target="_blank"
          className="underline hover:text-white"
          style={{ color: accent }}
        >
          Termos de Uso
        </Link>{" "}
        e a{" "}
        <Link
          to="/privacidade"
          target="_blank"
          className="underline hover:text-white"
          style={{ color: accent }}
        >
          Política de Privacidade
        </Link>
        .
      </span>
    </label>
  );
}
