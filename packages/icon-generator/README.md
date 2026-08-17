# Icon Generator

Generates static SVG assets from the pinned Font Awesome 7 Brands Iconify
collection.

The website previously rendered Iconify icons through `astro-icon`. Under the
Cloudflare workerd runtime, that integration loaded CommonJS dependencies that
require Node globals such as `module`. Generating SVGs ahead of time keeps
Iconify tooling in this Node-only CLI and leaves the Worker with ordinary static
SVG imports.

## Usage

Generate every icon currently used by the website:

```sh
vp run icons:generate
```

Generate selected icons:

```sh
vp exec icon-generator generate \
  fa7-brands:github \
  fa7-brands:discord \
  --output apps/web/src/assets/icons
```

Each identifier must use the `fa7-brands:<name>` format. The command above
writes:

```text
apps/web/src/assets/icons/fa7-brands/github.svg
apps/web/src/assets/icons/fa7-brands/discord.svg
```

Generated SVGs are committed to the repository so website builds remain
offline and deterministic. To add a website icon, add its identifier to the
`icons:generate` task in `vite.config.ts`, run `vp run icons:generate`, and
import the generated SVG from `@/assets/icons/fa7-brands/`.
