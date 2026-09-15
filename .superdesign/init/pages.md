# Page dependency trees

## `/` — Home (starter, not product)

```
app/page.tsx
  └── next/image (Next.js, skip)
app/layout.tsx
  └── app/globals.css
```

`app/page.tsx` has no local component imports. It inlines a centered starter column: Next.js logo, heading, paragraph with two outbound links, two CTA buttons (Deploy Now, Documentation).

This is not the booking UI. New product pages have no sibling feature to inherit from.
