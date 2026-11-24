import { decodeTypesPack } from "@website/tsrs-lsp-wasm"
import * as Deferred from "effect/Deferred"
import type * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Stream from "effect/Stream"
import { TestClock } from "effect/testing"
import { execFileSync } from "node:child_process"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { assert, describe, test } from "vite-plus/test"
import {
  type ContainerBootError,
  ContainerBootFailed,
  type ContainerService,
  makeContainer,
  mirrorWorkspace,
} from "../../../src/features/scratchpad/container.ts"
import {
  type FakeContainerBackend,
  type FakeSpawnCall,
  type FakeSpawnResult,
  makeFakeContainerBackend,
} from "./fake-container.ts"
import {
  containerPhaseOf,
  type DependenciesService,
  type DependencyState,
  makeDependencies,
} from "../../../src/features/scratchpad/dependencies.ts"
import type { TypesMountResult } from "../../../src/features/scratchpad/worker-protocol.ts"
import type { LspWorkspaceMirrorService } from "../../../src/features/scratchpad/worker-transport.ts"
import {
  makeMemoryWorkspace,
  type WorkspaceService,
} from "../../../src/features/scratchpad/workspace.ts"

const PACKAGE_JSON = '{\n  "dependencies": { "effect": "latest" }\n}'
const SEED = {
  "package.json": PACKAGE_JSON,
  "tsconfig.json": "{}",
  "src/main.ts": "console.log(1)",
}
const PACK = new Uint8Array([84, 83, 80, 75, 1])

/** Lets promises and forked fibers run (real timers; the Effect clock is a TestClock). */
const settle = Effect.promise(
  () =>
    new Promise<void>((resolve) => {
      let n = 0
      const tick = () => (++n >= 5 ? resolve() : setTimeout(tick, 0))
      tick()
    }),
)

type MirrorAnswer = "mount" | "reject" | "never"

const makeFakeMirror = (answer: () => MirrorAnswer) => {
  const packs: Array<Uint8Array> = []
  let id = 0
  const mirror: LspWorkspaceMirrorService = {
    apply: () => {},
    readFile: () => Effect.succeed(Option.none()),
    mountTypes: (pack) =>
      Effect.suspend((): Effect.Effect<TypesMountResult> => {
        packs.push(pack)
        id += 1
        switch (answer()) {
          case "mount":
            return Effect.succeed({
              _tag: "TypesMounted",
              id,
              files: 1,
              bytes: pack.byteLength,
              packages: [{ name: "effect", version: "4.1.5" }],
            })
          case "reject":
            return Effect.succeed({
              _tag: "TypesRejected",
              id,
              message: "bad magic",
            })
          case "never":
            return Effect.never
        }
      }),
  }
  return { mirror, packs }
}

interface Scenario {
  /** Answers each spawn; `default` installs and collects successfully. */
  readonly spawn?: (
    call: FakeSpawnCall,
    backend: FakeContainerBackend,
  ) => FakeSpawnResult | undefined
  readonly mirror?: MirrorAnswer | (() => MirrorAnswer) | "none"
  /** `fail-once`: the first boot fails and a retried one succeeds. */
  readonly boot?: "ready" | "gated" | "fail-once"
  readonly typesTimeout?: Duration.Input
}

interface Ctx {
  readonly ws: WorkspaceService
  readonly container: ContainerService
  readonly backend: FakeContainerBackend
  readonly deps: DependenciesService
  readonly packs: Array<Uint8Array>
  readonly phases: Array<string>
  readonly release: Deferred.Deferred<void, ContainerBootError>
  readonly state: () => Effect.Effect<DependencyState>
}

/** The host-dir file the types collector was told to write its pack to. */
const packNameOf = (call: FakeSpawnCall) => call.args[2]!.split("/").at(-1)!

