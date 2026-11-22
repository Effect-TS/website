// Nesting limits with the Effect pass on, and crash recovery. Needs the recovering host (startRecoveringServer).
// For each shape, depths go up until the instance dies (or a depth takes longer than `maxMs`). A death is recovered
// by the host (restart + replay); the probe then checks that the session still answers correctly (main.ts pull gives
// the same codes as before, hover works) and goes on with the next shape.
import { codemirrorCapabilities, makeClient } from "./client.js"
import { ROOT_URI, SOURCES, uriOf } from "./workspace.js"

const SHAPES = {
  // prototype 03's probe: nested array literal and parentheses
  brackets: {
    depths: [250, 500, 1000, 1500, 2000, 3000, 5000],
    make: (d) =>
      `export const deep = ${"[".repeat(d)}1${"]".repeat(d)}\nexport const deep2 = ${"(".repeat(d)}1${")".repeat(d)}\n`,
  },
  // Effect.gen inside Effect.gen inside ...
  nestedGen: {
    depths: [10, 25, 50, 75, 100, 150, 200, 300, 500],
    make: (d) => {
      let body = "return 1"
      for (let i = d - 1; i >= 0; i--)
        body = `const v${i} = yield* Effect.gen(function* () {\n${body}\n})\nreturn v${i}`
      return `import { Effect } from "effect"\nexport const deep = Effect.gen(function* () {\n${body}\n})\n`
    },
  },
  // x.pipe(Effect.map(...)).pipe(Effect.map(...))... : a left-deep call chain of length d
  pipeChain: {
    depths: [50, 100, 200, 400, 800, 1200, 1600, 2400],
    make: (d) =>
      `import { Effect } from "effect"\nexport const deep = Effect.succeed(0)${".pipe(Effect.map((n) => n + 1))".repeat(d)}\n`,
  },
  // one .pipe with d arguments split into groups of 9 (pipe's overloads stop at 20 arguments)
  pipeArgs: {
    depths: [50, 100, 200, 400, 800],
    make: (d) =>
      `import { Effect } from "effect"\nexport const deep = Effect.succeed(0)${Array.from({ length: Math.ceil(d / 9) }, (_, g) => `.pipe(${Array.from({ length: Math.min(9, d - g * 9) }, () => "Effect.map((n: number) => n + 1)").join(", ")})`).join("")}\n`,
  },
  // Effect.flatMap(e, (a0) => Effect.flatMap(e, (a1) => ... Effect.succeed(a)))
  flatMap: {
    depths: [10, 25, 50, 75, 100, 150, 200, 300, 500],
    make: (d) => {
      let body = `Effect.succeed(a${d - 1})`
      for (let i = d - 1; i >= 0; i--)
        body = `Effect.flatMap(Effect.succeed(${i === 0 ? 0 : `a${i - 1} + 1`}), (a${i}) =>\n${body})`
      return `import { Effect } from "effect"\nexport const deep = ${body}\n`
    },
  },
}

