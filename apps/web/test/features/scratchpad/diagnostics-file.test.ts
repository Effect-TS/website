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
  })
})

describe("encodeDiagnosticsFile", () => {
  test("hashes each file's UTF-8 text with SHA-256, as the runner does", async () => {
    const json = await Effect.runPromise(
      encodeDiagnosticsFile({
        files: [
          { path: "src/main.ts", text: 'console.log("héllo ✓")\n' },
          { path: "package.json", text: "{}" },
        ],
        errors: [],
      }),
    )
    assert.deepEqual((JSON.parse(json) as { files: unknown }).files, {
      "package.json":
        "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a",
      "src/main.ts":
        "0628e65cd007b33d1667201e6e91c125a355b50bb5714441d16cdeaa55b73477",
    })
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

/**
 * Starts the writer on a fake Container; `check` is what the page's
 * diagnostics say right now (`None` while they aren't current).
 */
const startWriter = (options: {
  readonly state: DependencyState
  readonly check: () => Option.Option<DiagnosticsCheck>
}) =>
  Effect.gen(function* () {
    const backend = makeFakeContainerBackend()
    const container = yield* makeContainer(Effect.succeed(backend))
    const deps = yield* SubscriptionRef.make(options.state)
    const wakeups = yield* SubscriptionRef.make(0)
    yield* runDiagnosticsWriter({
      container,
      dependencies: {
        state: SubscriptionRef.get(deps),
        stateChanges: SubscriptionRef.changes(deps),
      } as unknown as DependenciesService,
      current: Effect.sync(options.check),
      wakeups: SubscriptionRef.changes(wakeups).pipe(Stream.drop(1)),
    }).pipe(Effect.forkScoped)
    yield* SubscriptionRef.update(wakeups, (n) => n + 1)
    const file = () => backend.hostFiles.get("diagnostics.json")
    return {
      read: () => JSON.parse(String(file())) as unknown,
      written: (what: string, predicate: (text: string) => boolean) =>
        Effect.promise(() =>
          until(() => file() !== undefined && predicate(String(file())), what),
        ),
    }
  })

const run = <A>(effect: Effect.Effect<A, unknown, Scope.Scope>) =>
  Effect.runPromise(Effect.scoped(effect))

describe("runDiagnosticsWriter", () => {
  test("tells the runner to wait while the dependencies install", () =>
    run(
      Effect.gen(function* () {
        const writer = yield* startWriter({
          state: initialDependencyState,
          check: () => Option.some({ files: [], errors: [] }),
        })
        yield* writer.written("a write", () => true)
        assert.deepEqual(writer.read(), {
          installing: true,
          files: {},
          errors: [],
        })
      }),
    ))

  test("once the Container can run code, writes the check as soon as the diagnostics are current", () =>
    run(
      Effect.gen(function* () {
        let check: Option.Option<DiagnosticsCheck> = Option.none()
        const writer = yield* startWriter({ state: READY, check: () => check })
        yield* Effect.sleep("120 millis")
        check = Option.some({
          files: [{ path: "src/main.ts", text: "1" }],
          errors: [error()],
        })
        yield* writer.written("the check", (text) => text.includes("TS2322"))
        assert.deepEqual(
          (
            writer.read() as {
              readonly errors: ReadonlyArray<{ readonly path: string }>
            }
          ).errors.map((e) => e.path),
          ["src/main.ts"],
        )
      }),
    ))
})
