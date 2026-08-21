#!/usr/bin/env node

import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as NodeServices from "@effect/platform-node/NodeServices"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Stdio from "effect/Stdio"
import * as Stream from "effect/Stream"
import * as CliConfig from "effect/unstable/cli/CliConfig"
import * as Command from "effect/unstable/cli/Command"
import * as Flag from "effect/unstable/cli/Flag"
import { Help } from "effect/unstable/cli/GlobalFlag"
import { Snapshot } from "./Snapshot.ts"

const write = Effect.fn("cli.write")(function* (value: string) {
  const stdio = yield* Stdio.Stdio
  yield* Stream.make(value).pipe(Stream.run(stdio.stdout()))
})

const optionalString = (name: string, description: string) =>
  Flag.string(name).pipe(Flag.withDescription(description), Flag.optional)

const v3 = Flag.string("v3").pipe(
  Flag.withDescription("Full Effect v3 Git commit SHA"),
)
const v4 = Flag.string("v4").pipe(
  Flag.withDescription("Full Effect v4 Git commit SHA"),
)
const generator = optionalString(
  "generator",
  "Generator digest; computed from source files when omitted",
)
const data = Flag.string("data").pipe(
  Flag.withDescription("API reference data directory"),
)
const output = Flag.string("output").pipe(
  Flag.withDescription("Output file or directory"),
)
const websiteRevision = Flag.string("website-revision").pipe(
  Flag.withDescription("Website Git commit SHA"),
)
const repository = Flag.string("repository").pipe(
  Flag.withDescription("GitHub repository in owner/name form"),
)
const expectedId = Flag.string("expected-id").pipe(
  Flag.withDescription("Expected deterministic snapshot ID"),
)

const identity = <
  A extends {
    readonly v3: string
    readonly v4: string
    readonly generator: Option.Option<string>
  },
>(
  flags: A,
) => ({
  v3: flags.v3,
  v4: flags.v4,
  generator: Option.getOrUndefined(flags.generator),
})

const idCommand = Command.make("id", { v3, v4, generator }).pipe(
  Command.withDescription("Compute a deterministic snapshot ID"),
  Command.withHandler((flags) =>
    Snapshot.use((snapshot) => snapshot.id(identity(flags))).pipe(
      Effect.flatMap(write),
    ),
  ),
  Command.provide(Snapshot.layer),
)

const createCommand = Command.make("create", {
  data,
  output,
  v3,
  v4,
  generator,
  websiteRevision,
}).pipe(
  Command.withDescription("Create a snapshot manifest"),
  Command.withHandler((flags) =>
    Snapshot.use((snapshot) =>
      snapshot.create({
        ...identity(flags),
        data: flags.data,
        output: flags.output,
        websiteRevision: flags.websiteRevision,
      }),
    ),
  ),
  Command.provide(Snapshot.layer),
)

const validateCommand = Command.make("validate", {
  data,
  manifest: Flag.string("manifest").pipe(
    Flag.withDescription("Snapshot manifest path"),
  ),
}).pipe(
  Command.withDescription("Validate a snapshot manifest and datasets"),
  Command.withHandler(({ data, manifest }) =>
    Snapshot.use((snapshot) => snapshot.validate(data, manifest)).pipe(
      Effect.flatMap(write),
    ),
  ),
  Command.provide(Snapshot.layer),
)

