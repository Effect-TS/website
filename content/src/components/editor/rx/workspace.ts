import { Rx } from "@effect-rx/rx-react";
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Stream from "effect/Stream"
import * as SubscriptionRef from "effect/SubscriptionRef"
import { themeRx } from "@/rx/theme"
import { Directory, File, Workspace, WorkspaceShell } from "../domain/workspace"
import { Loader } from "../services/loader";
import { Terminal } from "../services/terminal"
import { Dracula, NightOwlishLight } from "../services/terminal/themes"
import { WebContainer } from "../services/webcontainer"

const runtime = Rx.runtime(Layer.mergeAll(
  Loader.Default,
  Terminal.Default,
  WebContainer.Default
))

const terminalThemeRx = themeRx.pipe(Rx.map((theme) =>
  theme === "light" ? NightOwlishLight : Dracula
))

export interface RxWorkspaceHandle extends Rx.Rx.InferSuccess<ReturnType<typeof workspaceHandleRx>> { }

export const workspaceHandleRx = Rx.family((workspace: Workspace) =>
  runtime.rx(
    Effect.gen(function*() {
      const container = yield* WebContainer
      const loader = yield* Loader
      const terminal = yield* Terminal

      const handle = yield* container.createWorkspaceHandle(workspace)

      const selectedFile = Rx.make(workspace.initialFile)

      const createTerminal = Rx.family(({ command }: WorkspaceShell) =>
        Rx.make((get) =>
          Effect.gen(function*() {
            const shell = yield* container.createShell
            const spawned = yield* terminal.spawn({
              theme: get.once(terminalThemeRx)
            })
            const writer = shell.input.getWriter()
            const mount = Effect.sync(() => {
              shell.output.pipeTo(new WritableStream({
                write(data) {
                  spawned.terminal.write(data)
                }
              }))
              spawned.terminal.onData((data) => {
                writer.write(data)
              })
            })
            yield* Effect.forkScoped(mount)
            writer.write(`cd "${workspace.name}" && clear\n`)
            yield* loader.await
            if (command !== undefined) {
              writer.write(`${command}\n`)
            }
            get.subscribe(terminalThemeRx, (theme) => {
              spawned.terminal.options.theme = theme
            }, { immediate: true })
            yield* get.stream(terminalSize).pipe(
              Stream.runForEach(() => spawned.resize),
              Effect.forkScoped
            )
            return spawned.terminal
          }).pipe(Effect.tapErrorCause(Effect.logError))
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
        workspaceRx: Rx.subscriptionRef(handle.workspace),
        createFile: Rx.fn((params: Parameters<typeof handle.createFile>, get) =>
          Effect.gen(function*() {
            const node = yield* handle.createFile(...params)
            if (node._tag === "File") {
              yield* get.set(selectedFile, node)
            }
          })
        ),
        renameFile: Rx.fn((params: Parameters<typeof handle.renameFile>, get) =>
          Effect.gen(function*() {
            const node = yield* handle.renameFile(...params)
            if (node._tag === "Directory") {
              return
            }
            const workspace = yield* SubscriptionRef.get(handle.workspace)
            if (Option.isNone(workspace.pathTo(get.once(selectedFile)))) {
              yield* get.set(selectedFile, node)
            }
          })
        ),
        removeFile: Rx.fn((node: File | Directory, get) =>
          Effect.gen(function*() {
            yield* handle.removeFile(node)
            const workspace = yield* handle.workspace.get
            if (workspace.pathTo(get.once(selectedFile))._tag === "None") {
              yield* get.set(selectedFile, workspace.initialFile)
            }
          })
        )
      } as const
    })
  )
)
