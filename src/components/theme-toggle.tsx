"use client";

import { Moon, Sun } from "@phosphor-icons/react";

const THEME_KEY = "vulcan-theme";

export function ThemeToggle() {
  function toggleTheme() {
    const root = document.documentElement;
    const current =
      root.dataset.theme ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light");
    const next = current === "dark" ? "light" : "dark";

    root.dataset.theme = next;

    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {
      // The theme still changes for this page when storage is unavailable.
    }
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Switch color theme"
      title="Switch color theme"
      className="grid size-11 place-items-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-wash hover:text-ink"
    >
      <Sun aria-hidden="true" className="theme-icon-sun" size={19} weight="regular" />
      <Moon aria-hidden="true" className="theme-icon-moon" size={19} weight="regular" />
    </button>
  );
}
