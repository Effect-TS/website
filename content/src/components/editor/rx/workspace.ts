import { Rx } from "@effect-rx/rx-react"
import * as monaco from "@effect/monaco-editor"
import { createStreaming, type Formatter } from "@dprint/formatter"
import * as Array from "effect/Array"
import * as Cache from "effect/Cache"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Sink from "effect/Sink"
import * as Stream from "effect/Stream"
import { themeRx } from "@/rx/theme"
import { Toaster } from "@/services/toaster"
import {
  Directory,
  File,
  makeDirectory,
  makeFile,
  Workspace,
  WorkspaceShell,
  WorkspaceTerminal
} from "../domain/workspace"
import { Loader } from "../services/loader"
import { Terminal } from "../services/terminal"
import { Dracula, NightOwlishLight } from "../services/terminal/themes"
import { WebContainer } from "../services/webcontainer"

const runtime = Rx.runtime(Layer.mergeAll(Loader.Default, Terminal.Default, Toaster.Default, WebContainer.Default))

const terminalThemeRx = themeRx.pipe(Rx.map((theme) => (theme === "light" ? NightOwlishLight : Dracula)))

export interface RxWorkspaceHandle extends Rx.Rx.InferSuccess<ReturnType<typeof workspaceHandleRx>> {}

export const workspaceHandleRx = Rx.family((workspace: Workspace) =>
  runtime.rx(
    Effect.fnUntraced(function* (_get) {
      const container = yield* WebContainer
      const loader = yield* Loader
      const terminal = yield* Terminal

      const handle = yield* container.createWorkspaceHandle(workspace)

      /**
       * Loads the file system of a workspace into the WebContainer file system.
       */
      function loadWorkspace(workspace: Workspace) {
        return Effect.forEach(
          workspace.filePaths,
          ([file, path]) => {
            const fullPath = workspace.relativePath(path)
            if (file._tag === "Directory") {
              return container
                .makeDirectory(fullPath)
                .pipe(Effect.catchTag("FileAlreadyExistsError", () => Effect.void))
            }
            return container.writeFile(fullPath, file.initialContent, file.language)
          },
          { discard: true }
        )
      }

      /**
       * Load the file system of the workspace into the WebContainer
       */
      yield* loadWorkspace(workspace).pipe(loader.withIndicator("Preparing workspace"))

      const selectedFile = Rx.make(workspace.initialFile)

      const createTerminal = Rx.family(({ command, element }: WorkspaceTerminal) =>
        runtime.rx(
          Effect.fnUntraced(function* (get) {
            const process = yield* container.createShell
            const spawned = yield* terminal.spawn({
              theme: get.once(terminalThemeRx)
            })
            const writer = process.input.getWriter()
            const mount = Effect.sync(() => {
              process.output.pipeTo(
                new WritableStream({
                  write(data) {
                    spawned.terminal.write(data)
                  }
                })
              )
              spawned.terminal.onData((data) => {
                writer.write(data)
              })
            })
            yield* mount
            writer.write(`cd "${workspace.name}" && clear\n`)
            /**
             * Install dependencies, acquire types, and setup formatters in the
             * background
             */
            const fiber = yield* handle.spawn(workspace.prepare).pipe(
              Effect.tap((process) => {
                process.output.pipeTo(
                  new WritableStream({
                    write(data) {
                      spawned.terminal.write(data)
                    }
                  })
                )
              }),
              Effect.flatMap((process) => Effect.promise(() => process.exit)),
              Effect.zipRight(setupWorkspaceTypeAcquisition(workspace)),
              Effect.zipRight(setupWorkspaceFormatters(workspace)),
              Effect.forkScoped
            )
            if (command !== undefined) {
              /**
               * Wait for dependencies, type acquisition, etc. to be complete
               * before running the workspace command
               */
              yield* Fiber.await(fiber).pipe(
                Effect.zipRight(Effect.sync(() => writer.write(`${command}\n`))),
                Effect.forkScoped
              )
            }
            get.subscribe(
              terminalThemeRx,
              (theme) => {
                spawned.terminal.options.theme = theme
              },
              { immediate: true }
            )
            yield* get.stream(terminalSize).pipe(
              Stream.runForEach(() => spawned.resize),
              Effect.forkScoped
            )
            spawned.terminal.open(element)
            return spawned.terminal
          }, Effect.tapErrorCause(Effect.logError))
        )
      )

      let size = 0
      const terminalSize = Rx.writable(
        () => size,
        (ctx, _: void) => ctx.setSelf(size++)
      ).pipe(Rx.debounce("250 millis"))

      return {
        selectedFile,
        createTerminal,
        terminalSize,
        workspace: handle.workspace,
        run: handle.run,
        workspaceRx: handle.workspace,
        createFile: Rx.fn<Parameters<typeof handle.createFile>>()(
          Effect.fnUntraced(function* (params, get) {
            const node = yield* handle.createFile(...params)
            if (node._tag === "File") {
              get.set(selectedFile, node)
            }
          })
        ),
        renameFile: Rx.fn<Parameters<typeof handle.renameFile>>()(
          Effect.fnUntraced(function* (params, get) {
            const node = yield* handle.renameFile(...params)
            if (node._tag === "Directory") {
              return
            }
            const workspace = get(handle.workspace)
            if (Option.isNone(workspace.pathTo(get(selectedFile)))) {
              get.set(selectedFile, node)
            }
          })
        ),
        removeFile: Rx.fn<File | Directory>()(
          Effect.fnUntraced(function* (node, get) {
            yield* handle.removeFile(node)
            const workspace = get(handle.workspace)
            if (workspace.pathTo(get(selectedFile))._tag === "None") {
              get.set(selectedFile, workspace.initialFile)
            }
          })
        )
      } as const
    })
  )
)

