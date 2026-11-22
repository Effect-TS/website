/**
 * The virtual workspace's conventions, shared with the Scratchpad client (apps/web/src/features/scratchpad/config.ts:
 * root URI file:///workspace, files such as src/main.ts).
 */

export const WORKSPACE_ROOT_PATH = "/workspace"
export const WORKSPACE_ROOT_URI = "file:///workspace"
export const WORKSPACE_TSCONFIG_PATH = `${WORKSPACE_ROOT_PATH}/tsconfig.json`
export const WORKSPACE_NODE_MODULES_PATH = `${WORKSPACE_ROOT_PATH}/node_modules`

/**
 * The tsconfig of the virtual workspace: packages/lsp-bridge/workspace.tsconfig.json (the server-hosted bridge's
 * config), including the @effect/language-service plugin entry that turns the Effect diagnostics on. A test keeps
 * the two in sync.
 */
export const WORKSPACE_TSCONFIG = {
  compilerOptions: {
    strict: true,
    exactOptionalPropertyTypes: true,
    noEmit: true,
    target: "ES2022",
    module: "ESNext",
    moduleResolution: "bundler",
    allowImportingTsExtensions: true,
    types: [],
    plugins: [{ name: "@effect/language-service" }],
  },
  include: ["**/*.ts", "**/*.tsx"],
  exclude: ["node_modules"],
} as const

/** "/workspace/src/main.ts" -> "file:///workspace/src/main.ts" (each segment percent-encoded). */
export const pathToFileUri = (path: string): string =>
  "file://" +
  path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")

/** "file:///workspace/src/main.ts" -> "/workspace/src/main.ts". */
export const fileUriToPath = (uri: string): string => {
  if (!uri.startsWith("file://")) throw new Error(`not a file URI: ${uri}`)
  const rest = uri.slice("file://".length)
  const path = rest.startsWith("/") ? rest : rest.slice(rest.indexOf("/"))
  return decodeURIComponent(path)
}

/** "src/main.ts" -> "/workspace/src/main.ts". */
export const workspacePath = (relative: string): string =>
  `${WORKSPACE_ROOT_PATH}/${relative.replace(/^\/+/, "")}`

/** "src/main.ts" -> "file:///workspace/src/main.ts". */
export const workspaceUri = (relative: string): string =>
  pathToFileUri(workspacePath(relative))
