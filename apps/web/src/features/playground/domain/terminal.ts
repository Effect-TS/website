import * as Data from "effect/Data"

export class WorkspaceTerminal extends Data.Class<{
  command: string | undefined
}> {}
