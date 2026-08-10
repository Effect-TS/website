# Design System

How to build UI in this app. Blog, Docs, and API Reference share **one** design
definition. Follow these rules — do not redefine colors, typography, or recipes
per page.

Everything lives in **`src/styles/global.css`** (tokens + typography), plus
`src/components/ui` (React primitives) and `src/layouts`.

## Golden rules

- **Consume tokens, never hardcode.** Use `bg-background text-foreground
border-border …`, never `bg-white dark:bg-zinc-950` or hex/`zinc-*`.
- **One theme-aware value per role.** A token already flips light/dark, so a
  single class replaces every `x dark:y` pair. Do not add `dark:` color variants
  for something a token covers.
- **Reuse = a component, not a CSS class.** Put the utility string in an
  Astro/React component once. No custom reuse-classes / `@apply` (the sole
  exception is `.prose-effect`, which configures the typography plugin over
  markdown HTML we don't author).
- **Translucency = opacity modifier on a token.** `bg-card/40`, never a literal
  `zinc-*`/hex. See [Translucent surfaces](#translucent-surfaces).

## Color tokens

Theme-aware; defined in `:root` / `.dark`, exposed via `@theme inline`. Values are
Tailwind's own `zinc`/`red`/`emerald`/`sky` scales.

| Token                     | Use it for                        | Light       | Dark        |
| ------------------------- | --------------------------------- | ----------- | ----------- |
| `background`              | page background                   | white       | zinc-950    |
| `foreground`              | headings, strong text, active     | zinc-900    | zinc-50     |
| `muted-foreground`        | secondary/body text, labels       | zinc-500    | zinc-400    |
| `subtle-foreground`       | faint text (timestamps, inactive) | zinc-400    | zinc-500    |
| `card` / `popover`        | subtle surface (see below)        | zinc-50     | zinc-900    |
| `card-foreground`         | text on a card                    | zinc-900    | zinc-50     |
| `muted`                   | hover fill / subtle tint          | zinc-100    | zinc-800    |
| `accent`                  | selected / active fill            | zinc-200    | zinc-800    |
| `accent-foreground`       | text on accent                    | zinc-900    | zinc-50     |
| `secondary`               | chip / segmented control bg       | zinc-100    | zinc-800    |
| `secondary-foreground`    | text on secondary                 | zinc-900    | zinc-50     |
| `primary`                 | solid CTA (inverted)              | zinc-900    | zinc-50     |
| `primary-foreground`      | text on primary                   | zinc-50     | zinc-900    |
| `destructive`             | error / danger                    | red-600     | red-500     |
| `destructive-foreground`  | text on destructive               | white       | white       |
| `border`                  | hairline borders                  | zinc-200    | zinc-800    |
| `border-strong` / `input` | stronger / hover border, inputs   | zinc-300    | zinc-700    |
| `ring` / `brand`          | focus ring, Effect brand accent   | emerald-500 | emerald-400 |
| `featured` / `-hover`     | featured blog card (bespoke)      | #f7f7f8     | #141315     |

### Text hierarchy

Three neutral levels, most → least emphasis:
`text-foreground` → `text-muted-foreground` → `text-subtle-foreground`.

### Interactive states (nav, TOC, breadcrumb, links)

- **Resting** interactive text → `text-muted-foreground`.
- **Hover / active** → `text-foreground`.
- **Hover fill** → `bg-muted`. **Selected / active fill** → `bg-accent`.
- Drive active state from `aria-current` with variants
  (`aria-[current=page]:bg-accent aria-[current=page]:text-foreground`), not JS
  class toggling.

### Surfaces & borders

- Page = `bg-background`. Elevated/inset panel = `bg-card` (add opacity for a
  tint). Hairline = `border-border`; stronger/hover border = `border-border-strong`.
- Solid CTA = `bg-primary text-primary-foreground`.

### Translucent surfaces

Reproduce subtle fills with an **opacity modifier on a token**, never a second base:

- Same base, translucent: `bg-card/40` (== `bg-zinc-50/40 dark:bg-zinc-900/40`).
- Different opacity per theme: `bg-card/40 dark:bg-card/30`.
- Different base per theme: `bg-muted/40 dark:bg-card/40`.

## Typography

- Rendered prose (markdown/MDX) is handled **one way**: `class="prose prose-effect"`
  and nothing else. Docs, API Reference, and the API declaration comments all use
  exactly this and therefore render **identically** (same body size, headings,
  spacing, links). ❌ Never add per-page prose overrides (`prose-sm`,
  `prose-p:text-[…]`, `prose-headings:*`, …) or `dark:prose-invert` — if the shared
  look must change, change `.prose-effect` in `global.css`, the single source.
- **Blog** is the one other reading context (editorial: larger body, wider rhythm,
  pull-quotes). Add `blog-article` on top: `class="prose prose-effect blog-article"`.
  All of its overrides live in `.blog-article` in `global.css` — never inline.
- **Links** (all areas): `foreground` — same neutral family as body but higher
  contrast (darker in light, lighter in dark) — underlined by default, underline
  removed on hover. Handled by `.prose-effect`; don't restyle per page.
- **Eyebrow / kicker label** (mono, uppercase, tracked): use
  `<Eyebrow as="…" class="…">` (`src/components/ui/Eyebrow.astro`), not a raw
  utility string.
- **Headings** are `foreground`, weight 600, on the prose scale: h1 `text-3xl`
  (md `text-4xl`), h2 `text-2xl`, h3 `text-xl`. Docs and API Reference must match
  at each level. Inside a rendered `prose prose-effect` block this is automatic.
  ⚠️ Inside a `not-prose` block (e.g. the API declaration renderers) headings do
  **not** inherit prose styles and fall back to the body color
  (`muted-foreground`) — so set `text-foreground` and the matching `text-*` size
  explicitly. API **symbol names** (module / export titles) add `font-mono` to
  signal code; all other headings are sans.

### Type scale (`text-*`)

| Token  | Size     |     | Token | Size     |
| ------ | -------- | --- | ----- | -------- |
| `xs`   | 0.7rem   |     | `2xl` | 1.953rem |
| `sm`   | 0.875rem |     | `3xl` | 2.441rem |
| `base` | 1rem     |     | `4xl` | 3.052rem |
| `lg`   | 1.25rem  |     | `5xl` | 3.815rem |
| `xl`   | 1.563rem |     | `6xl` | 4.768rem |

Fonts: `font-sans` = Inter, `font-mono` = JetBrains Mono.
Radius: `rounded-sm` 4px · `md` 6px · `lg` 8px · `xl` 12px · `2xl` 16px · `3xl` 24px.

## Reuse & layout

- **React primitives** (`src/components/ui`): built with CVA + `cn`
  (`Button`, `SegmentedControl`, `Link`, …). Extend these rather than restyling.
- **Shared structure** goes in a component holding the utility string once — e.g.
  `Eyebrow.astro`, `docs/DocsSidebarTree.astro`.
- **Sidebars** compose small primitives in `components/ui/sidebar/`:
  `SidebarLink` (owns the resting/hover/active link treatment; caller passes
  padding/font via `class` and `data-*` via spread), `SidebarGroup` (the
  `<details>` disclosure + chevron), `SidebarSectionLabel`. Docs
  (`DocsSidebarTree`) and API Reference (`features/api-reference/ApiSidebarNav`)
  both build their trees from these. Section-specific chrome (version switch,
  package header, active-item autoscroll) composes _around_ the tree, never into
  it — keep the primitives presentational.
- **"On this page" TOC** works the same way: `components/ui/toc/` has `TocLink`
  (the resting/hover/active-via-`aria-current="location"` link treatment) and
  `TableOfContents` (presentational container — label, divider, flat-or-nested
  list from an `items` prop — that also hosts the **one** scroll-spy `<script>`
  for the whole page). Docs, API Reference, and Blog all render it; the docs/API
  rail spacing is supplied by the shared shell, while the blog box is passed via
  the container `class`. It is a plain Astro component (no React island). Don't
  reintroduce a per-page IntersectionObserver.
- **Documentation shell**: Docs + API Reference use one layout,
  `src/layouts/DocShell.astro` (fills `sidebar` / default / `toc` / `mobile-nav`
  slots). The shell owns the shared desktop rail position, scrolling, padding,
  and top spacing, so page slots should provide content rather than repeat rail
  utility classes. Marketing/blog use `PageLayout`; both wrap `BaseLayout`.

## Don't

- ❌ `bg-white dark:bg-zinc-950` → ✅ `bg-background`
- ❌ `text-zinc-900 dark:text-white` → ✅ `text-foreground`
- ❌ inline hex / `zinc-*` for a surface → ✅ a token (add one if genuinely new)
- ❌ a new `.my-widget {}` class for reuse → ✅ a component holding utilities
- ❌ `prose … dark:prose-invert` → ✅ `prose prose-effect`

## Not yet on the system

On tokens: Blog, Docs, API Reference (pages, shells, and the
`features/api-reference` renderers). Still raw `zinc-*`, safe to migrate later:

- **Shared chrome** — `components/navigation/*`, `components/Footer.astro`, and
  the decorative grid backgrounds. Visually identical on the same tokens.
- **Marketing pages** — `index`, `myths`, `merch`, `brand-assets`, `effect-jobs`,
  `adoption-partners/*`, `community-hub`, `podcast/*`, `404`.

Intentionally **not** neutral tokens:

- `components/docs/Aside.astro`, `Badge.astro` — status colors (blue/green/red/…).
- `components/docs/Steps.astro` — numbered circle keeps a bespoke mid-tone zinc
  (no semantic token maps to it without inverting).
- Featured blog card + its image scrim — bespoke `--featured` token / fixed
  overlay.

Unrelated pre-existing issue: `components/navigation/SearchDialog.tsx` has
TypeScript errors (Effect-atom `registry` typed `unknown`).
