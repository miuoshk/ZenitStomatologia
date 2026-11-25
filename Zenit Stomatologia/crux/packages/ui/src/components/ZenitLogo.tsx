import type { ImgHTMLAttributes } from "react";

export type ZenitLogoVariant = "poziomy" | "znak";
export type ZenitLogoColor = "krem" | "zielen" | "bialy" | "czarny";

export interface ZenitLogoProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> {
  variant?: ZenitLogoVariant;
  color?: ZenitLogoColor;
  /** Bazowy URL do brand/ (zasoby kopiowane przez aplikację). */
  basePath?: string;
  alt?: string;
}

const files: Record<ZenitLogoVariant, (c: ZenitLogoColor) => string> = {
  poziomy: (c) => `logo/zenit/poziomy/zenit-poziomy-${c}.svg`,
  znak: (c) => `logo/zenit/znak-mikro/zenit-znak-mikro-${c}.svg`,
};

export function ZenitLogo({
  variant = "poziomy",
  color = "zielen",
  basePath = "/brand",
  alt = "zenit.stomatologia",
  height = 24,
  ...rest
}: ZenitLogoProps) {
  return <img src={`${basePath}/${files[variant](color)}`} alt={alt} height={height} {...rest} />;
}