/** The successful default: pnpm writes a lockfile, the collector a pack. */
const defaultSpawn = (
  call: FakeSpawnCall,
  backend: FakeContainerBackend,
): FakeSpawnResult => {
  if (call.command === "pnpm") {
    backend.files.set("pnpm-lock.yaml", "lockfileVersion: '6.0'\n")
    return { exitCode: 0, output: ["Packages: +1\n", "Done\n"] }
  }
  backend.hostFiles.set(packNameOf(call), PACK)
  return { exitCode: 0, output: ['{"files":1}\n'] }
}

const run = <A>(
  scenario: Scenario,
  body: (ctx: Ctx) => Effect.Effect<A, unknown>,
): Promise<A> =>
  Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const ws = yield* makeMemoryWorkspace({ initialFiles: SEED })
        const backend: FakeContainerBackend = makeFakeContainerBackend({
          spawn: (call) =>
            scenario.spawn?.(call, backend) ?? defaultSpawn(call, backend),
        })
        const release = yield* Deferred.make<void, ContainerBootError>()
        if (scenario.boot !== "gated")
          yield* Deferred.succeed(release, undefined)
        let boots = 0
        const container = yield* makeContainer(
          Effect.suspend(() =>
            scenario.boot === "fail-once" && ++boots === 1
              ? Effect.fail(new ContainerBootFailed({ message: "boom" }))
              : Deferred.await(release),
          ).pipe(Effect.as(backend)),
        )
        const answer = scenario.mirror ?? "mount"
        const fake = makeFakeMirror(
          typeof answer === "function" ? answer : () => answer as MirrorAnswer,
        )
        const deps = yield* makeDependencies({
          workspace: ws,
          container,
          mirror: answer === "none" ? Option.none() : Option.some(fake.mirror),
          typesTimeout: scenario.typesTimeout,
        })
        const phases: Array<string> = []
        yield* deps.stateChanges.pipe(
          Stream.runForEach((state) =>
            Effect.sync(() => {
              const tag = containerPhaseOf(state)._tag
              if (phases.at(-1) !== tag) phases.push(tag)
            }),
          ),
          Effect.forkScoped,
        )
        yield* mirrorWorkspace(ws, container, {
          onChange: deps.onMirrorChange,
          onContainerChange: deps.onContainerChange,
          watchDebounce: "100 millis",
        })
        yield* settle
        return yield* body({
          ws,
          container,
          backend,
          deps,
          packs: fake.packs,
          phases,
          release,
          state: () => deps.state,
        })
      }),
    ).pipe(Effect.provide(TestClock.layer())),
  )

const commands = (backend: FakeContainerBackend) =>
  backend.spawned.map((call) => [call.command, ...call.args].join(" "))

/** Runs the watch debounce and whatever it starts. */
const afterWatch = Effect.gen(function* () {
  yield* settle
  yield* TestClock.adjust("100 millis")
  yield* settle
})

