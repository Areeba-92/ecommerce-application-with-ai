"use client";

import { useEffect, useState } from "react";
import { SunIcon, MoonIcon } from "@/components/Icons";

type Theme = "light" | "dark";
const STORAGE_KEY = "haven-theme";

/**
 * Theme is OS-driven by default — `@media (prefers-color-scheme: dark)` in
 * globals.css handles that with no JS, so most visitors never see a flash.
 * This toggle only writes an explicit `data-theme` override, which the
 * stylesheet gives higher precedence than the media query in both directions.
 *
 * Deliberately no inline <script> in <head>: that would mean
 * dangerouslySetInnerHTML, and the only visitors who'd benefit are those who
 * chose a theme opposite to their OS setting — who see one brief frame.
 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      // Private mode / blocked storage — fall through to the OS preference.
    }

    const initial: Theme =
      stored === "light" || stored === "dark"
        ? stored
        : window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";

    // Intentional: the theme is unknowable during SSR, so it is read once after
    // mount (reading it during render would cause a hydration mismatch).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(initial);
    if (stored === "light" || stored === "dark") {
      document.documentElement.dataset.theme = stored;
    }
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not persisting is acceptable; the page still switches.
    }
  }

  // Render a stable placeholder until mounted so the server and client markup
  // agree — the theme isn't knowable during SSR.
  if (theme === null) {
    return <span className="navbar__icon-btn" aria-hidden="true" />;
  }

  return (
    <button
      type="button"
      className="navbar__icon-btn"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
