import * as Module from "node:module"
console.log(
  JSON.stringify({
    prepareStackTrace: typeof Error.prepareStackTrace,
    sourceMapsEnabled: (process as any).sourceMapsEnabled,
    findSourceMap: typeof (Module as any).findSourceMap,
    registerHooks: typeof (Module as any).registerHooks,
    stackTraceLimit: Error.stackTraceLimit,
  }),
)
const orig = Error.prepareStackTrace
Error.prepareStackTrace = (_e, cs) =>
  cs
    .map(
      (c) => `${c.getFileName()}:${c.getLineNumber()}:${c.getColumnNumber()}`,
    )
    .join(" | ")
console.log("callsites expect line 13:", new Error().stack)
Error.prepareStackTrace = orig
