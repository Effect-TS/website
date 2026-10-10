# llms.txt / llms-full.txt

## Problem

Coding agents cannot discover or cheaply read effect.website content. Before this work only v4 docs had `.md` twins. No index, no bundle, no discovery header.

## Evidence

- llmstxt.org v2: `llms.txt` may live "at any path" and covers pages under it; the most specific file wins. Only the H1 is required. Links are `[name](url): notes`.
- Spec recommends `.md` twins and `Link: rel="describedby"` discovery.
- `llms-full.txt` is a convention (Mintlify + Anthropic): per page title, source URL, description, markdown.
- Mintlify truncates descriptions to 300 characters and skips hidden pages.

## Design

One scope per content source group. Each scope owns `<path>/llms.txt` and `<path>/llms-full.txt`. The root `/llms.txt` lists scopes. The root `/llms-full.txt` bundles scopes with `inRootFull: true`.

- `domain.ts`: `LlmsScope` (metadata + `sections: Effect`), `LlmsPage`, tagged errors.
- `content.ts`: `LlmsContent` service, the only door to site content. `astro-content.ts` is its live layer (`astro:content`). Tests provide a fake layer.
- `docs.ts`: docs source. Maps `LlmsContent` doc groups to scopes. Reuses `docsPageToMarkdown`.
- `render.ts`: pure renderers.
- `service.ts`: `Llms` service. Holds all scopes, resolves and renders them. `Llms.layer(site)`.
- `http.ts`: Astro endpoint helpers. Runs `Llms` effects with the live layer.
- Routes: `pages/llms*.txt.ts`, `pages/docs/[version]/llms*.txt.ts`.
- Versions come from `MARKDOWN_DOCS_VERSIONS` (v4 only), shared with the existing `.md` route.
- `public/_headers`: `Link: </llms.txt>; rel="describedby"` and `X-Llms-Txt` on `/docs/*`.

### Add a new source (changelog, tutorials, ...)

1. If it needs new content access, add a method to `LlmsContent` and implement it in `astro-content.ts`.
2. Write `features/llms/<source>.ts` that yields `LlmsScope[]` (pages need `title`, `path`, `markdown`). Spread it into `scopes` in `service.ts`.
3. Add route files for its `kind` (copy `pages/docs/[version]/llms.txt.ts`, change the kind).
4. Serve each page's `<path>.md` twin.

## Out of scope

- API reference. It is installed locally with the packages, so agents do not need it from the website.
- v3.
- `Accept: text/markdown` negotiation / `Vary: Accept`. The website Worker answers known static assets before Astro code runs, so only a Worker in front of `/docs/*` can do it. That turns free static-asset requests into billed Worker invocations. Agents use the `.md` URLs, `llms.txt` and the `Link` header instead.
