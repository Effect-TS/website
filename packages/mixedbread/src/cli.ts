#!/usr/bin/env node

import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as NodeServices from "@effect/platform-node/NodeServices"
import * as Config from "effect/Config"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as CliConfig from "effect/unstable/cli/CliConfig"
import * as Command from "effect/unstable/cli/Command"
import * as Flag from "effect/unstable/cli/Flag"
import { Help } from "effect/unstable/cli/GlobalFlag"
import { Mixedbread } from "./Mixedbread.ts"
import * as Preview from "./Preview.ts"
import { SearchChanges } from "./SearchChanges.ts"

const pullRequest = Flag.integer("pr").pipe(
  Flag.withDescription("Pull request number that identifies the preview store"),
)

const revision = Flag.string("sha").pipe(
  Flag.withDescription("Git commit SHA associated with the indexed content"),
)

const scope = Flag.choice("scope", ["all", "markdown", "api-reference"]).pipe(
  Flag.withDefault("all"),
  Flag.withDescription("Content scope to synchronize"),
)

const base = Flag.string("base").pipe(
  Flag.withDescription("Base Git revision to compare"),
)

const head = Flag.string("head").pipe(
  Flag.withDescription("Head Git revision to compare"),
)

const syncCommand = Command.make("sync", {
  pullRequest: Flag.optional(pullRequest),
  revision,
  scope,
}).pipe(
  Command.withDescription(
    "Synchronize a Mixedbread documentation search store",
  ),
  Command.withHandler(({ pullRequest, revision, scope }) =>
    Option.match(pullRequest, {
      onNone: () =>
        Mixedbread.use((mixedbread) =>
          mixedbread.syncProduction(revision, scope),
        ),
      onSome: Effect.fnUntraced(function* (pullRequest) {
        const storeId = yield* Config.string("MXBAI_VECTOR_STORE_ID")
        return yield* Mixedbread.use((mixedbread) =>
          mixedbread.syncStore(
            { kind: "preview", pullRequest, revision, storeId },
            scope,
          ),
        )
      }),
    }),
  ),
  Command.provide(Mixedbread.layer),
)

const deleteCommand = Command.make("delete-preview", {
  pullRequest,
}).pipe(
  Command.withDescription("Delete a pull request's Mixedbread preview store"),
  Command.withHandler(({ pullRequest }) =>
    Mixedbread.use((mixedbread) => mixedbread.deleteStore({ pullRequest })),
  ),
  Command.provide(Mixedbread.layer),
)

const searchChangesCommand = Command.make("search-changes", {
  base,
  head,
}).pipe(
  Command.withDescription(
    "Detect whether a Git diff changes the Mixedbread search index",
  ),
  Command.withHandler(({ base, head }) =>
    SearchChanges.use((searchChanges) =>
      searchChanges.between(base, head),
    ).pipe(Effect.flatMap((changed) => Console.log(String(changed)))),
  ),
  Command.provide(SearchChanges.layer),
)

const previewStageCommand = Command.make("preview-stage", {
  pullRequest,
}).pipe(
  Command.withDescription("Compute a validated Alchemy preview stage"),
  Command.withHandler(({ pullRequest }) =>
    Preview.stage(pullRequest).pipe(Effect.flatMap(Console.log)),
  ),
)

const indexCommand = Command.make("mixedbread").pipe(
  Command.withDescription("Manage Mixedbread documentation search stores"),
  Command.withSubcommands([
    syncCommand,
    deleteCommand,
    searchChangesCommand,
    previewStageCommand,
  ]),
)

const program = Command.run(indexCommand, { version: "0.0.0" })

const MainLayer = Layer.mergeAll(
  CliConfig.layer({ builtIns: [Help] }),
  NodeServices.layer,
)

program.pipe(Effect.provide(MainLayer), NodeRuntime.runMain)
