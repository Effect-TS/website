# 22: Add Scratchpad Playwright E2E suite and CI workflow gate

**What to build:** Add an end-to-end Playwright test suite for `/scratchpad` running against standalone `packages/lsp-bridge` and `astro dev` (with a `SCRATCHPAD_URL` override for `alchemy dev` or deployed previews), and wire it into `.github/workflows/check.yml` so pull requests verify live `tsrs` diagnostics, Effect quickinfo, and reconnect recovery without requiring Docker.

**Blocked by:** 18: Add WebSocket server, sandboxing, session limits, and live `tsrs` smoke tests to `packages/lsp-bridge`, 21: Build `/scratchpad` Astro page, CodeMirror 6 editor mount, and compact LSP status indicator

**Status:** ready-for-agent

- [ ] `apps/web/test/e2e/scratchpad.spec.ts` runs under a dedicated Playwright project/config that boots standalone `packages/lsp-bridge` and `astro dev` (via `PUBLIC_LSP_WS_URL`), and supports a `SCRATCHPAD_URL` override to target `alchemy dev` or a deployed preview
- [ ] E2E asserts that the CodeMirror editor is mounted and editable before LSP reaches `ready`
- [ ] E2E asserts that the preloaded Effect snippet renders inline Effect `TS377xxx` diagnostic squiggles, hover displays Effect quickinfo, and completions work on edits
- [ ] E2E asserts that dropping the WebSocket connection transitions the status indicator and recovers with resynced diagnostics on the live edited buffer
- [ ] `.github/workflows/check.yml` runs `vp test` (including `packages/lsp-bridge` unit + live `tsrs` smoke tests) and adds a dedicated Playwright E2E job running `scratchpad.spec.ts`
- [ ] Document the manual pre-deploy verification checklist (Docker `alchemy dev` container path, warm latency targets <500 ms editable and <1.5 s first diagnostic/hover, and Scratchpad client bundle size vs `/play`'s 2.69 MB gzip baseline)
