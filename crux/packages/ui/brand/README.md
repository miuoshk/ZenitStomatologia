# Pakiet marki w `@crux/ui`

Kopia 1:1 z `Materialy marki/` (+ geometria z `Crux - dla tworcow aplikacji/`). **Nie edytuj** plików tutaj — zmiany zaczynają się w źródle marki, potem:

```bash
pnpm --filter @crux/ui brand:sync
# lub: pnpm --filter @crux/ui brand:sync "/ścieżka/do/Materialy marki"
```

Skrypt liczy SHA-256 do `manifest.json`. `crux-doctor ui.brand-sync` (K10) porównuje sumy.

| Tu | Źródło |
|---|---|
| `tokens.css`, `zenit-theme.tailwind.css` | `Materialy marki/tokeny/` |
| `fonts/*` | `Materialy marki/font/` (SIL OFL — `docs/zaleznosci.md`) |
| `logo/crux/**`, `logo/zenit/**` | `Materialy marki/{crux,zenit}/logo/` (SVG) |
| `ryciny/`, `ryciny-48/` | `Materialy marki/ryciny-kohler/` |
| `../src/brand/crux-geometry.json` | `Crux - dla tworcow aplikacji/geometria/` |
| `../src/charts/arch-geometry.json`, `__reference__/` | geometria + `wykresy-przyklady/` |

Braki tokenów: `../src/tokens.extra.css` (do przeniesienia do Materialy marki).
