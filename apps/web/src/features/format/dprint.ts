import { createStreaming, type Formatter } from "@dprint/formatter"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"

/**
 * dprint plugin loading shared by the Playground (`/play`) and the
 * Scratchpad. A `dprint.json` names plugins by their plugins.dprint.dev URL
 * (or the legacy `/vendor/dprint/plugins` path); they are fetched through the
 * same-origin `/api/dprint/plugins/:plugin` proxy.
 */

export interface FormatterPlugin {
  /** The plugin's config key in `dprint.json` (`typescript`, `json`, ...). */
  readonly language: string
  readonly formatter: Formatter
}

export class FormatterPluginLoadError extends Data.TaggedError(
  "FormatterPluginLoadError",
)<{
  readonly plugin: string
  readonly cause: unknown
}> {
  override get message(): string {
    return `Failed to load formatter plugin '${this.plugin}'. Verify that the URL points to an available dprint WASM plugin.`
  }
}

export class FormatterPluginUrlError extends Data.TaggedError(
  "FormatterPluginUrlError",
)<{
  readonly plugin: string
}> {
  override get message(): string {
    return `Invalid formatter plugin URL '${this.plugin}'. Use a fully qualified dprint plugin URL such as 'https://plugins.dprint.dev/json-0.23.0.wasm'.`
  }
}

const PLUGIN_URL_REGEX =
  /^(?:https:\/\/plugins\.dprint\.dev|\/vendor\/dprint\/plugins)\/([a-zA-Z0-9][a-zA-Z0-9._-]*\.wasm)$/

/** The same-origin proxy URL for a `dprint.json` plugin entry, or `null`. */
export const dprintPluginProxyUrl = (plugin: string): string | null => {
  const match = plugin.match(PLUGIN_URL_REGEX)
  return match ? `/api/dprint/plugins/${match[1]}` : null
}

/** Fetches and instantiates one `dprint.json` plugin entry. */
export const loadDprintPlugin = (
  plugin: string,
): Effect.Effect<
  FormatterPlugin,
  FormatterPluginUrlError | FormatterPluginLoadError
> => {
  const url = dprintPluginProxyUrl(plugin)
  if (url === null) {
    return Effect.fail(new FormatterPluginUrlError({ plugin }))
  }
  return Effect.tryPromise({
    try: () => createStreaming(fetch(url)),
    catch: (cause) => new FormatterPluginLoadError({ plugin, cause }),
  }).pipe(
    Effect.map((formatter) => ({
      language: formatter.getPluginInfo().configKey,
      formatter,
    })),
  )
}
