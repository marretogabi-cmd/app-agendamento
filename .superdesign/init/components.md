# Shared UI components

Framework: Next.js 16 (App Router) + React 19 + Tailwind CSS 4.
Component library: none (no `components/` directory, no shadcn/Radix/MUI).

There are no shared UI primitives yet. The only UI lives inline in `app/page.tsx` (Next.js create-next-app starter) using Tailwind utility classes.

When designing new product screens, treat primitives (Button, Card, Input, Select) as new — they should be invented from the design system, not reproduced from existing component source.