export async function runDeep(
  server,
  { log = () => {}, depths, shapes = Object.keys(SHAPES), maxMs = 30000 } = {},
) {
  const c = makeClient(server)
  const now = () => performance.now()
  const main = uriOf("src/main.ts")
  await c.request("initialize", {
    processId: null,
    clientInfo: { name: "@codemirror/lsp-client" },
    rootUri: ROOT_URI,
    capabilities: codemirrorCapabilities(),
  })
  await c.notify("initialized", {})
  for (const rel of ["src/main.ts", "src/greeter.ts", "src/app.ts"])
    await c.notify("textDocument/didOpen", {
      textDocument: {
        uri: uriOf(rel),
        languageId: "typescript",
        version: 1,
        text: SOURCES[rel],
      },
    })
  const baseline = (
    await c.request("textDocument/diagnostic", { textDocument: { uri: main } })
  ).result.items
    .map((d) => d.code)
    .join(",")
  const check = async () => {
    const t = now()
    const pr = await c.request("textDocument/diagnostic", {
      textDocument: { uri: main },
    })
    const pullMs = now() - t
    const h = await c.request("textDocument/hover", {
      textDocument: { uri: main },
      position: { line: 3, character: 7 },
    })
    const codes = (pr.result?.items ?? []).map((d) => d.code).join(",")
    return {
      pullMs,
      codes,
      sameAsBefore: codes === baseline,
      hover: (h.result?.contents?.value ?? "").slice(0, 80),
    }
  }
  const results = { baseline, shapes: {}, recoveries: [] }
  for (const name of shapes) {
    const shape = SHAPES[name]
    const rows = []
    for (const depth of depths ?? shape.depths) {
      const uri = uriOf(`src/deep_${name}_${depth}.ts`)
      const recBefore = server.recoveries.length
      const t = now()
      const open = await c.notify("textDocument/didOpen", {
        textDocument: {
          uri,
          languageId: "typescript",
          version: 1,
          text: shape.make(depth),
        },
      })
      const pr = await c.request("textDocument/diagnostic", {
        textDocument: { uri },
      })
      const h = pr.error
        ? null
        : await c.request("textDocument/hover", {
            textDocument: { uri },
            position: { line: name === "brackets" ? 0 : 1, character: 14 },
          })
      const ms = now() - t
      await c.notify("textDocument/didClose", { textDocument: { uri } })
      const crashed = server.recoveries.length > recBefore
      const row = {
        depth,
        ms: +ms.toFixed(0),
        openMs: +open.ms.toFixed(0),
        ok: !crashed && !pr.error,
        codes: (pr.result?.items ?? []).map((d) => d.code),
        error: pr.error?.message,
        hover: !!h?.result,
      }
      if (crashed) {
        row.recoveries = server.recoveries.slice(recBefore)
        results.recoveries.push(...row.recoveries)
        row.after = await check()
      }
      rows.push(row)
      log(`${name} ${depth}: ${JSON.stringify(row)}`)
      if (crashed || ms > maxMs) break
    }
    results.shapes[name] = rows
  }
  // Quarantine lift: a document whose text kills the parser stays open (quarantined) until the user edits it.
  if (server.quarantined) {
    const uri = uriOf("src/deep_lift.ts")
    const recBefore = server.recoveries.length
    await c.notify("textDocument/didOpen", {
      textDocument: {
        uri,
        languageId: "typescript",
        version: 1,
        text: SHAPES.brackets.make(20000),
      },
    })
    const during = await c.request("textDocument/diagnostic", {
      textDocument: { uri },
    })
    await c.notify("textDocument/didChange", {
      textDocument: { uri, version: 2 },
      contentChanges: [{ text: "export const ok: string = 1\n" }],
    })
    const after = await c.request("textDocument/diagnostic", {
      textDocument: { uri },
    })
    results.quarantineLift = {
      crashed: server.recoveries.length > recBefore,
      quarantinedPullError: during.error?.message,
      afterEditCodes: (after.result?.items ?? []).map((d) => d.code),
      afterEditError: after.error?.message,
    }
    await c.notify("textDocument/didClose", { textDocument: { uri } })
  }
  results.final = await check()
  results.memoryBytes = server.memoryBytes()
  results.summary = {
    baseline,
    limits: Object.fromEntries(
      Object.entries(results.shapes).map(([k, rows]) => [
        k,
        {
          maxOk: Math.max(0, ...rows.filter((r) => r.ok).map((r) => r.depth)),
          msAtMaxOk: rows.filter((r) => r.ok).at(-1)?.ms,
          firstFail: rows.find((r) => !r.ok)?.depth ?? null,
          failReason:
            rows.find((r) => !r.ok)?.recoveries?.[0]?.reason ??
            rows.find((r) => !r.ok)?.error,
        },
      ]),
    ),
    recoveries: results.recoveries.map((r) => ({
      ms: +r.ms.toFixed(0),
      instantiateMs: +r.instantiateMs.toFixed(0),
      replayMs: +r.replayMs.toFixed(0),
      method: r.method,
      attempt: r.attempt,
      quarantined: r.quarantined.length,
    })),
    afterRecovery: Object.values(results.shapes)
      .flat()
      .filter((r) => r.after)
      .map((r) => r.after),
    quarantineLift: results.quarantineLift,
    final: results.final,
  }
  return results
}
