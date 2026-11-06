import * as effect from "effect"
import type { RunnerMessage, RunRequest } from "./protocol"
import * as testApi from "./test-api"

const post = (message: RunnerMessage) => self.postMessage(message)

const format = (value: unknown): string => {
  if (typeof value === "string") return value
  if (value instanceof Error) return value.stack ?? value.message
  try {
    return JSON.stringify(value) ?? String(value)
  } catch {
    return String(value)
  }
}

const log = (...values: ReadonlyArray<unknown>) =>
  post({ _tag: "Log", line: values.map(format).join(" ") })
console.log = log
console.info = log
console.warn = log
console.error = log

const barrel = effect as unknown as Record<string, unknown>
const registry = new Map<string, unknown>()
;(globalThis as Record<string, unknown>).__tutorial = registry

const blobUrl = (source: string): string =>
  URL.createObjectURL(new Blob([source], { type: "text/javascript" }))

/** An ES module whose exports mirror the keys of a namespace object. */
const shim = (key: string, namespace: unknown): string => {
  registry.set(key, namespace)
  const lines = [`const ns = globalThis.__tutorial.get(${JSON.stringify(key)})`]
  Object.keys(namespace as object).forEach((name, index) => {
    lines.push(
      `const v${index} = ns[${JSON.stringify(name)}]`,
      `export { v${index} as ${JSON.stringify(name)} }`,
    )
  })
  return blobUrl(lines.join("\n"))
}

const shims = new Map<string, string>()

const resolveSpecifier = (specifier: string, mainUrl: string | undefined) => {
  if (specifier === "./main" && mainUrl !== undefined) return mainUrl
  const cached = shims.get(specifier)
  if (cached !== undefined) return cached
  const namespace =
    specifier === "effect"
      ? effect
      : specifier === "tutorial-test"
        ? testApi
        : specifier.startsWith("effect/")
          ? barrel[specifier.slice("effect/".length)]
          : undefined
  if (namespace === undefined)
    throw new Error(`Cannot find module '${specifier}'`)
  const url = shim(specifier, namespace)
  shims.set(specifier, url)
  return url
}

const IMPORT_SPECIFIER = /(\bfrom\s*|\bimport\s*)(["'])([^"']+)\2/g

const toModuleUrl = (code: string, mainUrl?: string): string =>
  blobUrl(
    code.replace(
      IMPORT_SPECIFIER,
      (_, keyword: string, quote: string, specifier: string) =>
        `${keyword}${quote}${resolveSpecifier(specifier, mainUrl)}${quote}`,
    ),
  )

self.onmessage = async (event: MessageEvent<RunRequest>) => {
  try {
    const mainUrl = toModuleUrl(event.data.main)
    await import(/* @vite-ignore */ toModuleUrl(event.data.test, mainUrl))
    post({ _tag: "Results", results: await testApi.runTests() })
  } catch (error) {
    post({ _tag: "Crash", message: format(error) })
  }
}
