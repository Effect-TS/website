import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import {
  Container,
  type ContainerBackend,
  type ContainerBackendShell,
  type ContainerBootError,
  makeContainer,
  type TerminalSize,
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

/** What a command typed into the fake `jsh` does. */
interface FakeJshCommand {
  readonly output?: ReadonlyArray<string> | undefined
  /** The exit code, once done. Ignored with `hang`. */
  readonly exitCode?: number | undefined
  /** Runs until Ctrl+C. */
  readonly hang?: boolean | undefined
}

/** The fake `jsh`'s prompt, colored like the real one. */
const FAKE_PROMPT = "\u001b[32m~/workspace\u001b[0m \u001b[34m❯\u001b[0m "

/** One interactive shell started on the fake backend. */
interface FakeShell {
  /** Every write to its input, in order. */
  readonly input: Array<string>
  /** Every line entered at its prompt, in order. */
  readonly lines: Array<string>
  readonly sizes: Array<TerminalSize>
  /** Prints shell output. */
  readonly print: (text: string) => void
  /** Ends a command that hangs, as if it exited with `code`. */
  readonly finish: (code: number) => void
  /** The shell itself exits. */
  readonly exit: (code: number) => void
  readonly killed: () => boolean
}

/**
 * A scripted `jsh`: echoes input, runs each entered line with `command`,
 * prints the prompt when it is done, and handles Ctrl+C and Ctrl+U.
 */
const makeFakeShell = (
  size: TerminalSize,
  command: (line: string) => FakeJshCommand,
): { readonly shell: FakeShell; readonly backend: ContainerBackendShell } => {
  let controller!: ReadableStreamDefaultController<string>
  const output = new ReadableStream<string>({
    start(c) {
      controller = c
    },
  })
  let resolveExit!: (code: number) => void
  const exit = new Promise<number>((resolve) => {
    resolveExit = resolve
  })
  let closed = false
  let killed = false
  let line = ""
  // Whether a command is in the foreground.
  let running = false
  const input: Array<string> = []
  const lines: Array<string> = []
  const sizes: Array<TerminalSize> = [size]
  const print = (text: string) => {
    if (!closed) controller.enqueue(text)
  }
  const prompt = () => print(FAKE_PROMPT)
  const end = (_code: number) => {
    if (!running) return
    running = false
    prompt()
  }
  const close = (code: number) => {
    if (closed) return
    closed = true
    controller.close()
    resolveExit(code)
  }
  const enter = () => {
    const entered = line
    line = ""
    print("\r\n")
    if (entered.trim() === "") return prompt()
    lines.push(entered)
    const result = command(entered)
    running = true
    for (const chunk of result.output ?? []) print(chunk)
    if (result.hang !== true) end(result.exitCode ?? 0)
  }
  queueMicrotask(prompt)
  const shell: FakeShell = {
    input,
    lines,
    sizes,
    print,
    finish: end,
    exit: close,
    killed: () => killed,
  }
  return {
    shell,
    backend: {
      exit,
      output,
      kill: () => {
        killed = true
        close(143)
      },
      resize: (next) => {
        sizes.push(next)
      },
      write: async (data) => {
        input.push(data)
        for (const char of data) {
          if (char === "\u0003") {
            print("^C\r\n")
            line = ""
            if (running) end(130)
            else prompt()
          } else if (running) {
            // Goes to the program's stdin.
          } else if (char === "\r") {
            enter()
          } else if (char === "\u0015") {
            line = ""
          } else {
            line += char
            print(char)
          }
        }
      },
    },
  }
}

export interface FakeContainerBackend extends ContainerBackend {
  /** The Container's files, by Workspace-relative path (bytes for binary files). */
  readonly files: Map<string, string | Uint8Array>
  /** The host scripts directory's files, by name. */
  readonly hostFiles: Map<string, string | Uint8Array>
  /** Executables written next to the Workspace dir (`../<name>`), by name. */
  readonly executables: Map<string, string>
  /** Every file system call, in order (`write a`, `remove b`, …). */
  readonly log: Array<string>
  readonly spawned: Array<FakeSpawnCall>
  /** Number of processes killed before they exited. */
  readonly killed: () => number
  /**
   * Container-side changes, as a terminal command would make them: they
   * change `files` and notify the watch (`backend.watch`) without going
   * through the mirror or the `log`.
   */
  readonly containerWrite: (path: string, content: string | Uint8Array) => void
  readonly containerRemove: (path: string) => void
  /** Notifies the watch of a change at `path` without changing a file (`node_modules/…` activity). */
  readonly touch: (path: string) => void
  /** Number of watches open now. */
  readonly watchers: () => number
  /** Every shell started, oldest first. */
  readonly shells: Array<FakeShell>
}

export const makeFakeContainerBackend = (
  options: {
    readonly files?: Readonly<Record<string, string>> | undefined
    readonly spawn?: ((call: FakeSpawnCall) => FakeSpawnResult) | undefined
    /** Paths whose writes fail, to test error handling. */
    readonly failWrites?: ReadonlySet<string> | undefined
    /** What each line entered in a shell does; by default it prints nothing and exits 0. */
    readonly command?: ((line: string) => FakeJshCommand) | undefined
  } = {},
): FakeContainerBackend => {
  const files = new Map<string, string | Uint8Array>(
    Object.entries(options.files ?? {}),
  )
  const hostFiles = new Map<string, string | Uint8Array>()
  const executables = new Map<string, string>()
  const log: Array<string> = []
  const spawned: Array<FakeSpawnCall> = []
  const shells: Array<FakeShell> = []
  const encoder = new TextEncoder()
  let killed = 0
  const under = (path: string, root: string) =>
    path === root || path.startsWith(`${root}/`)
  const listeners = new Set<(path: string) => void>()
  // Like a real watch, every change is reported, the mirror's own included.
  const notify = (path: string) => {
    for (const listener of [...listeners]) listener(path)
  }
  const removeUnder = (path: string) => {
    for (const key of [...files.keys()]) {
      if (under(key, path)) files.delete(key)
    }
  }
  return {
    files,
    hostFiles,
    executables,
    log,
    spawned,
    killed: () => killed,
    containerWrite: (path, content) => {
      files.set(path, content)
      notify(path)
    },
    containerRemove: (path) => {
      removeUnder(path)
      notify(path)
    },
    touch: notify,
    watchers: () => listeners.size,
    shells,
    shell: async (size) => {
      const made = makeFakeShell(size, options.command ?? (() => ({})))
      shells.push(made.shell)
      return made.backend
    },
    writeFile: async (path, content) => {
      log.push(`write ${path}`)
      if (options.failWrites?.has(path)) throw new Error(`EIO: ${path}`)
      files.set(path, content)
      notify(path)
    },
    remove: async (path) => {
      log.push(`remove ${path}`)
      removeUnder(path)
      notify(path)
    },
    rename: async (from, to) => {
      log.push(`rename ${from} ${to}`)
      for (const [key, content] of [...files]) {
        if (under(key, from)) {
          files.delete(key)
          files.set(`${to}${key.slice(from.length)}`, content)
        }
      }
      notify(from)
      notify(to)
    },
    readFile: async (path) => {
      const content = files.get(path)
      if (content === undefined) throw new Error(`ENOENT: ${path}`)
      return typeof content === "string" ? encoder.encode(content) : content
    },
    readDirectory: async (path) => {
      const prefix = path === "" ? "" : `${path}/`
      const entries = new Map<string, "file" | "directory">()
      for (const key of files.keys()) {
        if (!key.startsWith(prefix)) continue
        const rest = key.slice(prefix.length)
        const slash = rest.indexOf("/")
        if (slash === -1) entries.set(rest, "file")
        else entries.set(rest.slice(0, slash), "directory")
      }
      if (path !== "" && entries.size === 0) {
        throw new Error(`ENOENT: ${path}`)
      }
      return [...entries].map(([name, kind]) => ({ name, kind }))
    },
    watch: (onChange) => {
      listeners.add(onChange)
      return () => {
        listeners.delete(onChange)
      }
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
    writeExecutable: async (name, content) => {
      executables.set(name, content)
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
