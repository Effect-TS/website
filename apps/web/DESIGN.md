# Design System

This document defines how to build the UI for this app. Blog, Docs, and API
Reference use the same design system. Follow these rules. Do not define colors,
typography, or recipes again for individual pages.

The design system uses:

- `src/styles/global.css` for tokens and typography.
- `src/components/ui` for React primitives.
- `src/layouts` for layouts.

## Rules

- **Use tokens. Do not use hard-coded values.** Use `bg-background
text-foreground border-border …`. Do not use `bg-white dark:bg-zinc-950`,
  hexadecimal values, or `zinc-*` classes.
- **Use one theme-aware value for each role.** A token changes for the light and
  dark themes. One token class replaces each `x dark:y` pair. If a token covers
  a color, do not add a `dark:` color variant.
- **Use a component for repeated styles. Do not use a CSS class for repeated
  styles.** Put the utility string in one Astro or React component. Do not create
  custom reuse classes or use `@apply`. The only exception is `.prose-effect`.
  It configures the typography plugin for markdown HTML that this app does not
  create.
- **Use a token opacity modifier for translucent surfaces.** Use `bg-card/40`.
  Do not use a literal `zinc-*` value or hexadecimal value. See
  [Translucent surfaces](#translucent-surfaces).

## Color tokens

These tokens change with the theme. Define them in `:root` and `.dark`. Expose
them with `@theme inline`. Their values use Tailwind's `zinc`, `red`, `emerald`,
and `sky` scales.

| Token                         | Use for                              | Light       | Dark        |
| ----------------------------- | ------------------------------------ | ----------- | ----------- |
| `background`                  | page background                      | white       | zinc-950    |
| `foreground`                  | headings, strong text, active        | zinc-900    | zinc-50     |
| `muted-foreground`            | secondary text, body text, labels    | zinc-500    | zinc-400    |
| `subtle-foreground`           | faint text, timestamps, inactive     | zinc-400    | zinc-500    |
| `card` / `popover`            | subtle surface (see below)           | zinc-50     | zinc-900    |
| `card-foreground`             | text on a card                       | zinc-900    | zinc-50     |
| `muted`                       | hover fill, subtle tint              | zinc-100    | zinc-800    |
| `accent`                      | selected or active fill              | zinc-200    | zinc-800    |
| `accent-foreground`           | text on accent                       | zinc-900    | zinc-50     |
| `secondary`                   | chip or segmented-control background | zinc-100    | zinc-800    |
| `secondary-foreground`        | text on secondary                    | zinc-900    | zinc-50     |
| `primary`                     | solid CTA, inverted                  | zinc-900    | zinc-50     |
| `primary-foreground`          | text on primary                      | zinc-50     | zinc-900    |
| `destructive`                 | error or danger                      | red-600     | red-500     |
| `destructive-foreground`      | text on destructive                  | white       | white       |
| `border`                      | thin borders                         | zinc-200    | zinc-800    |
| `border-strong` / `input`     | strong or hover border, inputs       | zinc-300    | zinc-700    |
| `ring` / `brand`              | focus ring, Effect brand accent      | emerald-500 | emerald-400 |
| `featured` / `featured-hover` | featured blog card (custom)          | #f7f7f8     | #141315     |

### Text hierarchy

Use three neutral text levels. Order them from most to least emphasis:
`text-foreground` → `text-muted-foreground` → `text-subtle-foreground`.

### Interactive states (navigation, TOC, breadcrumb, and links)

- Use `text-muted-foreground` for interactive text in its resting state.
- Use `text-foreground` for hover and active states.
- Use `bg-muted` for hover fill. Use `bg-accent` for selected and active fill.
- Set the active state from `aria-current`. Use variants such as
  `aria-[current=page]:bg-accent aria-[current=page]:text-foreground`. Do not
  toggle classes with JavaScript.

### Surfaces and borders

- Use `bg-background` for the page background.
- Use `bg-card` for an elevated or inset panel. Add opacity for a tint.
- Use `border-border` for a thin border. Use `border-border-strong` for a
  stronger or hover border.
- Use `bg-primary text-primary-foreground` for a solid CTA.

### Translucent surfaces

Use an opacity modifier with a token to create a subtle fill. Do not use a
second base color:

- Use `bg-card/40` when the base color is the same in both themes. This is equal
  to `bg-zinc-50/40 dark:bg-zinc-900/40`.
- Use `bg-card/40 dark:bg-card/30` when the opacity differs between themes.
- Use `bg-muted/40 dark:bg-card/40` when the base color differs between themes.

## Typography

- Use this exact class for rendered prose (Markdown or MDX):
  `class="prose prose-effect"`. Do not add other prose classes. Docs, API
  Reference, and API declaration comments use this class. They have the same
  body size, headings, spacing, and links. Do not add per-page prose overrides,
  such as `prose-sm`, `prose-p:text-[…]`, or `prose-headings:*`. Do not use
  `dark:prose-invert`. Change `.prose-effect` in `global.css` when the shared
  style must change. It is the single source.
- **Blog** uses one other reading style. It has larger body text, more space
  between elements, and pull quotes. Add `blog-article` to the shared class:
  `class="prose prose-effect blog-article"`. Put all blog overrides in
  `.blog-article` in `global.css`. Do not add inline overrides.
- **Links** in all areas use `text-foreground`. This color is in the same
  neutral family as body text, with higher contrast. It is darker in the light
  theme and lighter in the dark theme. Links have an underline by default.
  Remove the underline on hover. `.prose-effect` provides this style. Do not
  style links per page.
- **Eyebrow and kicker labels** use monospace, uppercase text with letter
  spacing. Use `<Eyebrow as="…" class="…">` from
  `src/components/ui/Eyebrow.astro`. Do not use a raw utility string.
- **Headings** use `text-foreground` and font weight 600. Use the following
  prose sizes: h1 `text-3xl` (md `text-4xl`), h2 `text-2xl`, and h3 `text-xl`.
  Docs and API Reference must use the same size at each level. A
  `prose prose-effect` block applies these styles automatically. In a
  `not-prose` block, such as an API declaration renderer, prose styles do not
  apply. The default heading color is `muted-foreground`. Set `text-foreground`
  and the matching `text-*` size explicitly. API symbol names (module and export
  titles) must also use `font-mono` to show code. Use sans-serif for all other
  headings.

### Type scale (`text-*`)

| Token  | Size     |     | Token | Size     |
| ------ | -------- | --- | ----- | -------- |
| `xs`   | 0.7rem   |     | `2xl` | 1.953rem |
| `sm`   | 0.875rem |     | `3xl` | 2.441rem |
| `base` | 1rem     |     | `4xl` | 3.052rem |
| `lg`   | 1.25rem  |     | `5xl` | 3.815rem |
| `xl`   | 1.563rem |     | `6xl` | 4.768rem |

`font-sans` uses Inter. `font-mono` uses JetBrains Mono.

Use these radius values: `rounded-sm` 4px · `md` 6px · `lg` 8px · `xl` 12px ·
`2xl` 16px · `3xl` 24px.

## Reuse and layout

- **React primitives** in `src/components/ui` use CVA and `cn`. Examples include
  `Button`, `SegmentedControl`, and `Link`. Extend these components. Do not
  restyle them.
- **Shared structure** belongs in a component. Put the utility string in that
  component once. Examples include `Eyebrow.astro` and
  `docs/DocsSidebarTree.astro`.
- **Sidebars** use small primitives in `components/ui/sidebar/`:
  `SidebarLink`, `SidebarGroup`, and `SidebarSectionLabel`.
  `SidebarLink` defines the resting, hover, and active link styles. The caller
  passes padding and font classes with `class`. The caller passes `data-*`
  attributes with a spread. `SidebarGroup` provides the `<details>` disclosure
  and chevron. `SidebarSectionLabel` provides the section label. Docs
  (`DocsSidebarTree`) and API Reference
  (`features/api-reference/ApiSidebarNav`) use these primitives to build their
  trees. Put section-specific UI, such as a version switch, package header, or
  active-item auto-scroll, around the tree. Do not put it in the tree
  primitives. Keep the primitives presentational.
- **The "On this page" TOC** uses the same components in every area.
  `components/ui/toc/` contains `TocLink` and `TableOfContents`. `TocLink`
  defines the resting, hover, and active link styles. The active state uses
  `aria-current="location"`. `TableOfContents` is a presentational container.
  It provides a label, a divider, and a flat or nested list from an `items` prop.
  It also contains the only scroll-spy `<script>` for the page. Docs, API
  Reference, and Blog render it. The shared shell supplies spacing for the
  Docs/API side rail. Blog passes its box classes with the container `class`.
  This is a plain Astro component, not a React island. Do not add a separate
  `IntersectionObserver` per page.
- **Documentation shell:** Docs and API Reference use one layout:
  `src/layouts/DocShell.astro`. It provides `sidebar`, default, `toc`, and
  `mobile-nav` slots. The shell controls the shared desktop side-rail position,
  scrolling, padding, and top spacing. Page slots must provide content. Do not
  repeat side-rail utility classes in page slots. Marketing and Blog use
  `PageLayout`. Both `DocShell` and `PageLayout` wrap `BaseLayout`.

## Do not

- Do not use `bg-white dark:bg-zinc-950`. Use `bg-background`.
- Do not use `text-zinc-900 dark:text-white`. Use `text-foreground`.
- Do not use an inline hexadecimal value or `zinc-*` class for a surface. Use a
  token. Add a token if no existing token has the correct meaning.
- Do not create a `.my-widget {}` class for repeated styles. Use a component that
  contains the utility classes.
- Do not use `prose … dark:prose-invert`. Use `prose prose-effect`.

## Areas not yet migrated

Blog, Docs, and API Reference use the tokens in their pages, shells, and
`features/api-reference` renderers. The following areas still use raw `zinc-*`
classes. You can migrate them later:

- **Shared UI** — `components/navigation/*`, `components/Footer.astro`, and the
  decorative grid backgrounds. The visual result is identical when they use the
  same tokens.
- **Marketing pages** — `index`, `myths`, `merch`, `brand-assets`, `effect-jobs`,
  `adoption-partners/*`, `community-hub`, `podcast/*`, and `404`.

### Values that are intentionally not neutral tokens

- `components/docs/Aside.astro` and `Badge.astro` use status colors
  (blue/green/red/…).
- `components/docs/Steps.astro` uses a custom mid-tone `zinc` value for the
  numbered circle. No semantic token can represent this value without changing
  its current use.
- The featured blog card and its image scrim use the custom `--featured` token
  and a fixed overlay.

Known issue not related to this document: `components/navigation/SearchDialog.tsx`
has TypeScript errors. Effect-atom types `registry` as `unknown`.
