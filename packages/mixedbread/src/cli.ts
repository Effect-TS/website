#!/usr/bin/env node

import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as NodeServices from "@effect/platform-node/NodeServices"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as CliConfig from "effect/unstable/cli/CliConfig"
import * as Command from "effect/unstable/cli/Command"
import * as Flag from "effect/unstable/cli/Flag"
import { Help } from "effect/unstable/cli/GlobalFlag"
import { Mixedbread } from "./Mixedbread.ts"

if (
  process.env.MXBAI_ADMIN_API_KEY === undefined &&
  process.argv.some((argument) => argument === "--help" || argument === "-h")
) {
  process.env.MXBAI_ADMIN_API_KEY = "help"
}

const pullRequest = Flag.integer("pr").pipe(
  Flag.withDescription("Pull request number that identifies the preview store"),
  Flag.optional,
)
const revision = Flag.string("sha").pipe(
  Flag.withDescription("Git commit SHA associated with the indexed content"),
)
const scope = Flag.choice("scope", ["all", "markdown", "api-reference"]).pipe(
  Flag.withDefault("all"),
  Flag.withDescription("Content scope to synchronize"),
)
const deletePullRequest = Flag.integer("pr").pipe(
  Flag.withDescription("Pull request number that identifies the preview store"),
)
const syncCommand = Command.make("sync", { pullRequest, revision, scope }).pipe(
  Command.withDescription(
    "Synchronize a Mixedbread documentation search store",
  ),
  Command.withHandler(({ pullRequest, revision, scope }) =>
    Option.match(pullRequest, {
      onNone: () =>
        Mixedbread.use((mixedbread) =>
          mixedbread.syncProduction(revision, scope),
        ),
      onSome: (pullRequest) =>
        Effect.gen(function* () {
          const storeId = process.env.MXBAI_VECTOR_STORE_ID
          if (storeId === undefined) {
            return yield* Effect.fail(
              new Error(
                "MXBAI_VECTOR_STORE_ID is required when synchronizing a preview",
              ),
            )
          }
          yield* Mixedbread.use((mixedbread) =>
            mixedbread.syncStore(
              { kind: "preview", pullRequest, revision, storeId },
              scope,
            ),
          )
        }),
    }),
  ),
)
const deleteCommand = Command.make("delete-preview", {
  pullRequest: deletePullRequest,
}).pipe(
  Command.withDescription("Delete a pull request's Mixedbread preview store"),
  Command.withHandler(({ pullRequest }) =>
    Mixedbread.use((mixedbread) => mixedbread.deleteStore({ pullRequest })),
  ),
)
const indexCommand = Command.make("mixedbread").pipe(
  Command.withDescription("Manage Mixedbread documentation search stores"),
  Command.withSubcommands([syncCommand, deleteCommand]),
)
const program = Command.run(indexCommand, { version: "0.0.0" })
const MainLayer = Mixedbread.layer.pipe(
  Layer.provideMerge([
    CliConfig.layer({ builtIns: [Help] }),
    NodeServices.layer,
  ]),
  Layer.orDie,
)

program.pipe(Effect.provide(MainLayer), NodeRuntime.runMain)
