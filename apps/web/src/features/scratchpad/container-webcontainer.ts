/**
 * The real Container backend: one WebContainer per page.
 *
 * Layout inside the Container's workdir (`/home/scratchpad`):
 *
 * - `workspace/`: the mirrored Workspace. Every `ContainerBackend` path is
 *   relative to it, and processes start there.
 * - `.scratchpad/`: host scripts that are not part of the Workspace (the
 *   `/dev-tools-proxy`, the types collector and its pack, the Run preload
 *   later). `ContainerBackend`'s host-dir operations work here.
 */
import type { WebContainer } from "@webcontainer/api"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Semaphore from "effect/Semaphore"
import * as Stream from "effect/Stream"
import {
  Container,
  ContainerBootFailed,
  type ContainerBackend,
  type ContainerBootError,
  ContainerUnsupported,
  makeContainer,
} from "./container.ts"

export const CONTAINER_WORKDIR_NAME = "scratchpad"
export const CONTAINER_WORKSPACE_DIR = "workspace"
/** `CONTAINER_HOST_DIR_FROM_WORKSPACE` is this directory seen from `workspace/`. */
export const CONTAINER_HOST_DIR = ".scratchpad"

/** The devtools TCP port Effect's `DevTools.layer` connects to. */
export const DEV_TOOLS_PORT = 34437

/**
 * Accepts devtools connections so programs using `DevTools.layer` don't fail
 * to connect. Output is piped to stdout, which the host drops until the trace
 * viewer lands. Same script as the Playground's.
 */
export const DEV_TOOLS_PROXY_SCRIPT = `const Net = require("node:net")

const server = Net.createServer((socket) => {
  socket.on("error", () => {})
  socket.pipe(process.stdout, { end: false })
})
process.stdout.on("error", () => {})
server.on("error", () => {})

server.listen(${DEV_TOOLS_PORT})
`

/** WebContainer allows one instance per page. */
const instanceGuard = Semaphore.makeUnsafe(1)

const errorMessage = (cause: unknown) =>
  cause instanceof Error ? cause.message : String(cause)

const UNSUPPORTED_PATTERN =
  /SharedArrayBuffer|cross-?origin|crossOriginIsolated|not supported|unsupported/i

/** Why this browser cannot boot a Container, if it cannot. */
export const unsupportedReason = (
  env: {
    readonly crossOriginIsolated?: boolean | undefined
    readonly SharedArrayBuffer?: unknown
  } = globalThis,
): string | undefined => {
  if (env.crossOriginIsolated !== true) {
    return "This page is not cross-origin isolated, so it cannot run code."
  }
  if (typeof env.SharedArrayBuffer !== "function") {
    return "This browser lacks SharedArrayBuffer, so it cannot run code."
  }
  return undefined
}

/** Sorts a boot rejection into "unsupported browser" or "boot failed". */
export const classifyBootError = (cause: unknown): ContainerBootError => {
  const message = errorMessage(cause)
  return UNSUPPORTED_PATTERN.test(message)
    ? new ContainerUnsupported({ message, cause })
    : new ContainerBootFailed({
        message: `The Container failed to boot: ${message}`,
        cause,
      })
}

const parentOf = (path: string) => {
  const idx = path.lastIndexOf("/")
  return idx === -1 ? undefined : path.slice(0, idx)
}

