# Decide editor use cases, lightweight target, and multi-file scope

Type: grilling
Status: open
Blocked by: 01

## Question

What is this new, separate CodeMirror 6 editor for in v1, and what makes it succeed as a lightweight, fast-loading alternative to the existing Monaco playground?

Settle:
1. Primary use cases for v1: read-only docs samples with hover/diagnostics, an editable single-file scratchpad, an editable multi-file editor, or a combination.
2. Whether multi-file editing (requiring a custom `@codemirror/lsp-client` `Workspace` subclass) is in v1 or deferred.
3. Concrete bundle-size and time-to-interactive targets compared to the existing `@effect/monaco-editor` playground.
4. What criteria would later justify replacing Monaco with this editor.
