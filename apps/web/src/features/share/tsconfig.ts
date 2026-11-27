import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import { normalizeWorkspace, type Workspace } from "./workspace"

const languageServicePlugin = "@effect/language-service"

/**
 * Effect's `unstableApiUsage` rule warns on every unstable module the
 * Playground templates themselves import, so the Scratchpad turns it off
 * unless the config already says otherwise.
 */
const unstableApiUsageRule = "unstableApiUsage"

const isLanguageServicePlugin = (
  plugin: unknown,
): plugin is Record<string, unknown> =>
  Predicate.isObject(plugin) && plugin["name"] === languageServicePlugin

const hasUnstableApiSeverity = (plugin: Record<string, unknown>) =>
  Predicate.isObject(plugin["diagnosticSeverity"]) &&
  unstableApiUsageRule in plugin["diagnosticSeverity"]

const withUnstableApiOff = (
  plugin: Record<string, unknown>,
): Record<string, unknown> =>
  hasUnstableApiSeverity(plugin)
    ? plugin
    : {
        ...plugin,
        diagnosticSeverity: {
          ...(Predicate.isObject(plugin["diagnosticSeverity"])
            ? plugin["diagnosticSeverity"]
            : {}),
          [unstableApiUsageRule]: "off",
        },
      }

/**
 * Removes comments and trailing commas outside string literals, turning the
 * JSONC that `tsconfig.json` allows into plain JSON.
 */
function stripJsonc(content: string): string {
  let out = ""
  let index = 0
  while (index < content.length) {
    const char = content[index]!
    if (char === '"') {
      const start = index
      index++
      while (index < content.length && content[index] !== '"') {
        index += content[index] === "\\" ? 2 : 1
      }
      index++
      out += content.slice(start, index)
      continue
    }
    if (char === "/" && content[index + 1] === "/") {
      while (index < content.length && content[index] !== "\n") index++
      continue
    }
    if (char === "/" && content[index + 1] === "*") {
      const end = content.indexOf("*/", index + 2)
      index = end === -1 ? content.length : end + 2
      continue
    }
    out += char
    index++
  }
  return out.replace(/,(\s*[}\]])/g, "$1")
}

function parseJsonc(content: string): unknown {
  try {
    return JSON.parse(content)
  } catch {
    try {
      return JSON.parse(stripJsonc(content))
    } catch {
      return undefined
    }
  }
}

/**
 * Adds the `@effect/language-service` plugin entry (keeping other plugins and
 * an existing entry's options) with the `unstableApiUsage` diagnostic off
 * unless the entry already sets it, and `verbatimModuleSyntax: true`, which
 * makes tsrs flag type-only imports that would crash under Node's type
 * stripping.
 *
 * Returns `undefined` when nothing changes or the content isn't a JSON
 * object, so invalid mid-edit configs are left as they are. Comments in a
 * JSONC config are dropped when it has to be rewritten.
 */
export function patchScratchpadTsConfig(content: string): string | undefined {
  const parsed = parseJsonc(content)
  if (!Predicate.isObject(parsed) || Array.isArray(parsed)) {
    return undefined
  }
  const compilerOptions = Predicate.isObject(parsed["compilerOptions"])
    ? parsed["compilerOptions"]
    : {}
  const plugins: ReadonlyArray<unknown> = Array.isArray(
    compilerOptions["plugins"],
  )
    ? compilerOptions["plugins"]
    : []
  const hasPlugin = plugins.some(isLanguageServicePlugin)
  const pluginsSettled = plugins.every(
    (plugin) =>
      !isLanguageServicePlugin(plugin) || hasUnstableApiSeverity(plugin),
  )
  if (
    hasPlugin &&
    pluginsSettled &&
    plugins === compilerOptions["plugins"] &&
    compilerOptions["verbatimModuleSyntax"] === true
  ) {
    return undefined
  }
  return JSON.stringify(
    {
      ...parsed,
      compilerOptions: {
        ...compilerOptions,
        plugins: hasPlugin
          ? plugins.map((plugin) =>
              isLanguageServicePlugin(plugin)
                ? withUnstableApiOff(plugin)
                : plugin,
            )
          : [...plugins, withUnstableApiOff({ name: languageServicePlugin })],
        verbatimModuleSyntax: true,
      },
    },
    undefined,
    2,
  )
}

/**
 * Loads a share-format Workspace for the Scratchpad: the Playground's legacy
 * repairs from `normalizeWorkspace`, then the root `tsconfig.json` patch from
 * `patchScratchpadTsConfig`. The Playground doesn't apply the patch.
 */
export function normalizeScratchpadWorkspace(workspace: Workspace): Workspace {
  const normalized = normalizeWorkspace(workspace)
  return normalized.findFile("tsconfig.json").pipe(
    Option.flatMap(([file]) =>
      Option.fromNullishOr(patchScratchpadTsConfig(file.initialContent)).pipe(
        Option.map((patched) =>
          normalized.replaceNode(file, file.withContent(patched)),
        ),
      ),
    ),
    Option.getOrElse(() => normalized),
  )
}
