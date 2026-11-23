import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import {
  Container,
  type ContainerBackend,
  type ContainerBootError,
  makeContainer,
} from "../../../src/features/scratchpad/container.ts"

/** An in-memory Container backend for tests. */

export interface FakeSpawnResult {
  readonly exitCode?: number | undefined
  readonly output?: ReadonlyArray<string> | undefined
  /** When true the process runs until killed (exit code 143). */
  readonly hang?: boolean | undefined
  /** The process exits with this code when it resolves (or 143 when killed first). */
  readonly exit?: Promise<number> | undefined
}

export interface FakeSpawnCall {
  readonly command: string
  readonly args: ReadonlyArray<string>
  readonly cwd?: string | undefined
  readonly env: Readonly<Record<string, string>>
}

export interface FakeContainerBackend extends ContainerBackend {
  /** The Container's files, by Workspace-relative path. */
  readonly files: Map<string, string>
  /** The host scripts directory's files, by name. */
  readonly hostFiles: Map<string, string | Uint8Array>
  /** Every file system call, in order (`write a`, `remove b`, …). */
  readonly log: Array<string>
  readonly spawned: Array<FakeSpawnCall>
  /** Number of processes killed before they exited. */
  readonly killed: () => number
}

export const makeFakeContainerBackend = (
  options: {
    readonly files?: Readonly<Record<string, string>> | undefined
    readonly spawn?: ((call: FakeSpawnCall) => FakeSpawnResult) | undefined
    /** Paths whose writes fail, to test error handling. */
    readonly failWrites?: ReadonlySet<string> | undefined
  } = {},
): FakeContainerBackend => {
  const files = new Map(Object.entries(options.files ?? {}))
  const hostFiles = new Map<string, string | Uint8Array>()
  const log: Array<string> = []
  const spawned: Array<FakeSpawnCall> = []
  const encoder = new TextEncoder()
  let killed = 0
  const under = (path: string, root: string) =>
    path === root || path.startsWith(`${root}/`)
  return {
    files,
    hostFiles,
    log,
    spawned,
    killed: () => killed,
    writeFile: async (path, content) => {
      log.push(`write ${path}`)
      if (options.failWrites?.has(path)) throw new Error(`EIO: ${path}`)
      files.set(path, content)
    },
    remove: async (path) => {
      log.push(`remove ${path}`)
      for (const key of [...files.keys()]) {
        if (under(key, path)) files.delete(key)
      }
    },
    rename: async (from, to) => {
      log.push(`rename ${from} ${to}`)
      for (const [key, content] of [...files]) {
        if (under(key, from)) {
          files.delete(key)
          files.set(`${to}${key.slice(from.length)}`, content)
        }
      }
    },
    readFile: async (path) => {
      const content = files.get(path)
      if (content === undefined) throw new Error(`ENOENT: ${path}`)
      return encoder.encode(content)
    },
    writeHostDirFile: async (name, content) => {
      hostFiles.set(name, content)
    },
    readHostDirFile: async (name) => {
      const content = hostFiles.get(name)
      if (content === undefined) throw new Error(`ENOENT: ${name}`)
      return typeof content === "string" ? encoder.encode(content) : content
    },
    removeHostDirFile: async (name) => {
      hostFiles.delete(name)
    },
    spawn: async (command, args, spawnOptions) => {
      const call = { command, args, ...spawnOptions }
      spawned.push(call)
      const result = options.spawn?.(call) ?? {}
      let resolveExit!: (code: number) => void
      const exit = new Promise<number>((resolve) => {
        resolveExit = resolve
      })
      let exited = false
      const finish = (code: number) => {
        if (exited) return
        exited = true
        resolveExit(code)
      }
      const runs = result.hang === true || result.exit !== undefined
      const output = new ReadableStream<string>({
        start(controller) {
          for (const chunk of result.output ?? []) controller.enqueue(chunk)
          if (!runs) controller.close()
          void exit.then(() => {
            try {
              controller.close()
            } catch {
              // Already closed.
            }
          })
        },
      })
      if (!runs) finish(result.exitCode ?? 0)
      void result.exit?.then(finish)
      return {
        exit,
        output,
        kill: () => {
          if (exited) return
          killed += 1
          finish(143)
        },
      }
    },
  }
}

/**
 * A Container on a fake backend. `boot` decides when (and whether) it
 * becomes ready; by default it is ready at once.
 */
export const layerFakeContainer = (
  backend: FakeContainerBackend,
  boot: Effect.Effect<void, ContainerBootError> = Effect.void,
): Layer.Layer<Container> =>
  Layer.effect(Container, makeContainer(boot.pipe(Effect.as(backend))))