describe("Dependencies", () => {
  test("a package.json change made in the Container reloads the types once it settles, without installing again", async () => {
    const added =
      '{\n  "dependencies": { "effect": "latest", "kleur": "4.1.5" }\n}'
    await run({}, (ctx) =>
      Effect.gen(function* () {
        assert.deepEqual(
          commands(ctx.backend).map((c) => c.split(" ")[0]),
          ["pnpm", "node"],
        )
        // A terminal `pnpm add`: node_modules, then package.json and the lockfile.
        ctx.backend.touch("node_modules/kleur/index.d.ts")
        ctx.backend.containerWrite("package.json", added)
        ctx.backend.containerWrite("pnpm-lock.yaml", "kleur: 4.1.5\n")
        yield* afterWatch
        assert.equal(yield* ctx.ws.readFile("package.json"), added)
        assert.equal(yield* ctx.ws.readFile("pnpm-lock.yaml"), "kleur: 4.1.5\n")

        // Still busy: more node_modules activity restarts the quiet period.
        yield* TestClock.adjust("1 second")
        ctx.backend.touch("node_modules/.pnpm/lock.yaml")
        yield* afterWatch
        yield* TestClock.adjust("1 second")
        yield* settle
        assert.equal(ctx.packs.length, 1, "no reload while pnpm is busy")

        yield* TestClock.adjust("500 millis")
        yield* settle
        assert.equal(ctx.packs.length, 2, "the types reloaded")
        assert.deepEqual(
          commands(ctx.backend).filter((c) => c.startsWith("pnpm")),
          ["pnpm install"],
          "no second install",
        )
        assert.deepEqual(ctx.phases.slice(-2), ["loading-types", "ready"])
      }),
    )
  })

  test("Container changes that don't touch the dependency files don't reload types", async () => {
    await run({}, (ctx) =>
      Effect.gen(function* () {
        ctx.backend.containerWrite("src/extra.ts", "export {}")
        ctx.backend.touch("node_modules/x/index.js")
        yield* afterWatch
        yield* TestClock.adjust("5 seconds")
        yield* settle
        assert.equal(yield* ctx.ws.readFile("src/extra.ts"), "export {}")
        assert.equal(ctx.packs.length, 1)
      }),
    )
  })

  test("installs after the mount, syncs the lockfile back, copies the installed types and releases diagnostics", async () => {
    await run({}, (ctx) =>
      Effect.gen(function* () {
        assert.equal(commands(ctx.backend)[0], "pnpm install")
        assert.isFalse(
          ctx.backend.hostFiles.has(packNameOf(ctx.backend.spawned[1]!)),
          "the pack is deleted after it is read",
        )
        assert.deepEqual(ctx.packs, [PACK])
        assert.equal(
          yield* ctx.ws.readFile("pnpm-lock.yaml"),
          "lockfileVersion: '6.0'\n",
        )
        assert.deepEqual(ctx.phases, ["installing", "loading-types", "ready"])
        const state = yield* ctx.state()
        assert.isTrue(state.diagnosticsVisible)
        assert.equal(state.types._tag, "mounted")
        const log = yield* ctx.deps.installLog
        assert.deepEqual(log, {
          run: 1,
          running: false,
          output: "Packages: +1\nDone\n",
          exitCode: 0,
        })
        yield* ctx.deps.awaitDiagnosticsVisible
      }),
    )
  })

  test("shows booting until the Container is ready, with diagnostics hidden", async () => {
    await run({ boot: "gated" }, (ctx) =>
      Effect.gen(function* () {
        assert.deepEqual(ctx.phases, ["booting"])
        assert.isFalse((yield* ctx.state()).diagnosticsVisible)
        assert.deepEqual(ctx.backend.spawned, [])
        yield* Deferred.succeed(ctx.release, undefined)
        yield* settle
        assert.deepEqual(ctx.phases, [
          "booting",
          "installing",
          "loading-types",
          "ready",
        ])
      }),
    )
  })

  test("the package.json pnpm writes back does not install again; an edit to package.json does", async () => {
    const reformatted = '{ "dependencies": { "effect": "^4.1.5" } }'
    let installs = 0
    await run(
      {
        spawn: (call, backend) => {
          if (call.command !== "pnpm") return undefined
          installs += 1
          // pnpm rewrites package.json the first time.
          if (installs === 1) backend.files.set("package.json", reformatted)
          return defaultSpawn(call, backend)
        },
      },
      (ctx) =>
        Effect.gen(function* () {
          assert.equal(yield* ctx.ws.readFile("package.json"), reformatted)
          assert.equal(installs, 1)

          const next = '{ "dependencies": { "effect": "^4.1.5", "zod": "^4" } }'
          yield* ctx.ws.writeHostFile("package.json", next)
          yield* settle
          assert.equal(installs, 2)
          assert.equal(ctx.backend.files.get("package.json"), next)

          // Writing the same content again is not a change.
          yield* ctx.ws.writeHostFile("package.json", next)
          yield* settle
          assert.equal(installs, 2)
        }),
    )
  })

  test("a newer package.json interrupts a running install, which is killed", async () => {
    let installs = 0
    await run(
      {
        spawn: (call, backend) => {
          if (call.command !== "pnpm") return undefined
          installs += 1
          return installs === 1
            ? { hang: true, output: ["Resolving…\n"] }
            : defaultSpawn(call, backend)
        },
      },
      (ctx) =>
        Effect.gen(function* () {
          assert.deepEqual(ctx.phases, ["installing"])
          assert.isTrue((yield* ctx.deps.installLog).running)

          yield* ctx.ws.writeHostFile(
            "package.json",
            '{ "dependencies": { "effect": "^4" } }',
          )
          yield* settle
          assert.equal(ctx.backend.killed(), 1)
          assert.equal(installs, 2)
          assert.equal(containerPhaseOf(yield* ctx.state())._tag, "ready")
          const log = yield* ctx.deps.installLog
          assert.equal(log.run, 2)
          assert.equal(log.exitCode, 0)
        }),
    )
  })

  test("a failed install reports its exit code and output, releases diagnostics and copies no types", async () => {
    await run(
      {
        spawn: (call) =>
          call.command === "pnpm"
            ? {
                exitCode: 1,
                output: [
                  "ERR_PNPM_FETCH_404 GET https://registry/x: Not Found\n",
                ],
              }
            : undefined,
      },
      (ctx) =>
        Effect.gen(function* () {
          const phase = containerPhaseOf(yield* ctx.state())
          assert.equal(phase._tag, "install-failed")
          if (phase._tag === "install-failed") {
            assert.equal(phase.error._tag, "InstallFailed")
            assert.equal(phase.error.exitCode, 1)
            assert.match(phase.error.outputTail, /ERR_PNPM_FETCH_404/)
          }
          assert.isTrue((yield* ctx.state()).diagnosticsVisible)
          assert.deepEqual(ctx.packs, [])
          assert.isFalse(
            Option.isSome(
              yield* ctx.ws.readFile("pnpm-lock.yaml").pipe(Effect.option),
            ),
          )
        }),
    )
  })

  test("diagnostics stay hidden while the install runs and are released after the timeout, which is configurable", async () => {
    await run(
      {
        typesTimeout: "10 seconds",
        spawn: (call) => (call.command === "pnpm" ? { hang: true } : undefined),
      },
      (ctx) =>
        Effect.gen(function* () {
          yield* TestClock.adjust("9 seconds")
          yield* settle
          assert.isFalse((yield* ctx.state()).diagnosticsVisible)
          yield* TestClock.adjust("1 second")
          yield* settle
          const state = yield* ctx.state()
          assert.isTrue(state.diagnosticsVisible)
          // Still installing: the badge says so.
          assert.equal(containerPhaseOf(state)._tag, "installing")
        }),
    )
  })

  test("installed types that never reach the editor become dependencies-unavailable after 60 seconds", async () => {
    await run({ mirror: "never" }, (ctx) =>
      Effect.gen(function* () {
        assert.deepEqual(ctx.phases, ["installing", "loading-types"])
        yield* TestClock.adjust("59 seconds")
        yield* settle
        assert.isFalse((yield* ctx.state()).diagnosticsVisible)
        yield* TestClock.adjust("1 second")
        yield* settle
        assert.isTrue((yield* ctx.state()).diagnosticsVisible)
        assert.equal(ctx.phases.at(-1), "dependencies-unavailable")
      }),
    )
  })

  test("a rejected pack makes dependencies unavailable at once", async () => {
    await run({ mirror: "reject" }, (ctx) =>
      Effect.gen(function* () {
        const phase = containerPhaseOf(yield* ctx.state())
        assert.equal(phase._tag, "dependencies-unavailable")
        if (phase._tag === "dependencies-unavailable") {
          assert.match(phase.reason, /bad magic/)
        }
        assert.isTrue((yield* ctx.state()).diagnosticsVisible)
      }),
    )
  })

  test("without a language server mirror, dependencies are unavailable after the install", async () => {
    await run({ mirror: "none" }, (ctx) =>
      Effect.gen(function* () {
        assert.deepEqual(commands(ctx.backend), ["pnpm install"])
        assert.equal(
          containerPhaseOf(yield* ctx.state())._tag,
          "dependencies-unavailable",
        )
      }),
    )
  })

  test("a re-install keeps diagnostics visible, and keeps the previous types when the new ones fail", async () => {
    let collects = 0
    await run(
      {
        spawn: (call, backend) => {
          if (call.command !== "node") return undefined
          collects += 1
          return collects === 1
            ? defaultSpawn(call, backend)
            : { exitCode: 1, output: ["Error: EIO\n"] }
        },
      },
      (ctx) =>
        Effect.gen(function* () {
          assert.equal(containerPhaseOf(yield* ctx.state())._tag, "ready")
          yield* ctx.ws.writeHostFile("package.json", "{}")
          yield* settle
          assert.equal(collects, 2)
          const state = yield* ctx.state()
          assert.isTrue(state.diagnosticsVisible)
          assert.equal(state.types._tag, "mounted")
          assert.equal(containerPhaseOf(state)._tag, "ready")
          assert.deepEqual(ctx.phases, [
            "installing",
            "loading-types",
            "ready",
            "installing",
            "loading-types",
            "ready",
          ])
        }),
    )
  })

  test("a retried boot mounts, installs and loads types after a failed one", async () => {
    await run({ boot: "fail-once" }, (ctx) =>
      Effect.gen(function* () {
        assert.equal(containerPhaseOf(yield* ctx.state())._tag, "failed")
        assert.deepEqual(ctx.backend.spawned, [])
        yield* ctx.ws.writeFile("src/main.ts", "edited while failed")

        yield* ctx.container.retry
        yield* settle
        const state = yield* ctx.state()
        assert.equal(containerPhaseOf(state)._tag, "ready")
        assert.deepEqual(ctx.phases, [
          "failed",
          "booting",
          "installing",
          "loading-types",
          "ready",
        ])
        assert.equal(commands(ctx.backend)[0], "pnpm install")
        assert.equal(
          ctx.backend.files.get("src/main.ts"),
          "edited while failed",
        )
        assert.deepEqual(ctx.packs, [PACK])
      }),
    )
  })

  test("the types timeout starts when a retried boot is ready", async () => {
    await run({ boot: "fail-once", mirror: "never" }, (ctx) =>
      Effect.gen(function* () {
        yield* ctx.container.retry
        yield* settle
        assert.equal(containerPhaseOf(yield* ctx.state())._tag, "loading-types")
        yield* TestClock.adjust("60 seconds")
        yield* settle
        assert.equal(
          containerPhaseOf(yield* ctx.state())._tag,
          "dependencies-unavailable",
        )
      }),
    )
  })

  test("install retries a failed install, which can then succeed", async () => {
    let installs = 0
    await run(
      {
        spawn: (call) =>
          call.command === "pnpm" && ++installs === 1
            ? { exitCode: 1, output: ["ERR_PNPM_FETCH_404\n"] }
            : undefined,
      },
      (ctx) =>
        Effect.gen(function* () {
          assert.equal(
            containerPhaseOf(yield* ctx.state())._tag,
            "install-failed",
          )
          yield* ctx.deps.install
          yield* settle
          assert.equal(containerPhaseOf(yield* ctx.state())._tag, "ready")
          assert.deepEqual(ctx.phases, [
            "installing",
            "install-failed",
            "installing",
            "loading-types",
            "ready",
          ])
          const log = yield* ctx.deps.installLog
          assert.equal(log.run, 2)
          assert.equal(log.exitCode, 0)
          assert.deepEqual(ctx.packs, [PACK])
        }),
    )
  })

  test("a Container that fails to boot releases diagnostics", async () => {
    await run({ boot: "gated" }, (ctx) =>
      Effect.gen(function* () {
        yield* Deferred.fail(
          ctx.release,
          new ContainerBootFailed({ message: "boom" }),
        )
        yield* settle
        const state = yield* ctx.state()
        assert.equal(containerPhaseOf(state)._tag, "failed")
        assert.isTrue(state.diagnosticsVisible)
        assert.deepEqual(ctx.backend.spawned, [])
      }),
    )
  })
})

