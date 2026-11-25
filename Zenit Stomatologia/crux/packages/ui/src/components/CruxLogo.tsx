import type { SVGProps } from "react";
import geometry from "../brand/crux-geometry.json";
import { cn } from "../lib/cn";

export interface CruxLogoProps extends Omit<SVGProps<SVGSVGElement>, "viewBox"> {
  /** Wysokość znaku w px. */
  size?: number;
  /** Delikatne pojawienie się gwiazd (wyłączone przy prefers-reduced-motion). */
  animate?: boolean;
  /** Ginan w currentColor (druk jednobarwny). */
  monochrome?: boolean;
  title?: string;
}

const ENTRY_ORDER = ["Acrux", "Mimosa", "Gacrux", "Imai", "Ginan"] as const;

/** Znak Crux: Krzyż Południa. Gwiazdy currentColor, Ginan bursztynowa (jedyny akcent). */
export function CruxLogo({
  size = 32,
  animate = false,
  monochrome = false,
  title = "Crux",
  className,
  ...rest
}: CruxLogoProps) {
  const w = geometry.szerokosc;
  const h = geometry.wysokosc;
  return (
    <svg
      role="img"
      aria-label={title}
      viewBox={`0 0 ${String(w)} ${String(h)}`}
      width={size * w}
      height={size * h}
      className={cn("inline-block shrink-0", className)}
      {...rest}
    >
      <title>{title}</title>
      {geometry.gwiazdy.map((s) => {
        const gold = s.nazwa === geometry.zlota && !monochrome;
        const order = ENTRY_ORDER.indexOf(s.nazwa as (typeof ENTRY_ORDER)[number]);
        const delay = animate && order >= 0 ? order * 100 : 0;
        return (
          <circle
            key={s.nazwa}
            cx={s.cx}
            cy={s.cy}
            r={s.r}
            fill={gold ? "var(--zenit-bursztyn)" : "currentColor"}
            className={animate ? "crux-star-in" : undefined}
            style={animate ? { animationDelay: `${String(delay)}ms` } : undefined}
          />
        );
      })}
      {animate ? (
        <style>{`@keyframes crux-star-in{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:scale(1)}}.crux-star-in{transform-box:fill-box;transform-origin:center;opacity:0;animation:crux-star-in .12s ease-out forwards}@media (prefers-reduced-motion:reduce){.crux-star-in{opacity:1;animation:none}}`}</style>
      ) : null}
    </svg>
  );
}
