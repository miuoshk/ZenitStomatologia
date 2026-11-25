# @crux/ui

Lekki system designu Crux (React 19, Tailwind v4, tokeny CSS). Bez domyślnych komponentów shadcn.

## Zasady

- Kolory wyłącznie przez zmienne CSS (`var(--zenit-zielen)`, `bg-[var(--surface-card)]`). Zero HEX w TSX.
- Bursztyn (`--zenit-bursztyn`) tylko: Ginan w `CruxLogo`, focus ring, cień i kropka `LocationChip`.
- Liczby: `<Num />` (pl-PL, `tabular-nums`, `aria-label`).
- Importy względne bez rozszerzeń; JSON geometrii importowany bez `.js`.
- Każdy wykres: `role="img"` + opis, prop `asTable` zwraca odpowiednik w `TableView`.

## Jak dodać komponent

1. Utwórz `src/components/Nazwa.tsx` (lub dopisz do pliku grupy, np. `controls.tsx`). Użyj `cn` z `../lib/cn`, `cva` dla wariantów, `focusRing` z `./Button` dla elementów interaktywnych.
2. Wyeksportuj z `src/index.ts` (`export * from "./components/Nazwa";`).
3. Dodaj `Nazwa.stories.tsx` obok pliku (CSF3, `satisfies Meta`).
4. `pnpm --filter @crux/ui typecheck && pnpm --filter @crux/ui lint`.
5. Sprawdź w Storybooku (`pnpm --filter @crux/ui storybook`): ciemny motyw, viewport iPad, panel a11y.

## Użycie w aplikacji

```css
@import "tailwindcss";
@import "@crux/ui/tokens.css";
@import "@crux/config/tailwind-theme.css";
```

Zasoby marki (`brand/*`) udostępnij pod `/brand` (lub przekaż `basePath`). Czcionka: `src/fonts.css`.
