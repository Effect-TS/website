import { themeRx } from "@/rx/theme"
import { Rx } from "@effect-rx/rx-react"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Stream from "effect/Stream"
import {
  Directory,
  File,
  Workspace,
  WorkspaceShell
} from "./domain/workspace"
import {
  MonokaiSodaTheme,
  NightOwlishLightTheme,
  Terminal
} from "./services/Terminal"
import { WebContainer } from "./services/WebContainer"
import { pipe } from "effect"

const runtime = Rx.runtime(Layer.mergeAll(WebContainer.Live, Terminal.Live))

const terminalTheme = Rx.map(themeRx, (theme) =>
  theme === "light" ? NightOwlishLightTheme : MonokaiSodaTheme
)

export const workspaceHandleRx = Rx.family((workspace: Workspace) =>
  pipe(
    runtime.rx((get) =>
      Effect.gen(function* () {
        const { spawn } = yield* Terminal
        yield* Effect.log("building")
        const handle = yield* WebContainer.workspace(workspace)

        const prepare = yield* handle
          .run(workspace.prepare)
          .pipe(Effect.forkScoped)

        const selectedFile = Rx.make(workspace.initialFile)

        const solved = Rx.make(false)

        let size = 0
        const terminalSize = Rx.writable(
          () => size,
          function (ctx, _value: void) {
            ctx.setSelf(size++)
          }
        ).pipe(Rx.debounce(250))

        const terminal = Rx.family((env: WorkspaceShell) =>
          Rx.make((get) =>
            Effect.gen(function* () {
              yield* Effect.log("building")
              yield* Effect.addFinalizer(() => Effect.log("releasing"))
              const shell = yield* handle.shell
              const { terminal, resize } = yield* spawn({
                theme: get.once(terminalTheme)
              })
              const input = shell.input.getWriter()

              const mount = Effect.sync(() => {
                shell.output.pipeTo(
                  new WritableStream({
                    write(data) {
                      terminal.write(data)
                    }
                  })
                )
                terminal.onData((data) => {
                  input.write(data)
                })
              })

              terminal.write("Loading workspace...\n")

              yield* Effect.gen(function* () {
                input.write(`cd "${workspace.name}" && clear\n`)
                yield* prepare.await
                if (env.command) {
                  yield* Effect.sleep(3000)
                  yield* mount
                  input.write(`${env.command}\n`)
                } else {
                  yield* mount
                }
              }).pipe(Effect.forkScoped)

              get.subscribe(terminalTheme, (theme) => {
                terminal.options.theme = theme
              })

              yield* get.stream(terminalSize).pipe(
                Stream.runForEach(() => resize),
                Effect.forkScoped
              )

              return terminal
            }).pipe(Effect.annotateLogs({ rx: "terminalRx" }))
          )
        )

        yield* get.stream(solved, { withoutInitialValue: true }).pipe(
          Stream.runForEach((solve) =>
            Effect.forEach(workspace.filePaths, ([file, path]) =>
              file._tag === "Directory"
                ? Effect.void
                : handle.write(
                    path,
                    solve
                      ? file.solution ?? file.initialContent
                      : file.initialContent
                  )
            )
          ),
          Effect.forkScoped
        )

        return {
          workspace: Rx.subscriptionRef(handle.workspace),
          handle,
          terminal,
          terminalSize,
          selectedFile,
          solved,
          create: Rx.fn((params: Parameters<typeof handle.create>, get) =>
            Effect.gen(function* () {
              const node = yield* handle.create(...params)
              if (node._tag === "File") {
                yield* get.set(selectedFile, node)
              }
            })
          ),
          rename: Rx.fn((params: Parameters<typeof handle.rename>) =>
            Effect.gen(function* () {
              const node = yield* handle.rename(...params)
              if (node._tag === "Directory") {
                return
              }
              const workspace = yield* handle.workspace.get
              if (workspace.pathTo(get.once(selectedFile))._tag === "None") {
                yield* get.set(selectedFile, node)
              }
            })
          ),
          remove: Rx.fn((node: File | Directory) =>
            Effect.gen(function* () {
              yield* handle.remove(node)
              const workspace = yield* handle.workspace.get
              if (workspace.pathTo(get.once(selectedFile))._tag === "None") {
                yield* get.set(selectedFile, workspace.initialFile)
              }
            })
          )
        } as const
      }).pipe(
        Effect.annotateLogs({
          workspace: workspace.name,
          rx: "workspaceHandleRx"
        })
      )
    ),
    Rx.setIdleTTL("10 seconds")
  )
)

export interface RxWorkspaceHandle
  extends Rx.Rx.InferSuccess<ReturnType<typeof workspaceHandleRx>> {}