function setupWorkspaceTypeAcquisition(workspace: Workspace) {
  return Effect.gen(function* () {
    const container = yield* WebContainer

    function addExtraLib(path: string, content: string) {
      return Effect.sync(() => {
        monaco.languages.typescript.typescriptDefaults.addExtraLib(content, `file://${path}`)
      })
    }

    function acquireTypesAt(storePath: string, packagePath?: string): Effect.Effect<void> {
      return Effect.gen(function* () {
        const path = packagePath ?? `${storePath}/node_modules`

        const [files, directories] = yield* container
          .readDirectory(path)
          .pipe(
            Effect.map((entries) =>
              Array.partitionMap(entries, (entry) =>
                entry.isDirectory() ? Either.right(entry.name) : Either.left(entry.name)
              )
            )
          )

        yield* Effect.forEach(
          files,
          (file) => {
            if (file === "package.json" || file.endsWith(".d.ts")) {
              // Construct the full path to the file on the file system
              const fullPath = `${path}/${file}`
              // Read the contents of the file
              return container.readFileString(fullPath).pipe(
                Effect.flatMap((content) => {
                  // Remove the store path from the file path before adding to
                  // Monaco's TypeScript extra libraries
                  const extraLib = fullPath.replace(storePath, "")
                  return addExtraLib(extraLib, content)
                }),
                Effect.catchTag("FileNotFoundError", () => Effect.void)
              )
            }
            return Effect.void
          },
          { concurrency: files.length, discard: true }
        )

        yield* Effect.forEach(directories, (directory) => acquireTypesAt(storePath, `${path}/${directory}`), {
          concurrency: directories.length,
          discard: true
        })
      }).pipe(Effect.ignore)
    }

    /**
     * This method will traverse the `.pnpm` store and recursively add any
     * `.d.ts` files found to Monaco's extra TypeScript libraries.
     *
     * Directories under `/ node_modules /.pnpm` are processed concurrently and
     * have the following structure:
     *
     * ```
     * /node_modules/.pnpm/<content-address>/node_modules/[...<dependency>]
     * ```
     *
     * where the `content-address` is a combination of package name, version,
     * and other installed dependencies with their versions, and
     * `[...dependency]` represents a set of directories containing the package
     * dependencies.
     *
     * Dependencies can either be directories containing the package dependency
     * itself, or a symlink to another package in the pnpm store. Given we are
     * traversing all packages in the store, we only care about recursing into
     * non-symlinked directories.
     */
    const pnpmStorePath = workspace.relativePath("/node_modules/.pnpm")
    const acquireTypes = container.readDirectory(pnpmStorePath).pipe(
      Effect.map(
        Array.filterMap((entry) =>
          entry.isDirectory()
            ? // Construct the full path to the package's dependencies
              Option.some(`${pnpmStorePath}/${entry.name}`)
            : Option.none()
        )
      ),
      Effect.flatMap(
        Effect.forEach((storePath) => acquireTypesAt(storePath), {
          concurrency: "unbounded"
        })
      )
    )

    const packageJson = workspace.findFile("package.json")
    if (Option.isNone(packageJson)) {
      return
    }

    const path = yield* Effect.orDie(workspace.fullPathTo(packageJson.value[0]))
    const [initial, updates] = yield* container.watchFile(path).pipe(Stream.peel(Sink.head()))
    if (Option.isNone(initial)) {
      return
    }

    // Perform initial registration of dependencies
    yield* acquireTypes

    // Handle updates to the `package.json` dependencies (i.e. from a user
    // running `pnpm install <package>`)
    yield* updates.pipe(
      Stream.runForEach(() => acquireTypes),
      Effect.forkScoped
    )
  })
}

interface FormatterPlugin {
  readonly language: string
  readonly formatter: Formatter
}

