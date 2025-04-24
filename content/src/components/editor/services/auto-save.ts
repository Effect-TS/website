import { Effect, Option } from "effect"
import { WorkspaceCompression } from "./compression"
import type { Workspace } from "../domain/workspace"
import { WebContainer } from "./webcontainer"

export class AutoSave extends Effect.Service<AutoSave>()("app/AutoSave", {
  dependencies: [WorkspaceCompression.Default],
  effect: Effect.gen(function* () {
    const compression = yield* WorkspaceCompression
    return {
      saveToLocal: (workspace: Workspace, sessionId: string) =>
        Effect.gen(function* () {
          const container = yield* WebContainer

          const compressed = yield* compression.compress(
            workspace,
            container.readFileString
          )

          localStorage.setItem(sessionId, compressed)
        }),

      restoreFromLocal: (sessionId: string) => {
        const compressed = localStorage.getItem(sessionId)

        return Option.fromNullable(compressed).pipe(
          Effect.transposeMapOption(compression.decompress)
        )
      },

      resetLocal: (sessionId: string) => {
        return Effect.sync(() => localStorage.removeItem(sessionId))
      }
    }
  })
}) {}
