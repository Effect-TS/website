# Cloudflare Migration Papercuts

## Icon rendering failed under workerd

`astro-icon` worked in the Node-based Astro server but failed under Alchemy's
workerd development runtime. Its Iconify loader detected `fa7-brands` from
`apps/web/package.json` while resolving the collection from the workspace
process directory, producing a misleading missing-collection warning. Rendering
then imported `@iconify/utils`, whose CommonJS `debug` dependency was evaluated
without Node's `module` global and caused every layout importing the footer to
fail.

We removed the runtime Iconify integration and render generated SVG components
directly. The `icon-generator` Effect CLI produces exact, version-pinned
Iconify artwork ahead of time. This retains the original optimization of
removing the global Remix Icon font and CSS while keeping Iconify and CommonJS
code out of the Worker.

## Open Graph image generation required a Worker-native pipeline

The Node implementation generated PNGs with the native `@resvg/resvg-js`
binding and the default Satori runtime. Native Node bindings are unavailable in
Cloudflare Workers, and both the renderer WASM and Satori's Yoga WASM must be
bundled and initialized explicitly. The renderer also needs font URLs that
refer to assets emitted by Astro and are reachable from the incoming request's
origin.

We moved rendering into a Worker-compatible package using
`@resvg/resvg-wasm` and `satori/standalone`, import the WASM modules through
Vite, and cache their initialization. Fonts are resolved from Astro's emitted
font metadata and fetched through the Worker HTTP client. The dynamic
`/og/[...slug].png` endpoint remains server-rendered with `prerender = false`,
allowing arbitrary page slugs without enumerating them during the build.
