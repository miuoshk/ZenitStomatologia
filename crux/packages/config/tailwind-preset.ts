/**
 * Tailwind v4: mapowanie zmiennych CSS na @theme.
 * Użycie w pliku CSS aplikacji:  @import "@crux/config/tailwind-theme.css";
 * Ten moduł eksportuje ten sam blok jako string (dla narzędzi) oraz mapę tokenów.
 */
export const cruxThemeMap = {
  "--color-butelka": "var(--zenit-butelka)",
  "--color-zielen": "var(--zenit-zielen)",
  "--color-krem": "var(--zenit-krem)",
  "--color-kosc": "var(--zenit-kosc)",
  "--color-bursztyn": "var(--zenit-bursztyn)",
  "--color-cegla": "var(--zenit-cegla)",
  "--color-szron": "var(--zenit-szron)",
  "--color-mgla": "var(--zenit-mgla)",
  "--color-app": "var(--surface-app)",
  "--color-card": "var(--surface-card)",
  "--color-sunken": "var(--surface-sunken)",
  "--color-fg": "var(--text-primary)",
  "--color-fg-2": "var(--text-secondary)",
  "--color-muted": "var(--text-muted)",
  "--color-line": "var(--border)",
  "--color-ring": "var(--focus-ring)",
  "--color-dobrze": "var(--status-dobrze)",
  "--color-dobrze-tlo": "var(--status-dobrze-tlo)",
  "--color-uwaga": "var(--status-uwaga)",
  "--color-uwaga-tlo": "var(--status-uwaga-tlo)",
  "--color-powazne": "var(--status-powazne)",
  "--color-powazne-tlo": "var(--status-powazne-tlo)",
  "--color-krytyczne": "var(--status-krytyczne)",
  "--color-krytyczne-tlo": "var(--status-krytyczne-tlo)",
  "--font-sans": "var(--font-sans)",
  "--radius-pole": "var(--radius-pole)",
  "--radius-input": "var(--radius-input)",
  "--radius-karta": "var(--radius-karta)",
  "--radius-pelne": "var(--radius-pelne)",
} as const;

export const cruxThemeCss: string = `@theme {\n${Object.entries(cruxThemeMap)
  .map(([k, v]) => `  ${k}: ${v};`)
  .join("\n")}\n}\n`;
