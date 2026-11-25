/** TODO(K08): przenieść do @crux/ui CruxLogo. */
import geo from "./brand/crux-geometry.json";

type Props = {
  size?: number;
  monochrome?: boolean;
  title?: string;
  className?: string;
  /** Animacja wejścia (logowanie): gwiazdy od najjaśniejszej, Ginan ostatni ≤ 600 ms. */
  animate?: boolean;
};

const ENTRY_ORDER = ["Acrux", "Mimosa", "Gacrux", "Imai", "Ginan"] as const;

export function CruxLogo({
  size = 32,
  monochrome = false,
  title = "Crux",
  className,
  animate = false,
}: Props) {
  const width = size * (geo.szerokosc / geo.wysokosc);
  const viewBox = `0 0 ${String(geo.szerokosc)} ${String(geo.wysokosc)}`;

  return (
    <svg
      viewBox={viewBox}
      height={size}
      width={width}
      role="img"
      aria-label={title}
      className={className}
    >
      {geo.gwiazdy.map((s) => {
        const order = ENTRY_ORDER.indexOf(s.nazwa as (typeof ENTRY_ORDER)[number]);
        const delayMs = animate && order >= 0 ? order * 100 : 0;
        return (
          <circle
            key={s.nazwa}
            cx={s.cx}
            cy={s.cy}
            r={s.r}
            fill={s.nazwa === geo.zlota && !monochrome ? "var(--zenit-bursztyn)" : "currentColor"}
            style={
              animate
                ? {
                    opacity: 0,
                    animation: `crux-star-in 120ms ease-out ${String(delayMs)}ms forwards`,
                  }
                : undefined
            }
          />
        );
      })}
    </svg>
  );
}
