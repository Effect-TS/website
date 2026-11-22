# Decide editor use cases, lightweight target, and multi-file scope

Type: grilling
Status: resolved
Blocked by: 01

## Question

What is this new, separate CodeMirror 6 editor for in v1, and what makes it succeed as a lightweight, fast-loading alternative to the existing Monaco playground?

Settle:

1. Primary use cases for v1: read-only docs samples with hover/diagnostics, an editable single-file scratchpad, an editable multi-file editor, or a combination.
2. Whether multi-file editing (requiring a custom `@codemirror/lsp-client` `Workspace` subclass) is in v1 or deferred.
3. Concrete bundle-size and time-to-interactive targets compared to the existing `@effect/monaco-editor` playground.
4. What criteria would later justify replacing Monaco with this editor.

## Answer

1. **Primary v1 use case and placement.** Ship a single standalone editable **Scratchpad** mounted at `/scratchpad`, unlisted from main site navigation, separate from `/play`, and without code execution. Keep the v1 page minimal: one preloaded default Effect TypeScript snippet, the CodeMirror 6 editor, and a compact LSP connection status indicator. Defer inline docs or blog embeds, URL sharing, localStorage persistence, and snippet or package pickers.
2. **Single-file scope.** Keep v1 single-file using `@codemirror/lsp-client`'s built-in `Workspace` with one `EditorView`. Defer multi-file editing and a custom `Workspace` subclass to v2.
3. **Performance targets.** Set no hard bundle-size cap for v1, while still measuring and tracking bundle size against `/play`'s 2.69 MB gzip static Monaco baseline. Hold v1 to two concrete latency targets: editable text in under 500 ms on a warm connection, and first LSP diagnostic and hover in under 1.5 s warm.
4. **Criteria for later replacing Monaco.** Replacing `/play` remains out of scope for this effort. Any future replacement requires four gates: multi-file editing wired to `/play`'s execution backend, full LSP parity on completions, hover, signature help, diagnostics, go-to-definition, and rename, working Effect-specific diagnostics, and a verified win over `/play` on both client transfer size and time-to-first-diagnostic.
