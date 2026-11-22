# Prototype bare CodeMirror 6 with @codemirror/lsp-client and vtsls worker

Type: prototype
Status: open
Blocked by: 01

## Question

Does a throwaway page in `apps/web` combining CodeMirror 6, `@codemirror/lsp-client`, and the vtsls Web Worker (wired without Effect) load cleanly in this repo's Astro/Vite setup and deliver completions, hover, and diagnostics?

Build the cheapest proof that the editor and worker run here, measure initial load/bundle weight against the existing Monaco playground, and note any Astro/Vite worker bundling quirks.
