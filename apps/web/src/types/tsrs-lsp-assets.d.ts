// Provided by src/features/scratchpad/tsrs-lsp-assets-plugin.ts.
declare module "virtual:tsrs-lsp-assets" {
  /** The Effect-patched tsrs language server module (application/wasm). */
  export const wasmUrl: string
  /** Raw module size, from the package manifest. */
  export const wasmBytes: number | null
  /** Where the upstream license files are served. */
  export const licensesUrl: string
}
