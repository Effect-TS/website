import { createStreaming, type Formatter } from "@dprint/formatter"
import * as monaco from "@effect/monaco-editor"
import * as Array from "effect/Array"
import * as Cache from "effect/Cache"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Result from "effect/Result"
import * as Sink from "effect/Sink"
import * as Stream from "effect/Stream"
import * as Tuple from "effect/Tuple"
import * as Atom from "effect/unstable/reactivity/Atom"
import {
  Directory,
  File,
  defaultWorkspace,
  Workspace,
  WorkspaceTerminal,
} from "../domain/workspace"
import { DevToolsLayer } from "../services/devtools"
import { Loader } from "../services/loader"
import { Terminal } from "../services/terminal"
import { Dracula, NightOwlishLight } from "../services/terminal/themes"
import { Toaster } from "../services/toaster"
import { WebContainer } from "../services/webcontainer"
import { themeAtom } from "./theme"

const runtime = Atom.runtime(
  Layer.mergeAll(Loader.layer, Terminal.layer, Toaster.layer, DevToolsLayer, WebContainer.layer),
)

const terminalThemeAtom = themeAtom.pipe(
  Atom.map((theme) => (theme === "light" ? NightOwlishLight : Dracula)),
)

export interface AtomWorkspaceHandle extends Atom.Success<ReturnType<typeof workspaceHandleAtom>> {}

