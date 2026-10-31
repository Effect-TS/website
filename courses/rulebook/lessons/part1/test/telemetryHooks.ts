// Loaded with `--import` after tsx when the Part 1 tests run a lesson: every
// import that resolves to lessons/part1/Telemetry.ts gets TelemetryStub.ts
// instead.
import { registerHooks } from "node:module"
import * as NodePath from "node:path"
import { pathToFileURL } from "node:url"

const telemetry = pathToFileURL(NodePath.join(import.meta.dirname, "..", "Telemetry.ts")).href
const stub = pathToFileURL(NodePath.join(import.meta.dirname, "TelemetryStub.ts")).href

registerHooks({
  resolve: (specifier, context, nextResolve) => {
    const resolved = nextResolve(specifier, context)
    return resolved.url === telemetry ? { ...resolved, url: stub } : resolved
  }
})
