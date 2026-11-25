"use client";

import { USTAWIENIA_LABELS as L } from "@crux/i18n";
import { SegmentedControl } from "@crux/ui";
import { useState } from "react";

type Theme = "light" | "dark";

function readTheme(): Theme {
  return typeof document !== "undefined" && document.documentElement.dataset["theme"] === "dark"
    ? "dark"
    : "light";
}

/** Motyw: cookie `crux.theme` (czytane przez root layout → `data-theme`). */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(readTheme);
  return (
    <SegmentedControl<Theme>
      aria-label={L.profile.theme}
      value={theme}
      onChange={(next) => {
        setTheme(next);
        document.documentElement.dataset["theme"] = next;
        document.cookie = `crux.theme=${next}; path=/; max-age=31536000; SameSite=Lax`;
        try {
          localStorage.setItem("crux.theme", next);
        } catch {
          // brak localStorage — cookie wystarczy
        }
      }}
      options={[
        { value: "light", label: L.profile.themeLight },
        { value: "dark", label: L.profile.themeDark },
      ]}
    />
  );
}