function setupWorkspaceFormatters(workspace: Workspace) {
  return Effect.gen(function* () {
    const toaster = yield* Toaster
    const container = yield* WebContainer

    monaco.editor.addEditorAction({
      id: "format",
      label: "Format",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: (editor) => {
        const action = editor.getAction("editor.action.formatDocument")
        if (action) {
          action.run()
        }
      }
    })

    const formatters = new Map<string, Formatter>()

    const pluginCache = yield* Cache.make({
      capacity: 10,
      timeToLive: Number.MAX_SAFE_INTEGER,
      lookup: (plugin: string) => loadPlugin(plugin)
    })

    const LANGUAGE_REGEX = /^\/vendor\/dprint\/plugins\/([a-zA-Z0-9_-]+)-.*\.wasm$/

    function extractLanguage(input: string) {
      const match = input.match(LANGUAGE_REGEX)
      return match ? match[1] : null
    }

    function loadPlugin(plugin: string): Effect.Effect<FormatterPlugin> {
      return Effect.all({
        language: Effect.fromNullable(extractLanguage(plugin)),
        formatter: Effect.promise(() => createStreaming(fetch(plugin)))
      }).pipe(Effect.orDie)
    }

    function loadPlugins(plugins: Array<string>) {
      return Effect.forEach(plugins, (plugin) => pluginCache.get(plugin), {
        concurrency: plugins.length
      })
    }

    function installPlugins(plugins: Array<FormatterPlugin>) {
      return Effect.forEach(
        plugins,
        ({ language, formatter }) =>
          Effect.sync(() => {
            monaco.languages.registerDocumentFormattingEditProvider(language, {
              provideDocumentFormattingEdits(model) {
                return [
                  {
                    text: formatter.formatText({
                      fileText: model.getValue(),
                      filePath: model.uri.toString()
                    }),
                    range: model.getFullModelRange()
                  }
                ]
              }
            })
          }),
        { concurrency: plugins.length, discard: true }
      )
    }

    function setLanguageConfig(language: string, config: any) {
      const formatter = formatters.get(language)
      if (formatter) {
        formatter.setConfig({}, config)
      }
    }

    const parseJson = Option.liftThrowable(JSON.parse)

    function configurePlugin(config: string) {
      return parseJson(config).pipe(
        Effect.flatMap((json) =>
          Effect.sync(() => {
            const { plugins, ...rest } = json
            return Object.entries(rest).forEach(([language, config]) => {
              setLanguageConfig(language, config)
            })
          })
        ),
        Effect.ignoreLogged
      )
    }

    const config = workspace.findFile("dprint.json")
    if (Option.isNone(config)) {
      return
    }

    yield* parseJson(config.value[0].initialContent).pipe(
      Effect.flatMap((json) => loadPlugins(json.plugins as Array<string>)),
      Effect.tap((plugins) => installPlugins(plugins)),
      Effect.map((plugins) =>
        plugins.forEach(({ language, formatter }) => {
          formatters.set(language, formatter)
        })
      ),
      Effect.ignoreLogged
    )

    const path = yield* Effect.orDie(workspace.fullPathTo(config.value[0]))
    const [initial, updates] = yield* container.watchFile(path).pipe(Stream.peel(Sink.head()))
    if (Option.isNone(initial)) {
      return
    }

    // Perform initial plugin configuration
    yield* configurePlugin(initial.value)

    // Handle updates to plugin configuration
    yield* updates.pipe(
      Stream.tap(() =>
        toaster.toast({
          title: "Effect Playground",
          description: "Updated formatter settings!"
        })
      ),
      Stream.runForEach(configurePlugin),
      Effect.forkScoped
    )
  })
}

export const main = makeFile(
  "main.ts",
  `import { NodeRuntime } from "@effect/platform-node"
import { Effect } from "effect"
import { DevToolsLive } from "./DevTools"

const program = Effect.gen(function*() {
  yield* Effect.log("Welcome to the Effect Playground!")
}).pipe(Effect.withSpan("program", {
  attributes: { source: "Playground" }
}))

program.pipe(
  Effect.provide(DevToolsLive),
  NodeRuntime.runMain
)
`
)

const devTools = makeFile(
  "DevTools.ts",
  `import { DevTools } from "@effect/experimental"
import { NodeSocket } from "@effect/platform-node"
import { Layer } from "effect"

export const DevToolsLive = DevTools.layerSocket.pipe(
  Layer.provide(NodeSocket.layerNet({ port: 34437 }))
)
`
)

export const defaultWorkspace = new Workspace({
  name: "playground",
  dependencies: {
    "@effect/experimental": "latest",
    "@effect/platform": "latest",
    "@effect/platform-node": "latest",
    "@types/node": "latest",
    effect: "latest",
    "tsc-watch": "latest",
    typescript: "latest"
  },
  shells: [new WorkspaceShell({ command: "../run src/main.ts" })],
  initialFilePath: "src/main.ts",
  tree: [makeDirectory("src", [main, devTools])]
})

export function makeDefaultWorkspace() {
  return defaultWorkspace.withName(`playground-${Date.now()}`)
}
