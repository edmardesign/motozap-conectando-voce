/**
 * IntergoLogoMotion — marca InterGO animada (estética Apple).
 * Haste preta sobe com micro-overshoot, detalhe verde encaixa em seguida.
 * Respeita prefers-reduced-motion (definido em styles.css).
 */
export interface IntergoLogoMotionProps {
  size?: number;
  className?: string;
}

export function IntergoLogoMotion({ size = 210, className = "" }: IntergoLogoMotionProps) {
  return (
    <div
      className={`grid place-items-center ${className}`}
      style={{ width: size, maxWidth: "72vw" }}
      aria-label="InterGO"
    >
      <svg
        viewBox="0 0 220 360"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="InterGO"
        className="block h-auto w-full"
      >
        <g className="ig-mark">
          <path
            className="ig-stem"
            d="M82 126 C82 96 103 78 138 78 L138 244 C138 285 116 310 82 310 Z"
            fill="#111111"
          />
          <path
            className="ig-accent"
            d="M101 75 C83 55 88 28 108 17 C128 6 153 18 157 40 C160 58 150 72 136 82 C125 90 113 96 100 101 C108 90 108 83 101 75 Z"
            fill="#35B84A"
          />
        </g>
      </svg>
    </div>
  );
}

export default IntergoLogoMotion;
