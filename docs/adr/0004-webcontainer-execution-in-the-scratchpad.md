---
status: proposed
---

# WebContainer execution in the Scratchpad, with the page Workspace as source of truth

The Scratchpad, as the Playground's successor, runs code in a WebContainer that boots on page load. The in-page Workspace stays the source of truth: the Container is a one-way mirror fed by the same Workspace event stream that feeds the tsrs worker. Editing and language intelligence therefore never wait on the Container, and we drop the Playground's two-way sync (debounced model persistence, recursive `fs.watch`, full-tree rescans, generation bookkeeping, protected-node restoration). Runs are page-driven: when edits settle and tsrs reports no errors, the page restarts the program in the Container, which only executes. There is no second type checker in the Container.

## Considered options

- **Container FS as source of truth (the Playground's model, and what ADR 0002 anticipated with a WebContainer-backed `FileSystem` layer).** Rejected. It makes editing wait for boot and install, and it needs the two-way sync machinery behind most of the Playground's workarounds. Recursive watches on the Container root are also known to freeze it for over a minute after an install.
- **`tsc --watch` inside the Container decides when to run (the Playground's `/run`).** Rejected. It type-checks everything a second time, adds latency, and can disagree with the editor.

## Consequences

- **Types come from installed packages, not a bundled pack.** The tsrs engine stays bundled, but the `effect` declarations pack from ADR 0003 goes away. After each install, the host copies `package.json` and `*.d.ts` files from the Container's `node_modules` into the tsrs worker. Diagnostics stay hidden until the first copy lands. The editor and the runtime therefore always see the same library versions.
- **Two narrow back-flows from the Container.** `node_modules` declarations go to the tsrs worker only, and `package.json` returns to the Workspace after each install (`pnpm install -E` pins, and later `pnpm add` from the terminal). Nothing else flows Container → page.
- **One `tsconfig.json`.** It is a visible Workspace file read by both tsrs and the runtime, replacing the hidden `WORKSPACE_TSCONFIG` on this path. It carries the `@effect/language-service` plugin entry, which is injected when legacy Playground workspaces load.
- **`/scratchpad` becomes cross-origin isolated** (COOP `same-origin`, COEP `require-corp`; `credentialless` lacks Safari support), reversing the "no isolation needed" property noted in ADR 0003.
- **No `node_modules` snapshot caching.** `export()` omits lazily loaded files of 1 MB or more, and `mount()` drops executable bits. StackBlitz advises against it.
- **Supersedes ADR 0002.** With no WebContainer-backed `FileSystem` layer to swap in, the Workspace no longer needs `FileSystem.FileSystem`. It is backed by a plain in-memory map with incremental size accounting, and the `@effect-vfs` dependencies go away.
- **Runs use Node's type stripping** (`node src/main.ts` on the Container's Node 24), with a resolve hook that maps `.js` imports to `.ts`, pending a spike. `tsc` emit is the fallback.
- **`pnpm-lock.yaml` is kept.** It syncs back like `package.json` and travels in shares and autosave, so shared Workspaces install reproducibly.
- **The worker is the only LSP transport.** The server-hosted bridge from ADR 0001 type-checks against its own `node_modules` and cannot see the Container's, so it is removed rather than kept as a mode that cannot run code.