const prepareCommand = Command.make("prepare", {
  eventName: Flag.string("event-name"),
  eventRepository: optionalString("event-repository", "Dispatch repository"),
  eventChannel: optionalString("event-channel", "Dispatch API channel"),
  eventRevision: optionalString("event-revision", "Dispatch Git revision"),
  repository,
  v3: Flag.optional(v3),
  v4: Flag.optional(v4),
  generator,
}).pipe(
  Command.withDescription("Resolve revisions and snapshot release state"),
  Command.withHandler((flags) =>
    Snapshot.use((snapshot) =>
      snapshot.prepare({
        eventName: flags.eventName,
        eventRepository: Option.getOrUndefined(flags.eventRepository),
        eventChannel: Option.getOrUndefined(flags.eventChannel),
        eventRevision: Option.getOrUndefined(flags.eventRevision),
        repository: flags.repository,
        v3: Option.getOrElse(flags.v3, () => ""),
        v4: Option.getOrElse(flags.v4, () => ""),
        generator: Option.getOrUndefined(flags.generator),
      }),
    ).pipe(
      Effect.flatMap((prepared) =>
        write(
          `v3=${prepared.v3}\nv4=${prepared.v4}\ngenerator=${prepared.generator}\nid=${prepared.id}\ntag=${prepared.tag}\npublished=${String(prepared.published)}\n`,
        ),
      ),
    ),
  ),
  Command.provide(Snapshot.layer),
)

const packageCommand = Command.make("package", {
  data,
  output,
  v3,
  v4,
  generator,
  websiteRevision,
  expectedId,
}).pipe(
  Command.withDescription("Create and verify snapshot release assets"),
  Command.withHandler((flags) =>
    Snapshot.use((snapshot) =>
      snapshot.package({
        ...identity(flags),
        data: flags.data,
        output: flags.output,
        websiteRevision: flags.websiteRevision,
        expectedId: flags.expectedId,
      }),
    ).pipe(Effect.flatMap(write)),
  ),
  Command.provide(Snapshot.layer),
)

const publishCommand = Command.make("publish", {
  repository,
  assets: Flag.string("assets").pipe(
    Flag.withDescription("Snapshot release asset directory"),
  ),
  v3,
  v4,
  generator,
  expectedId,
}).pipe(
  Command.withDescription("Publish snapshot release assets"),
  Command.withHandler((flags) =>
    Snapshot.use((snapshot) =>
      snapshot.publish({
        ...identity(flags),
        repository: flags.repository,
        assets: flags.assets,
        expectedId: flags.expectedId,
      }),
    ).pipe(Effect.flatMap(write)),
  ),
  Command.provide(Snapshot.layer),
)

const resolveCommand = Command.make("resolve", {
  repository,
  tag: optionalString("tag", "Requested snapshot release tag"),
}).pipe(
  Command.withDescription("Resolve a published snapshot tag"),
  Command.withHandler(({ repository, tag }) =>
    Snapshot.use((snapshot) =>
      snapshot.resolve(repository, Option.getOrUndefined(tag)),
    ).pipe(Effect.flatMap(write)),
  ),
  Command.provide(Snapshot.layer),
)

const snapshotCommand = Command.make("snapshot").pipe(
  Command.withDescription("Manage API reference snapshots"),
  Command.withSubcommands([
    idCommand,
    createCommand,
    validateCommand,
    prepareCommand,
    packageCommand,
    publishCommand,
    resolveCommand,
  ]),
)

const version = Flag.string("version")
const generateCommand = Command.make("generate", {
  version,
  repository: optionalString("repo", "Effect repository directory"),
  output: optionalString("out", "Generated data directory"),
  package: optionalString("package", "Generate only one package"),
}).pipe(
  Command.withDescription("Generate an API reference dataset"),
  Command.withHandler((flags) =>
    Effect.promise(() => import("./Generate.ts")).pipe(
      Effect.flatMap(({ Generate }) =>
        Generate.use((generate) =>
          generate.run({
            version: flags.version,
            repository: Option.getOrUndefined(flags.repository),
            output: Option.getOrUndefined(flags.output),
            package: Option.getOrUndefined(flags.package),
          }),
        ).pipe(Effect.provide(Generate.layer)),
      ),
    ),
  ),
)

const indexCommand = Command.make("api-reference").pipe(
  Command.withDescription("Generate and publish Effect API reference data"),
  Command.withSubcommands([generateCommand, snapshotCommand]),
)

const program = Command.run(indexCommand, { version: "0.0.0" })
const MainLayer = Layer.mergeAll(
  CliConfig.layer({ builtIns: [Help] }),
  NodeServices.layer,
)

program.pipe(Effect.provide(MainLayer), NodeRuntime.runMain)