describe("collect-types.cjs", () => {
  test("flattens pnpm's layout, packs package.json and declarations, and skips TypeScript's lib files", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "collect-types-"))
    try {
      const write = (rel: string, text: string) => {
        const file = path.join(dir, rel)
        fs.mkdirSync(path.dirname(file), { recursive: true })
        fs.writeFileSync(file, text)
      }
      const link = (target: string, rel: string) => {
        const file = path.join(dir, rel)
        fs.mkdirSync(path.dirname(file), { recursive: true })
        fs.symlinkSync(path.join(dir, target), file)
      }
      const store = "node_modules/.pnpm"
      const effect = `${store}/effect@4.1.5/node_modules/effect`
      write(`${effect}/package.json`, '{"name":"effect","version":"4.1.5"}')
      write(`${effect}/dist/Effect.d.ts`, "export {}")
      write(`${effect}/dist/Effect.js`, "export {}")
      write(`${effect}/node_modules/nested/package.json`, "{}")
      link(effect, "node_modules/effect")
      const node = `${store}/@types+node@24.0.0/node_modules/@types/node`
      write(`${node}/package.json`, '{"version":"24.0.0"}')
      write(`${node}/fs.d.ts`, "declare module 'fs'")
      link(node, "node_modules/@types/node")
      const ts = `${store}/typescript@6.0.2/node_modules/typescript`
      write(`${ts}/package.json`, '{"version":"6.0.2"}')
      write(`${ts}/lib/lib.es5.d.ts`, "interface Array<T> {}")
      write(`${ts}/lib/typescript.d.ts`, "export {}")
      link(ts, "node_modules/typescript")
      // Hoisted transitive dependency, and an older version nobody reaches.
      const undici = `${store}/undici-types@7.0.0/node_modules/undici-types`
      write(`${undici}/package.json`, '{"version":"7.0.0"}')
      write(`${undici}/index.d.ts`, "export {}")
      link(undici, `${store}/node_modules/undici-types`)
      const old = `${store}/undici-types@6.0.0/node_modules/undici-types`
      write(`${old}/package.json`, '{"version":"6.0.0"}')

      const script = path.join(
        import.meta.dirname,
        "../../../src/features/scratchpad/collect-types.cjs",
      )
      const stdout = execFileSync(
        process.execPath,
        [script, "node_modules", "out/types.pack", "--skip-ts-libs"],
        { cwd: dir, encoding: "utf8" },
      )
      const stats = JSON.parse(stdout) as {
        files: number
        packages: number
        dropped: number
      }
      assert.deepEqual(
        {
          files: stats.files,
          packages: stats.packages,
          dropped: stats.dropped,
        },
        { files: 8, packages: 4, dropped: 1 },
      )

      const pack = decodeTypesPack(
        new Uint8Array(fs.readFileSync(path.join(dir, "out/types.pack"))),
      )
      assert.deepEqual(pack.packages, [
        { name: "@types/node", version: "24.0.0" },
        { name: "effect", version: "4.1.5" },
        { name: "typescript", version: "6.0.2" },
        { name: "undici-types", version: "7.0.0" },
      ])
      assert.deepEqual(
        pack.files.map((file) => file.path),
        [
          "@types/node/fs.d.ts",
          "@types/node/package.json",
          "effect/dist/Effect.d.ts",
          "effect/package.json",
          "typescript/lib/typescript.d.ts",
          "typescript/package.json",
          "undici-types/index.d.ts",
          "undici-types/package.json",
        ],
      )
      assert.equal(
        new TextDecoder().decode(
          pack.files.find((f) => f.path === "effect/dist/Effect.d.ts")!.data,
        ),
        "export {}",
      )
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})
