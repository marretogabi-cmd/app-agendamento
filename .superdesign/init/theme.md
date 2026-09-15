# Theme

## Part 1 — Compact token summary

- **Colors (light):** `--background` `#ffffff`, `--foreground` `#171717`
- **Colors (dark, prefers-color-scheme):** `--background` `#0a0a0a`, `--foreground` `#ededed`
- **Mapped Tailwind colors:** `background`, `foreground`
- **Fonts:** `--font-sans` → Geist (`--font-geist-sans`); `--font-mono` → Geist Mono (`--font-geist-mono`)
- **Body fallback:** Arial, Helvetica, sans-serif
- **Spacing / radius / shadows / breakpoints:** Tailwind CSS 4 defaults only (no `theme.extend`)
- **No brand palette** (no primary/accent tokens) — product colors live in the Superdesign design system, not in this starter theme

## Part 2 — Raw source

### `app/globals.css`

```css
@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
}
```

No `tailwind.config.ts` — Tailwind 4 via `@tailwindcss/postcss` only.
