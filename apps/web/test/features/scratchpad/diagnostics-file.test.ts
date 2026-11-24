import * as Crypto from "node:crypto"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as SubscriptionRef from "effect/SubscriptionRef"
import { assert, describe, test } from "vite-plus/test"
import { makeContainer } from "../../../src/features/scratchpad/container.ts"
import {
  type DependenciesService,
  type DependencyState,
  initialDependencyState,
} from "../../../src/features/scratchpad/dependencies.ts"
import {
  type DiagnosticError,
  type DiagnosticsCheck,
  diagnosticErrorsOf,
  encodeDiagnosticsFile,
  formatTscError,
  runDiagnosticsWriter,
} from "../../../src/features/scratchpad/diagnostics-file.ts"
import { makeFakeContainerBackend } from "./fake-container.ts"

const plain = (text: string) =>
  // oxlint-disable-next-line no-control-regex
  text.replace(/\u001b\[[0-9;]*m/g, "")

const error = (overrides: Partial<DiagnosticError> = {}): DiagnosticError => ({
  path: "src/main.ts",
  line: 4,
  column: 7,
  endLine: 4,
  endColumn: 8,
  message: "Type 'string' is not assignable to type 'number'.",
  code: "TS2322",
  source: 'const n: number = "nope"',
  ...overrides,
})

describe("formatTscError", () => {
  test("prints the location, code and message, and a code frame underlining the range, like tsc", () => {
    assert.equal(
      plain(formatTscError(error())),
      [
        "src/main.ts:4:7 - error TS2322: Type 'string' is not assignable to type 'number'.",
        "",
        '4 const n: number = "nope"',
        "        ~",
        "",
      ].join("\r\n"),
    )
    assert.deepEqual(
      plain(
        formatTscError(
          error({
            line: 12,
            column: 3,
            endLine: 14,
            message: "first\nsecond",
            code: undefined,
            source: "\tfoo(bar)",
          }),
        ),
      ).split("\r\n"),
      [
        "src/main.ts:12:3 - error: first",
        "  second",
        "",
        "12 \tfoo(bar)",
        "   \t ~~~~~~~",
        "",
      ],
    )
  })

  test("without the source line it is just the header", () => {
    assert.equal(
      plain(formatTscError(error({ source: undefined }))),
      "src/main.ts:4:7 - error TS2322: Type 'string' is not assignable to type 'number'.\r\n",
    )
  })
})

describe("encodeDiagnosticsFile", () => {
  test("hashes each file's UTF-8 text as the runner does, and keeps the formatted errors", async () => {
    const text = 'console.log("héllo ✓")\n'
    const json = await Effect.runPromise(
      encodeDiagnosticsFile({
        files: [
          { path: "src/main.ts", text },
          { path: "package.json", text: "{}" },
        ],
        errors: [error()],
      }),
    )
    const parsed = JSON.parse(json) as {
      readonly files: Record<string, string>
      readonly errors: ReadonlyArray<{
        readonly path: string
        readonly line: number
        readonly column: number
        readonly text: string
      }>
    }
    assert.deepEqual(parsed.files, {
      "package.json": Crypto.createHash("sha256").update("{}").digest("hex"),
      "src/main.ts": Crypto.createHash("sha256")
        .update(Buffer.from(text, "utf8"))
        .digest("hex"),
    })
    assert.deepEqual(
      parsed.errors.map(({ path, line, column }) => ({ path, line, column })),
      [{ path: "src/main.ts", line: 4, column: 7 }],
    )
    assert.equal(parsed.errors[0]!.text, formatTscError(error()))
  })
})

describe("diagnosticErrorsOf", () => {
  test("keeps errors only, 1-based, sorted by path and position", () => {
    const range = (line: number, character: number) => ({
      start: { line, character },
      end: { line, character: character + 1 },
    })
    assert.deepEqual(
      diagnosticErrorsOf(
        new Map([
          [
            "file:///workspace/src/main.ts",
            [
              { severity: 2, message: "warning", range: range(0, 0) },
              {
                severity: 1,
                message: "second",
                code: 2769,
                range: range(6, 34),
              },
              { severity: 1, message: "first", range: range(5, 2) },
              { severity: 3, message: "info", range: range(1, 0) },
              { severity: 4, message: "hint", range: range(1, 0) },
            ],
          ],
          [
            "file:///workspace/src/a.ts",
            [{ severity: 1, message: "in a", range: range(0, 0) }],
          ],
        ]),
        "file:///workspace",
        (path, line) => (path === "src/main.ts" ? `line ${line}` : undefined),
      ),
      [
        {
          path: "src/a.ts",
          line: 1,
          column: 1,
          endLine: 1,
          endColumn: 2,
          message: "in a",
          code: undefined,
          source: undefined,
        },
        {
          path: "src/main.ts",
          line: 6,
          column: 3,
          endLine: 6,
          endColumn: 4,
          message: "first",
          code: undefined,
          source: "line 6",
        },
        {
          path: "src/main.ts",
          line: 7,
          column: 35,
          endLine: 7,
          endColumn: 36,
          message: "second",
          code: "TS2769",
          source: "line 7",
        },
      ],
    )
  })
})

const READY: DependencyState = {
  boot: { _tag: "ready" },
  install: { _tag: "succeeded" },
  types: { _tag: "mounted", info: undefined },
  timedOut: false,
  diagnosticsVisible: true,
} as unknown as DependencyState

const until = async (predicate: () => boolean, what: string) => {
  const started = Date.now()
  while (!predicate()) {
    if (Date.now() - started > 2_000) assert.fail(`Timed out: ${what}`)
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
}

const sleep = (ms: number) =>
  Effect.promise(() => new Promise((resolve) => setTimeout(resolve, ms)))

const run = <A>(effect: Effect.Effect<A, unknown, Scope.Scope>) =>
  Effect.runPromise(Effect.scoped(effect))

describe("runDiagnosticsWriter", () => {
  test("writes the file once the Container can run code and the check is current, and again only when it changes", () =>
    run(
      Effect.gen(function* () {
        const backend = makeFakeContainerBackend()
        const container = yield* makeContainer(Effect.succeed(backend))
        const deps = yield* SubscriptionRef.make(initialDependencyState)
        const dependencies = {
          state: SubscriptionRef.get(deps),
          stateChanges: SubscriptionRef.changes(deps),
        } as unknown as DependenciesService
        let check: Option.Option<DiagnosticsCheck> = Option.some({
          files: [{ path: "src/main.ts", text: "1" }],
          errors: [],
        })
        const wakeups = yield* SubscriptionRef.make(0)
        const wake = SubscriptionRef.update(wakeups, (n) => n + 1)
        let writes = 0
        const original = backend.writeHostDirFile
        ;(backend as { writeHostDirFile: typeof original }).writeHostDirFile =
          async (name, content) => {
            if (name === "diagnostics.json") writes++
            await original(name, content)
          }
        yield* runDiagnosticsWriter({
          container,
          dependencies,
          current: Effect.sync(() => check),
          wakeups: SubscriptionRef.changes(wakeups).pipe(Stream.drop(1)),
        }).pipe(Effect.forkScoped)

        // Installing: the file tells the runner to wait.
        yield* wake
        yield* Effect.promise(() =>
          until(() => backend.hostFiles.has("diagnostics.json"), "a write"),
        )
        assert.deepEqual(
          JSON.parse(String(backend.hostFiles.get("diagnostics.json"))),
          { installing: true, files: {}, errors: [] },
        )
        writes = 0

        yield* SubscriptionRef.set(deps, READY)
        yield* Effect.promise(() => until(() => writes === 1, "the check"))
        const first = JSON.parse(
          String(backend.hostFiles.get("diagnostics.json")),
        ) as { readonly files: Record<string, string> }
        assert.deepEqual(Object.keys(first.files), ["src/main.ts"])
        assert.equal(writes, 1)

        // Same check: no new write.
        yield* wake
        yield* sleep(50)
        assert.equal(writes, 1)

        // Not current: it waits, polling, until it is.
        check = Option.none()
        yield* wake
        yield* sleep(120)
        assert.equal(writes, 1)
        check = Option.some({
          files: [{ path: "src/main.ts", text: "2" }],
          errors: [error()],
        })
        yield* Effect.promise(() => until(() => writes === 2, "the new check"))
        yield* sleep(20)
        const second = JSON.parse(
          String(backend.hostFiles.get("diagnostics.json")),
        ) as { readonly errors: ReadonlyArray<unknown> }
        assert.lengthOf(second.errors, 1)

        // A reinstall (a package.json edit): the runner waits again.
        yield* SubscriptionRef.set(deps, initialDependencyState)
        yield* Effect.promise(() =>
          until(
            () =>
              String(backend.hostFiles.get("diagnostics.json")).includes(
                '"installing":true',
              ),
            "the installing marker",
          ),
        )
      }),
    ))
})