const makeBackend = (wc: WebContainer): ContainerBackend => {
  const abs = (path: string) => `${CONTAINER_WORKSPACE_DIR}/${path}`
  const ensureParent = async (path: string) => {
    const parent = parentOf(path)
    if (parent !== undefined) {
      await wc.fs.mkdir(abs(parent), { recursive: true })
    }
  }
  return {
    writeFile: async (path, content) => {
      await ensureParent(path)
      await wc.fs.writeFile(abs(path), content)
    },
    remove: (path) => wc.fs.rm(abs(path), { recursive: true, force: true }),
    rename: async (from, to) => {
      await ensureParent(to)
      await wc.fs.rename(abs(from), abs(to))
    },
    readFile: (path) => wc.fs.readFile(abs(path)),
    writeHostDirFile: async (name, content) => {
      await wc.fs.mkdir(CONTAINER_HOST_DIR, { recursive: true })
      await wc.fs.writeFile(`${CONTAINER_HOST_DIR}/${name}`, content)
    },
    readHostDirFile: (name) => wc.fs.readFile(`${CONTAINER_HOST_DIR}/${name}`),
    removeHostDirFile: (name) =>
      wc.fs.rm(`${CONTAINER_HOST_DIR}/${name}`, { force: true }),
    spawn: (command, args, options) =>
      wc.spawn(command, [...args], {
        cwd:
          options.cwd === undefined
            ? CONTAINER_WORKSPACE_DIR
            : abs(options.cwd),
        env: { ...options.env },
      }),
    shell: async (size, options) => {
      const process = await wc.spawn("jsh", [], {
        cwd: CONTAINER_WORKSPACE_DIR,
        env: { ...options.env },
        terminal: { cols: size.cols, rows: size.rows },
      })
      const writer = process.input.getWriter()
      return {
        exit: process.exit,
        output: process.output,
        kill: () => process.kill(),
        write: (data) => writer.write(data),
        resize: (next) => process.resize({ cols: next.cols, rows: next.rows }),
      }
    },
  }
}

/** Starts the devtools proxy for the Container's lifetime and drops its output. */
const startDevToolsProxy = (wc: WebContainer) =>
  Effect.gen(function* () {
    yield* Effect.tryPromise({
      try: async () => {
        await wc.fs.mkdir(CONTAINER_HOST_DIR, { recursive: true })
        await wc.fs.writeFile(
          `${CONTAINER_HOST_DIR}/dev-tools-proxy.cjs`,
          DEV_TOOLS_PROXY_SCRIPT,
        )
      },
      catch: (cause) => cause,
    })
    yield* Effect.acquireRelease(
      Effect.tryPromise({
        try: () =>
          wc.spawn("node", [`${CONTAINER_HOST_DIR}/dev-tools-proxy.cjs`]),
        catch: (cause) => cause,
      }),
      (process) => Effect.sync(() => process.kill()),
    ).pipe(
      Effect.flatMap((process) =>
        Stream.fromReadableStream({
          evaluate: () => process.output,
          onError: (cause) => cause,
          releaseLockOnEnd: true,
        }).pipe(
          Stream.runDrain,
          Effect.andThen(Effect.promise(() => process.exit)),
        ),
      ),
      Effect.scoped,
      Effect.ignore,
      Effect.forkScoped,
    )
  }).pipe(
    Effect.catch((cause) =>
      Effect.logWarning("Container devtools proxy", errorMessage(cause)),
    ),
  )

/** Boots the page's WebContainer and tears it down when the scope closes. */
export const bootWebContainer = Effect.gen(function* () {
  const reason = unsupportedReason()
  if (reason !== undefined) {
    return yield* new ContainerUnsupported({ message: reason })
  }

  yield* Effect.acquireRelease(Semaphore.take(instanceGuard, 1), () =>
    Semaphore.release(instanceGuard, 1),
  )

  const wc = yield* Effect.acquireRelease(
    Effect.tryPromise({
      try: async () => {
        const { WebContainer } = await import("@webcontainer/api")
        return WebContainer.boot({ workdirName: CONTAINER_WORKDIR_NAME })
      },
      catch: classifyBootError,
    }),
    (wc) => Effect.sync(() => wc.teardown()),
  )

  yield* Effect.tryPromise({
    try: () => wc.fs.mkdir(CONTAINER_WORKSPACE_DIR, { recursive: true }),
    catch: classifyBootError,
  })
  yield* startDevToolsProxy(wc)

  return makeBackend(wc)
})

/** The page's real Container. Boot starts when the layer is built. */
export const layerWebContainer: Layer.Layer<Container> = Layer.effect(
  Container,
  makeContainer(bootWebContainer),
)
