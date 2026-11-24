# 04: Effect v3 support, version toggle and Reset

Type: task
Status: ready-for-agent
Blocked by:
Spec: ../spec.md

Today the Scratchpad is v4-only: v3 shares show an "Open in Playground" notice (`load.ts`, `LoadNoticeBar.tsx`). `/play` has `components/version-toggle.tsx`, `components/reset-button.tsx` and `confirm-dialog.tsx`; look at how it picks the v3 seed and stores the preference.

- [ ] A v3 seed next to the v4 one in `seed.ts` (same layout: `package.json` with v3 `effect` + `@effect/language-service`, `tsconfig.json` with the plugin, `dprint.json`, `src/main.ts`). Types come from the install, so nothing is bundled
- [ ] Remove the v3 "Open in Playground" path: v3 shares, `?code=` links and autosaves load directly. Keep any other notices that still apply
- [ ] A v3/v4 toggle in the editor header. Switching asks for confirmation, then resets to that version's seed; the choice is remembered (same storage approach as `/play`'s preference, separate key is fine) and used for the seed on a fresh visit
- [ ] A Reset button with a confirmation dialog, next to Share: back to the current version's seed, clear the Scratchpad autosave, remove any share hash from the URL. The Container reinstalls (the `package.json` change does that already)
- [ ] A shared confirm dialog component (Base UI `AlertDialog` or the existing `/play` one)
- [ ] Unit tests for version detection and seed selection; worker e2e for reset (edit, reset, confirm, seed content back, autosave cleared) and for a v3 share loading without the notice. Real-Container e2e: v3 seed installs and runs (`Effect.log` output appears)