export const workspaceHandleAtom = Atom.family((workspace: Workspace) =>
  runtime.atom(
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
          ([file, path]: [File | Directory, string]) => {
            if (file._tag === "Directory") {
              return Effect.void
            }
            return container.loadModel(
              workspace.relativePath(path),
              file.initialContent,
              file.language ?? "typescript",
            )
          },
          { discard: true },
        )
      }

      /**
       * Load the file system of the workspace into the WebContainer
       */
      yield* loadWorkspace(workspace).pipe(loader.withIndicator("Preparing workspace"))

      const selectedFile = Atom.make(workspace.initialFile)

      const createTerminal = Atom.family(({ command }: WorkspaceTerminal) => {
        const element = Atom.make(Option.none<HTMLElement>())
        const terminalAtom = runtime.atom(
          Effect.fnUntraced(function* (get) {
            const el = yield* get.some(element)
            const spawned = yield* terminal.spawn({
              theme: get.once(terminalThemeAtom),
            })
            spawned.terminal.open(el)
            const process = yield* container.createShell(workspace.name, {
              cols: spawned.terminal.cols,
              rows: spawned.terminal.rows,
            })
            const writer = process.input.getWriter()
            const mount = Effect.sync(() => {
              process.output.pipeTo(
                new WritableStream({
                  write(data) {
                    spawned.terminal.write(data)
                  },
                }),
              )
              spawned.terminal.onResize((dimensions) => {
                process.resize(dimensions)
              })
              process.resize({
                cols: spawned.terminal.cols,
                rows: spawned.terminal.rows,
              })
              spawned.terminal.onData((data) => {
                writer.write(data)
              })
            })
            yield* mount

            // Install workspace dependencies, perform type acquisition, etc.
            // in the background
            const fiber = yield* handle.spawn(workspace.prepare).pipe(
              Effect.tap((process) =>
                Effect.promise(() =>
                  process.output.pipeTo(
                    new WritableStream({
                      write(data) {
                        spawned.terminal.write(data)
                      },
                    }),
                  ),
                ),
              ),
              Effect.flatMap((process) => Effect.promise(() => process.exit)),
              Effect.andThen(setupWorkspaceTypeAcquisition(workspace)),
              Effect.andThen(setupWorkspaceFormatters(workspace)),
              Effect.forkScoped,
            )

            if (command !== undefined) {
              // Wait for dependencies, type acquisition, etc. to finish before
              // running the workspace command
              yield* Fiber.join(fiber).pipe(
                Effect.andThen(Effect.promise(() => writer.write(`${command}\n`))),
                Effect.forkScoped,
              )
            }

            get.subscribe(
              terminalThemeAtom,
              (theme) => {
                spawned.terminal.options.theme = theme
              },
              { immediate: true },
            )
            yield* get.stream(terminalSize).pipe(
              Stream.runForEach(() => spawned.resize),
              Effect.forkScoped,
            )
            return spawned.terminal
          }, Effect.tapCause(Effect.logError)),
        )
        return { element, terminal: terminalAtom } as const
      })

      let size = 0
      const terminalSize = Atom.writable(
        () => size,
        (ctx, _: void) => ctx.setSelf(size++),
      ).pipe(Atom.debounce("250 millis"))

      const resetContent = Atom.fn<void>()(
        Effect.fnUntraced(function* (_, get) {
          const currentWorkspace = get(handle.workspace)
          const resetWorkspace = new Workspace({
            name: currentWorkspace.name,
            tree: defaultWorkspace.tree,
            initialFilePath: defaultWorkspace.initialFilePath,
            prepare: defaultWorkspace.prepare,
            shells: currentWorkspace.shells,
            snapshots: defaultWorkspace.snapshots,
          })
          const files = Array.filterMap([...resetWorkspace.filePaths], ([file, path]) =>
            file._tag === "File" ? Result.succeed(Tuple.make(file, path)) : Result.failVoid,
          )
          yield* Effect.forEach(
            files,
            ([file, path]) =>
              Effect.gen(function* () {
                const fullPath = resetWorkspace.relativePath(path)
                const parts = fullPath.split("/")
                if (parts.length > 1) {
                  const parentDir = parts.slice(0, -1).join("/")
                  yield* container.makeDirectory(parentDir).pipe(Effect.ignore)
                }
                yield* container.writeFile(
                  fullPath,
                  file.initialContent,
                  file.language ?? "typescript",
                )
              }).pipe(Effect.ignore),
            { concurrency: "unbounded", discard: true },
          )
          get.set(handle.workspace, resetWorkspace)
          get.set(selectedFile, resetWorkspace.initialFile)
        }),
      )

      return {
        selectedFile,
        createTerminal,
        terminalSize,
        workspace: handle.workspace,
        run: handle.run,
        workspaceAtom: handle.workspace,
        readFile: (path: string) => container.readFile(path),
        writeFile: (path: string, content: string, language: string) =>
          container.writeFile(path, content, language),
        createFile: Atom.fn<Parameters<typeof handle.createFile>>()(
          Effect.fnUntraced(function* (params, get) {
            const node = yield* handle.createFile(...params)
            if (node._tag === "File") {
              get.set(selectedFile, node)
            }
          }),
        ),
        renameFile: Atom.fn<Parameters<typeof handle.renameFile>>()(
          Effect.fnUntraced(function* (params, get) {
            const node = yield* handle.renameFile(...params)
            if (node._tag === "Directory") {
              return
            }
            const workspace = get(handle.workspace)
            if (Option.isNone(workspace.pathTo(get(selectedFile)))) {
              get.set(selectedFile, node)
            }
          }),
        ),
        removeFile: Atom.fn<File | Directory>()(
          Effect.fnUntraced(function* (node, get) {
            yield* handle.removeFile(node)
            const workspace = get(handle.workspace)
            if (workspace.pathTo(get(selectedFile))._tag === "None") {
              get.set(selectedFile, workspace.initialFile)
            }
          }),
        ),
        resetContent,
      } as const
    }),
  ),
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
              Array.partition(entries, (entry) =>
                entry.isDirectory() ? Result.succeed(entry.name) : Result.fail(entry.name),
              ),
            ),
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
                Effect.catchTag("FileNotFoundError", () => Effect.void),
              )
            }
            return Effect.void
          },
          { concurrency: files.length, discard: true },
        )

        yield* Effect.forEach(
          directories,
          (directory) => {
            // Skip node_modules symlink inside .pnpm to avoid circular path
            if (directory === "node_modules") return Effect.void
            return acquireTypesAt(storePath, `${path}/${directory}`)
          },
          {
            concurrency: directories.length,
            discard: true,
          },
        )
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
          entry.isDirectory() && entry.name !== "node_modules"
            ? Result.succeed(`${pnpmStorePath}/${entry.name}`)
            : Result.failVoid,
        ),
      ),
      Effect.flatMap(
        Effect.forEach((storePath) => acquireTypesAt(storePath), {
          concurrency: "unbounded",
        }),
      ),
    )

    const packageJson = workspace.findFile("package.json")
    if (Option.isNone(packageJson)) {
      return
    }

    const path: string = Option.getOrThrow(workspace.fullPathTo(packageJson.value[0]))
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
      Effect.forkScoped,
    )
  })
}

interface FormatterPlugin {
  readonly language: string
  readonly formatter: Formatter
}

interface InstalledFormatter extends FormatterPlugin {
  readonly dispose: () => void
}

class FormatterPluginLoadError extends Data.TaggedError("FormatterPluginLoadError")<{
  readonly plugin: string
  readonly cause: unknown
}> {
  override get message(): string {
    return `Failed to load formatter plugin '${this.plugin}'. Verify that the URL points to an available dprint WASM plugin.`
  }
}

