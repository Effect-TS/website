import { decodeTypesPack } from "@website/tsrs-lsp-wasm"
import * as Deferred from "effect/Deferred"
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

const makeFakeMirror = (answer: MirrorAnswer) => {
  const packs: Array<Uint8Array> = []
  let id = 0
  const mirror: LspWorkspaceMirrorService = {
    apply: () => {},
    readFile: () => Effect.succeed(Option.none()),
    mountTypes: (pack) =>
      Effect.suspend((): Effect.Effect<TypesMountResult> => {
        packs.push(pack)
        id += 1
        switch (answer) {
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
  readonly mirror?: MirrorAnswer
  /** `gated`: the boot waits for `release`. */
  readonly boot?: "ready" | "gated"
}

interface Ctx {
  readonly ws: WorkspaceService
  readonly backend: FakeContainerBackend
  readonly deps: DependenciesService
  readonly packs: Array<Uint8Array>
  readonly phases: Array<string>
  readonly release: Deferred.Deferred<void, ContainerBootError>
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
        const container = yield* makeContainer(
          Deferred.await(release).pipe(Effect.as(backend)),
        )
        const fake = makeFakeMirror(scenario.mirror ?? "mount")
        const deps = yield* makeDependencies({
          workspace: ws,
          container,
          mirror: Option.some(fake.mirror),
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
          backend,
          deps,
          packs: fake.packs,
          phases,
          release,
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
  test("after the mount, installs and loads the installed types", async () => {
    await run({}, (ctx) =>
      Effect.sync(() =>
        assert.deepEqual(ctx.phases, ["installing", "loading-types", "ready"]),
      ),
    )
  })

  test("the lockfile pnpm writes is synced back into the Workspace", async () => {
    await run({}, (ctx) =>
      Effect.gen(function* () {
        assert.equal(
          yield* ctx.ws.readFile("pnpm-lock.yaml"),
          "lockfileVersion: '6.0'\n",
        )
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
          assert.equal(installs, 1)
          yield* ctx.ws.writeHostFile(
            "package.json",
            '{ "dependencies": { "effect": "^4.1.5", "zod": "^4" } }',
          )
          yield* settle
          assert.equal(installs, 2)
        }),
    )
  })

  test("a newer package.json kills the running install and installs again", async () => {
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
          yield* ctx.ws.writeHostFile(
            "package.json",
            '{ "dependencies": { "effect": "^4" } }',
          )
          yield* settle
          assert.equal(ctx.backend.killed(), 1)
          assert.equal(containerPhaseOf(yield* ctx.deps.state)._tag, "ready")
        }),
    )
  })

  test("a failed install reports pnpm's output", async () => {
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
          const phase = containerPhaseOf(yield* ctx.deps.state)
          assert.equal(phase._tag, "install-failed")
          if (phase._tag === "install-failed") {
            assert.match(phase.error.outputTail, /ERR_PNPM_FETCH_404/)
          }
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
          yield* ctx.deps.install
          yield* settle
          assert.equal(containerPhaseOf(yield* ctx.deps.state)._tag, "ready")
        }),
    )
  })

  test("diagnostics stay hidden until types arrive, and are shown without them after 60 seconds", async () => {
    await run({ mirror: "never" }, (ctx) =>
      Effect.gen(function* () {
        yield* TestClock.adjust("59 seconds")
        yield* settle
        assert.isFalse((yield* ctx.deps.state).diagnosticsVisible)
        yield* TestClock.adjust("1 second")
        yield* settle
        assert.isTrue((yield* ctx.deps.state).diagnosticsVisible)
      }),
    )
  })

  test("a pack the language server rejects makes dependencies unavailable, with its reason", async () => {
    await run({ mirror: "reject" }, (ctx) =>
      Effect.gen(function* () {
        const phase = containerPhaseOf(yield* ctx.deps.state)
        assert.equal(phase._tag, "dependencies-unavailable")
        if (phase._tag === "dependencies-unavailable") {
          assert.match(phase.reason, /bad magic/)
        }
      }),
    )
  })

  test("a re-install whose types fail to load keeps the previous types", async () => {
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
          yield* ctx.ws.writeHostFile("package.json", "{}")
          yield* settle
          assert.equal(collects, 2)
          assert.equal(containerPhaseOf(yield* ctx.deps.state)._tag, "ready")
        }),
    )
  })

  test("a Container that fails to boot shows diagnostics", async () => {
    await run({ boot: "gated" }, (ctx) =>
      Effect.gen(function* () {
        yield* Deferred.fail(
          ctx.release,
          new ContainerBootFailed({ message: "boom" }),
        )
        yield* settle
        assert.isTrue((yield* ctx.deps.state).diagnosticsVisible)
      }),
    )
  })

  test("a pnpm add in the terminal reloads the types once pnpm is done, without installing again", async () => {
    await run({}, (ctx) =>
      Effect.gen(function* () {
        ctx.backend.touch("node_modules/kleur/index.d.ts")
        ctx.backend.containerWrite(
          "package.json",
          '{\n  "dependencies": { "effect": "latest", "kleur": "4.1.5" }\n}',
        )
        yield* afterWatch
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
        assert.equal(ctx.packs.length, 1)
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
      execFileSync(
        process.execPath,
        [script, "node_modules", "out/types.pack", "--skip-ts-libs"],
        { cwd: dir, encoding: "utf8" },
      )
      const pack = decodeTypesPack(
        new Uint8Array(fs.readFileSync(path.join(dir, "out/types.pack"))),
      )
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
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})
