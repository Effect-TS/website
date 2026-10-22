# Agent instructions

## Code

- Write all logic and features with Effect: services (`Context.Service`), Layers, `Schema` for external data, `Schedule` for retries, Atom and atom-react on the client. Do not use bare `fetch`, `try/catch` or hand-rolled retries.
- Follow `apps/web/src/features/llms` and `apps/web/src/features/npm-downloads`: `domain.ts` (errors, types), a content or client service, a live layer, a thin adapter (`ManagedRuntime` for Astro).
- Keep pages thin. A page loads data once and composes section components. Components render; features hold logic.
- Use Astro content collections and loaders for data. Do not add one-off data files, optional fields or fallbacks only for the current data.
- Use design tokens, not `zinc-*`. Put repeated utility strings in a component, not in a CSS class. See `apps/web/DESIGN.md`.

## Tests

- Every feature has tests in `apps/web/test/features/<feature>`. Test services with fake Layers.
- Run tests from the repo root: `npx vp test run --project web`. Type check and lint: `npx vp lint apps/web`.

## Verify

- Check UI changes in the dev server that already runs for the worktree (`http://localhost:4321`). Take Playwright screenshots. Do not stop or restart the server.