class FormatterPluginUrlError extends Data.TaggedError("FormatterPluginUrlError")<{
  readonly plugin: string
}> {
  override get message(): string {
    return `Invalid formatter plugin URL '${this.plugin}'. Use a fully qualified dprint plugin URL such as 'https://plugins.dprint.dev/json-0.23.0.wasm'.`
  }
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
      },
    })

    const installedFormatters = new Map<string, InstalledFormatter>()

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        installedFormatters.forEach(({ dispose }) => dispose())
      }),
    )

    const pluginCache = yield* Cache.make({
      capacity: 10,
      timeToLive: Number.MAX_SAFE_INTEGER,
      lookup: (plugin: string) => loadPlugin(plugin),
    })

    const PLUGIN_URL_REGEX =
      /^(?:https:\/\/plugins\.dprint\.dev|\/vendor\/dprint\/plugins)\/([a-zA-Z0-9][a-zA-Z0-9._-]*\.wasm)$/

    function parsePluginUrl(plugin: string) {
      const match = plugin.match(PLUGIN_URL_REGEX)
      return match
        ? {
            url: `/api/dprint/plugins/${match[1]}`,
          }
        : null
    }

    function loadPlugin(
      plugin: string,
    ): Effect.Effect<FormatterPlugin, FormatterPluginUrlError | FormatterPluginLoadError> {
      const parsed = parsePluginUrl(plugin)
      if (parsed === null) {
        return Effect.fail(new FormatterPluginUrlError({ plugin }))
      }
      return Effect.tryPromise({
        try: () => createStreaming(fetch(parsed.url)),
        catch: (cause) => new FormatterPluginLoadError({ plugin, cause }),
      }).pipe(
        Effect.map((formatter) => ({
          language: formatter.getPluginInfo().configKey,
          formatter,
        })),
      )
    }

    function loadPlugins(plugins: Array<string>) {
      return Effect.forEach(plugins, (plugin) => Cache.get(pluginCache, plugin), {
        concurrency: Math.max(1, plugins.length),
      })
    }

    function reconcilePlugins(plugins: Array<FormatterPlugin>) {
      return Effect.sync(() => {
        const desiredFormatters = new Map(plugins.map((plugin) => [plugin.language, plugin]))

        installedFormatters.forEach((installed, language) => {
          if (desiredFormatters.get(language)?.formatter !== installed.formatter) {
            installed.dispose()
            installedFormatters.delete(language)
          }
        })

        desiredFormatters.forEach(({ language, formatter }) => {
          if (!installedFormatters.has(language)) {
            const registration = monaco.languages.registerDocumentFormattingEditProvider(language, {
              provideDocumentFormattingEdits(model) {
                return [
                  {
                    text: formatter.formatText({
                      fileText: model.getValue(),
                      filePath: model.uri.toString(),
                    }),
                    range: model.getFullModelRange(),
                  },
                ]
              },
            })
            installedFormatters.set(language, {
              language,
              formatter,
              dispose: () => registration.dispose(),
            })
          }
        })
      })
    }

    const parseJson = (s: string) => Effect.try(() => JSON.parse(s))

    function reconcileConfig(config: string) {
      return parseJson(config).pipe(
        Effect.flatMap((json) =>
          loadPlugins(json.plugins as Array<string>).pipe(
            Effect.tap(reconcilePlugins),
            Effect.tap(() =>
              Effect.sync(() => {
                const { plugins: _plugins, ...pluginConfigs } = json
                installedFormatters.forEach(({ formatter }, language) => {
                  formatter.setConfig({}, pluginConfigs[language] ?? {})
                })
              }),
            ),
          ),
        ),
      )
    }

    function showConfigError(error: unknown) {
      return toaster.toast({
        title: "Unable to update formatter configuration",
        description:
          error instanceof Error
            ? error.message
            : "The formatter configuration could not be updated. Check dprint.json and try again.",
      })
    }

    const config = workspace.findFile("dprint.json")
    if (Option.isNone(config)) {
      return
    }

    const path: string = Option.getOrThrow(workspace.fullPathTo(config.value[0]))
    const [initial, updates] = yield* container.watchFile(path).pipe(Stream.peel(Sink.head()))
    if (Option.isNone(initial)) {
      return
    }

    yield* reconcileConfig(initial.value).pipe(Effect.catch(showConfigError))

    yield* updates.pipe(
      Stream.runForEach((config) =>
        reconcileConfig(config).pipe(
          Effect.tap(() =>
            toaster.toast({
              title: "Effect Playground",
              description: "Updated formatter configuration!",
            }),
          ),
          Effect.catch(showConfigError),
        ),
      ),
      Effect.forkScoped,
    )
  })
}
