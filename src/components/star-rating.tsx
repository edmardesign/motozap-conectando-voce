import { useState } from "react";

interface Props {
  value: number;
  onChange: (n: number) => void;
  size?: number;
  disabled?: boolean;
}

export function StarRating({ value, onChange, size = 44, disabled }: Props) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex gap-1 justify-center" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
          className="transition-transform active:scale-90 disabled:opacity-60"
          style={{ width: size, height: size }}
        >
          <svg viewBox="0 0 24 24" width={size} height={size}>
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              fill={n <= shown ? "var(--color-neon)" : "transparent"}
              stroke="var(--color-neon)"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ))}
    </div>
  );
}
