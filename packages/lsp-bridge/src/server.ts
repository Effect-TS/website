import * as NodeChildProcessSpawner from "@effect/platform-node/NodeChildProcessSpawner"
import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as NodeServices from "@effect/platform-node/NodeServices"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { startBridgeServer } from "./BridgeServer.ts"
import { makeTsrsLspStdioLayer } from "./TsrsProcess.ts"
import { createLocalReadOnlyWorkspace, resolveTsrsBinary } from "./Workspace.ts"

const port = Number.parseInt(process.env.PORT ?? "8787", 10)
const host = process.env.HOST ?? "127.0.0.1"
const configuredWorkspace = process.env.WORKSPACE_DIR

const program = Effect.scoped(
  Effect.gen(function* () {
    const binaryPath = resolveTsrsBinary()
    const localWorkspace =
      configuredWorkspace === undefined
        ? createLocalReadOnlyWorkspace()
        : undefined
    const workspaceDir = configuredWorkspace ?? localWorkspace!.rootDir

    if (localWorkspace !== undefined) {
      yield* Effect.addFinalizer(() =>
        Effect.sync(() => localWorkspace.cleanup()),
      )
    }

    const stdioLayer = makeTsrsLspStdioLayer({
      binaryPath,
      workspaceDir,
    })

    const { url } = yield* startBridgeServer({
      host,
      port,
      workspaceDir,
    }).pipe(Effect.provide(stdioLayer))

    yield* Effect.logInfo(`lsp-bridge listening on ${url}`).pipe(
      Effect.annotateLogs({
        component: "lsp-bridge",
        binaryPath,
        workspaceDir,
      }),
    )

    return yield* Effect.never
  }),
).pipe(
  Effect.provide(
    NodeChildProcessSpawner.layer.pipe(Layer.provide(NodeServices.layer)),
  ),
)

NodeRuntime.runMain(program)
