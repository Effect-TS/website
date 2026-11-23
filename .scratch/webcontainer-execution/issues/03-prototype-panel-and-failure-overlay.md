# 03: Prototype: bottom panel layout and failure overlay

Type: prototype
Status: resolved
Spec: ../spec.md

Build a throwaway visual prototype of the Scratchpad layout with execution, for the user to review. The user said their choice of overlay may change after seeing it.

- [ ] Explorer, editor, and a resizable, collapsible bottom panel with an "Output" tab (plus placeholder "Terminal" and "Traces" tabs)
- [ ] Output states: running with a Run header, a skipped Run ("2 type errors in src/main.ts"), stopped, plus the Stop and Restart controls
- [ ] Status badge phases: booting, installing, loading types, ready, running
- [ ] Non-blocking failure overlay in the output panel for an unsupported browser, a boot failure, an install failure showing pnpm output, and dependencies unavailable, each with Retry and help
- [ ] Show one modal-dialog variant next to it for comparison
- [ ] Record the user's choice under `## Answer`

## Prototype

Throwaway, uncommitted. Mock data only: no LSP, no WebContainer.

Run it:

```sh
vp -C apps/web exec astro dev --port 5183 --ignore-lock
```

Then open <http://localhost:5183/scratchpad-prototype>. Drop `--ignore-lock` if no other dev server is running in this worktree.

Each state lives in the URL, so any combination can be linked directly:
`?variant=inline|banner|modal&output=running|completed|skipped|stopped|empty&phase=booting|installing|loading-types|ready|running&failure=none|unsupported|boot|install|deps`.
The pink toolbar at the bottom switches the same things. ← and → cycle the overlay variant. The theme toggle in the site nav switches light and dark.

Three overlay variants:

- **B1 `inline`**: a card over the Output panel content only, with a dimmed backdrop. The editor stays usable.
- **B2 `banner`**: a strip pinned to the top of the Output panel. It covers nothing, and the pnpm output prints below it as ordinary output text. I added this because B1's card has little room in a short panel.
- **C `modal`**: the comparison variant, a dialog over the whole page with "Keep editing".

In every variant the failure also changes the status badge ("Install failed", "Can't run here", "Runtime failed", or "Types unavailable" in amber). Clicking the badge reopens a dismissed overlay.

Files:

- `apps/web/src/pages/scratchpad-prototype.astro`
- `apps/web/src/features/scratchpad/prototype/ScratchpadPrototype.tsx` (layout, mock editor/explorer, Output panel, status badge)
- `apps/web/src/features/scratchpad/prototype/failures.tsx` (failure copy, plus the B1, B2 and C presentations)
- `apps/web/src/features/scratchpad/prototype/PrototypeToolbar.tsx` (dev-only switcher)

Screenshots (1440×900) are in `../prototypes/03-panel-and-failure-overlay/screenshots/`:

- `00-with-toolbar-light.png`: running Output with the prototype toolbar visible
- `01-output-running-{light,dark}.png`, `02-output-completed-light.png`, `03-output-skipped-{light,dark}.png`, `04-output-stopped-dark.png`, `05-panel-collapsed-light.png`
- B1 card: `10-inline-unsupported-*`, `11-inline-boot-failed-*`, `12-inline-install-failed-*`, `13-inline-deps-unavailable-*` (light and dark)
- B2 banner: `15-banner-unsupported-*`, `16-banner-install-failed-*`, `17-banner-deps-unavailable-*` (light and dark)
- C modal: `20-modal-install-failed-{light,dark}.png`, `21-modal-unsupported-{light,dark}.png`, `22-modal-deps-unavailable-dark.png`
- Badge phases: `30-badge-{booting,installing,loading-types,ready,running}.png`

### Open questions

1. **Overlay: B1 card, B2 banner or C modal?** B2 fits short panels and keeps the pnpm output readable. B1 is more noticeable. C blocks the editor, which goes against "non-blocking" in the spec.
2. **"Dependencies unavailable" uses the same overlay as the hard failures.** Running still works in that case, so B1 dims valid output. Should it be a quieter treatment, such as the amber badge plus a banner only, whichever variant wins?
3. **Skipped Run: keep the previous output?** The prototype shows the skip notice and the clickable error locations, with the previous Run dimmed below them. The spec says each Run clears the output. Should a skipped Run clear it too?
4. **Should failures auto-expand a collapsed panel?** Right now the badge turns red and clicking it expands the panel. Nothing opens on its own.
5. **Badge wording and tone:** "Starting runtime", "Installing deps", "Loading types", "Ready", and "Running" in blue/sky so it reads differently from "Ready". Is one combined badge enough, or should the LSP and Container phases each get a badge? Hovering shows both phases.
6. **Restart when idle:** the prototype labels it "Restart", with a play icon when nothing is running. Should it be "Run" in that case?
7. **Terminal and Traces tabs:** should they show disabled with a "soon" tag, as here, or stay hidden until they ship?

## Answer

The user chose:

- **Failure overlay: B2 (banner).** A strip across the top of the Output panel that covers nothing, with Retry, help, and pnpm output printed below it as normal output.
- **"Dependencies unavailable"** (the install succeeded but types never reached the editor) gets a quiet treatment: the status badge plus one line in the output panel, with no strip.
- **Skipped Runs** keep the previous Run's output below the skip notice, dimmed, and also stop the previous process.

The prototype route was deleted after the decision. A few reference screenshots stay in `prototypes/03-panel-and-failure-overlay/screenshots/`.
