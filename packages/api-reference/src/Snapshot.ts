import { createHash } from "node:crypto"
import { fileURLToPath } from "node:url"
import { Manifest } from "@website/domain/ApiReferenceSnapshot"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Path from "effect/Path"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import { GitHub } from "./GitHub.ts"
import { CommandRunner } from "./Process.ts"

const Revision = Schema.String.check(Schema.isPattern(/^[a-f0-9]{40}$/))
const Digest = Schema.String.check(Schema.isPattern(/^[a-f0-9]{40,64}$/))
const SnapshotId = Schema.String.check(Schema.isPattern(/^[a-f0-9]{64}$/))
const SnapshotTag = Schema.String.check(
  Schema.isPattern(/^api-reference-[a-f0-9]{64}$/),
)
const ManifestJson = Schema.fromJsonString(Manifest)

const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url))
const generatorFiles = [
  "packages/api-reference/src/Generate.ts",
  "packages/api-reference/src/Snapshot.ts",
  "packages/api-reference/src/GitHub.ts",
  "packages/api-reference/src/Process.ts",
  "packages/api-reference/package.json",
  "packages/domain/src/ApiReference.ts",
  "packages/domain/src/ApiReferenceSnapshot.ts",
  "pnpm-lock.yaml",
] as const

export interface IdentityInput {
  readonly v3: string
  readonly v4: string
  readonly generator?: string | undefined
}

export interface CreateInput extends IdentityInput {
  readonly data: string
  readonly output: string
  readonly websiteRevision: string
}

export interface PrepareInput extends IdentityInput {
  readonly eventName: string
  readonly eventRepository?: string | undefined
  readonly eventChannel?: string | undefined
  readonly eventRevision?: string | undefined
  readonly repository: string
}

export interface PackageInput extends CreateInput {
  readonly expectedId: string
}

export interface PublishInput extends IdentityInput {
  readonly repository: string
  readonly assets: string
  readonly expectedId: string
}

export interface PreparedSnapshot {
  readonly v3: string
  readonly v4: string
  readonly generator: string
  readonly id: string
  readonly tag: string
  readonly published: boolean
}

export class SnapshotError extends Data.TaggedError("SnapshotError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

export class Snapshot extends Context.Service<
  Snapshot,
  {
    readonly id: (input: IdentityInput) => Effect.Effect<string, SnapshotError>
    readonly create: (input: CreateInput) => Effect.Effect<void, SnapshotError>
    readonly validate: (
      data: string,
      manifest: string,
    ) => Effect.Effect<string, SnapshotError>
    readonly prepare: (
      input: PrepareInput,
    ) => Effect.Effect<PreparedSnapshot, SnapshotError>
    readonly package: (
      input: PackageInput,
    ) => Effect.Effect<string, SnapshotError>
    readonly publish: (
      input: PublishInput,
    ) => Effect.Effect<string, SnapshotError>
    readonly resolve: (
      repository: string,
      tag?: string,
    ) => Effect.Effect<string, SnapshotError>
  }
>()("@website/api-reference/Snapshot", {
  make: Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const process = yield* CommandRunner
    const github = yield* GitHub

    const decode = <A>(
      schema: Schema.Codec<A, string>,
      value: string,
      name: string,
    ) =>
      Schema.decodeUnknownEffect(schema)(value).pipe(
        Effect.mapError(
          (cause) => new SnapshotError({ message: `Invalid ${name}`, cause }),
        ),
      )

    const decodeRevision = (value: string, name: string) =>
      decode(Revision, value, `--${name}; expected a full Git commit SHA`)
    const decodeDigest = (value: string, name: string) =>
      decode(Digest, value, `--${name}; expected a hexadecimal digest`)
    const decodeSnapshotId = (value: string, name: string) =>
      decode(SnapshotId, value, `--${name}; expected a snapshot ID`)

    const snapshotId = (generator: string, v3: string, v4: string) =>
      createHash("sha256")
        .update(
          JSON.stringify({ schemaVersion: 1, generator, channels: { v3, v4 } }),
        )
        .digest("hex")

    const generatorDigest = Effect.fn("Snapshot.generatorDigest")(function* (
      provided?: string,
    ) {
      if (provided !== undefined && provided.length > 0) {
        return yield* decodeDigest(provided, "generator")
      }
      const hashes = yield* process.run(
        "git",
        ["hash-object", ...generatorFiles],
        { cwd: repositoryRoot },
      )
      return (yield* process.run("git", ["hash-object", "--stdin"], {
        cwd: repositoryRoot,
        input: hashes,
      })).trim()
    })

    const identity = Effect.fn("Snapshot.identity")(function* (
      input: IdentityInput,
    ) {
      const v3 = yield* decodeRevision(input.v3, "v3")
      const v4 = yield* decodeRevision(input.v4, "v4")
      const generator = yield* generatorDigest(input.generator)
      return { v3, v4, generator, id: snapshotId(generator, v3, v4) }
    })

    const readManifest = Effect.fn("Snapshot.readManifest")(function* (
      manifestPath: string,
    ) {
      const source = yield* fs.readFileString(manifestPath)
      return yield* Schema.decodeUnknownEffect(ManifestJson)(source).pipe(
        Effect.mapError(
          (cause) =>
            new SnapshotError({
              message: `Invalid API reference manifest: ${manifestPath}`,
              cause,
            }),
        ),
      )
    })

    const validateDatasets = Effect.fn("Snapshot.validateDatasets")(function* (
      dataDirectory: string,
      revisions: { readonly v3: string; readonly v4: string },
    ) {
      const DatasetManifest = Schema.Struct({
        datasetSchemaVersion: Schema.Literal(1),
        channel: Schema.Literals(["v3", "v4"]),
        revision: Revision,
      })
      for (const channel of ["v3", "v4"] as const) {
        const manifestPath = path.join(dataDirectory, channel, "manifest.json")
        const source = yield* fs.readFileString(manifestPath)
        const manifest = yield* Schema.decodeUnknownEffect(
          Schema.fromJsonString(DatasetManifest),
        )(source).pipe(
          Effect.mapError(
            (cause) =>
              new SnapshotError({
                message: `Invalid API reference dataset manifest: ${manifestPath}`,
                cause,
              }),
          ),
        )
        if (manifest.channel !== channel) {
          return yield* new SnapshotError({
            message: `API reference dataset channel mismatch: ${manifestPath}`,
          })
        }
        if (manifest.revision !== revisions[channel]) {
          return yield* new SnapshotError({
            message: `API reference dataset revision mismatch for ${channel}: expected ${revisions[channel]}, received ${manifest.revision}`,
          })
        }
      }
    })

    const validateManifest = Effect.fn("Snapshot.validateManifest")(function* (
      dataDirectory: string,
      manifestPath: string,
    ) {
      const manifest = yield* readManifest(manifestPath)
      const expectedId = snapshotId(
        manifest.generator,
        manifest.channels.v3.revision,
        manifest.channels.v4.revision,
      )
      if (manifest.snapshotId !== expectedId) {
        return yield* new SnapshotError({
          message: `API reference snapshot ID mismatch: expected ${expectedId}, received ${manifest.snapshotId}`,
        })
      }
      yield* validateDatasets(dataDirectory, {
        v3: manifest.channels.v3.revision,
        v4: manifest.channels.v4.revision,
      })
      return manifest.snapshotId
    })

    const createManifest = Effect.fn("Snapshot.createManifest")(function* (
      input: CreateInput,
    ) {
      const dataDirectory = path.resolve(input.data)
      const output = path.resolve(input.output)
      const { generator, id, v3, v4 } = yield* identity(input)
      const websiteRevision = yield* decodeRevision(
        input.websiteRevision,
        "website-revision",
      )
      yield* validateDatasets(dataDirectory, { v3, v4 })
      const now = yield* DateTime.now
      yield* fs.writeFileString(
        output,
        `${JSON.stringify(
          {
            schemaVersion: 1,
            snapshotId: id,
            generatedAt: DateTime.formatIso(now),
            websiteRevision,
            generator,
            channels: { v3: { revision: v3 }, v4: { revision: v4 } },
          },
          null,
          2,
        )}\n`,
      )
      return id
    })

    const fileDigest = Effect.fn("Snapshot.fileDigest")(function* (
      file: string,
    ) {
      const hash = createHash("sha256")
      yield* fs
        .stream(file)
        .pipe(
          Stream.runForEach((chunk) => Effect.sync(() => hash.update(chunk))),
        )
      return hash.digest("hex")
    })

    const validateAssets = Effect.fn("Snapshot.validateAssets")(function* (
      directory: string,
      expectedId: string,
    ) {
      const archive = path.join(directory, "api-reference.tar.gz")
      const checksum = (yield* fs.readFileString(
        path.join(directory, "api-reference.sha256"),
      )).trim()
      const match = /^([a-f0-9]{64})\s+api-reference\.tar\.gz$/.exec(checksum)
      if (match === null) {
        return yield* new SnapshotError({
          message: "API reference snapshot checksum file is invalid",
        })
      }
      const actual = yield* fileDigest(archive)
      if (actual !== match[1]) {
        return yield* new SnapshotError({
          message: `API reference snapshot checksum mismatch: expected ${match[1]}, received ${actual}`,
        })
      }
      yield* Effect.scoped(
        Effect.gen(function* () {
          const directory_ = yield* fs.makeTempDirectoryScoped({
            prefix: "api-reference-assets-",
          })
          yield* process.run("tar", ["-xzf", archive, "-C", directory_])
          const id = yield* validateManifest(
            path.join(directory_, "api-reference"),
            path.join(directory, "manifest.json"),
          )
          if (id !== expectedId) {
            return yield* new SnapshotError({
              message: `API reference snapshot assets do not match the expected ID: expected ${expectedId}, received ${id}`,
            })
          }
        }),
      )
    })

    const mapSnapshotError = <A, R>(
      operation: string,
      effect: Effect.Effect<A, unknown, R>,
    ): Effect.Effect<A, SnapshotError, R> =>
      effect.pipe(
        Effect.mapError((cause) =>
          cause instanceof SnapshotError
            ? cause
            : new SnapshotError({ message: operation, cause }),
        ),
      )

    const id = (input: IdentityInput) =>
      mapSnapshotError(
        "Unable to compute API reference snapshot ID",
        identity(input).pipe(Effect.map((identity) => identity.id)),
      )

    const create = (input: CreateInput) =>
      mapSnapshotError(
        "Unable to create API reference snapshot manifest",
        createManifest(input).pipe(Effect.asVoid),
      )

    const validate = (data: string, manifest: string) =>
      mapSnapshotError(
        "Unable to validate API reference snapshot",
        validateManifest(path.resolve(data), path.resolve(manifest)),
      )

    const prepare = (input: PrepareInput) =>
      mapSnapshotError(
        "Unable to prepare API reference snapshot",
        Effect.gen(function* () {
          let v3 = input.v3
          let v4 = input.v4
          if (input.eventName === "repository_dispatch") {
            if (input.eventRepository !== "Effect-TS/effect") {
              return yield* new SnapshotError({
                message:
                  "API reference dispatch must identify Effect-TS/effect as its source repository",
              })
            }
            const revision = yield* decodeRevision(
              input.eventRevision ?? "",
              "event-revision",
            )
            if (input.eventChannel !== "v3" && input.eventChannel !== "v4") {
              return yield* new SnapshotError({
                message: "API reference dispatch channel must be v3 or v4",
              })
            }
            const previousTag = yield* github.latestPublishedSnapshot(
              input.repository,
            )
            if (previousTag === undefined) {
              return yield* new SnapshotError({
                message:
                  "No published API reference snapshot is available. Run this workflow manually with both released revisions to create the initial snapshot.",
              })
            }
            const previous = yield* Effect.scoped(
              Effect.gen(function* () {
                const directory = yield* fs.makeTempDirectoryScoped({
                  prefix: "api-reference-manifest-",
                })
                yield* github.downloadManifest(
                  input.repository,
                  previousTag,
                  directory,
                )
                const manifest = yield* readManifest(
                  path.join(directory, "manifest.json"),
                )
                const manifestId = snapshotId(
                  manifest.generator,
                  manifest.channels.v3.revision,
                  manifest.channels.v4.revision,
                )
                if (
                  manifest.snapshotId !== manifestId ||
                  previousTag !== `api-reference-${manifestId}`
                ) {
                  return yield* new SnapshotError({
                    message: `Published API reference manifest does not match its release tag: ${previousTag}`,
                  })
                }
                return manifest
              }),
            )
            v3 =
              input.eventChannel === "v3"
                ? revision
                : previous.channels.v3.revision
            v4 =
              input.eventChannel === "v4"
                ? revision
                : previous.channels.v4.revision
          }
          const identity_ = yield* identity({
            v3,
            v4,
            generator: input.generator,
          })
          const tag = `api-reference-${identity_.id}`
          const release = yield* github.releaseState(input.repository, tag)
          return {
            ...identity_,
            tag,
            published:
              release !== undefined &&
              !release.isDraft &&
              !release.isPrerelease,
          }
        }),
      )

    const package_ = (input: PackageInput) =>
      mapSnapshotError(
        "Unable to package API reference snapshot",
        Effect.gen(function* () {
          const data = path.resolve(input.data)
          if (path.basename(data) !== "api-reference") {
            return yield* new SnapshotError({
              message: "--data must identify an api-reference directory",
            })
          }
          const output = path.resolve(input.output)
          const identity_ = yield* identity(input)
          const expectedId = yield* decodeSnapshotId(
            input.expectedId,
            "expected-id",
          )
          if (identity_.id !== expectedId) {
            return yield* new SnapshotError({
              message: `API reference snapshot ID changed before packaging: expected ${expectedId}, received ${identity_.id}`,
            })
          }
          yield* fs.makeDirectory(output, { recursive: true })
          yield* createManifest({
            ...input,
            data,
            generator: identity_.generator,
            output: path.join(output, "manifest.json"),
          })
          const archive = path.join(output, "api-reference.tar.gz")
          yield* process.run("tar", [
            "-czf",
            archive,
            "-C",
            path.dirname(data),
            path.basename(data),
          ])
          const checksum = yield* fileDigest(archive)
          yield* fs.writeFileString(
            path.join(output, "api-reference.sha256"),
            `${checksum}  api-reference.tar.gz\n`,
          )
          yield* validateAssets(output, expectedId)
          return identity_.id
        }),
      )

    const publish = (input: PublishInput) =>
      mapSnapshotError(
        "Unable to publish API reference snapshot",
        Effect.gen(function* () {
          const identity_ = yield* identity(input)
          const expectedId = yield* decodeSnapshotId(
            input.expectedId,
            "expected-id",
          )
          if (identity_.id !== expectedId) {
            return yield* new SnapshotError({
              message: `API reference snapshot ID changed before publishing: expected ${expectedId}, received ${identity_.id}`,
            })
          }
          const assets = path.resolve(input.assets)
          yield* validateAssets(assets, expectedId)
          const tag = `api-reference-${identity_.id}`
          const release = yield* github.releaseState(input.repository, tag)
          if (release !== undefined && !release.isDraft) {
            if (release.isPrerelease) {
              return yield* new SnapshotError({
                message: `API reference snapshot is a prerelease: ${tag}`,
              })
            }
            return tag
          }
          if (release?.isDraft === true) {
            yield* github.deleteRelease(input.repository, tag)
          }
          yield* github.publishRelease({
            repository: input.repository,
            tag,
            id: identity_.id,
            v3: identity_.v3,
            v4: identity_.v4,
            assets,
          })
          return tag
        }),
      )

    const resolve_ = (repository: string, requested?: string) =>
      mapSnapshotError(
        "Unable to resolve API reference snapshot",
        Effect.gen(function* () {
          const tag =
            requested === undefined || requested.length === 0
              ? yield* github.latestPublishedSnapshot(repository)
              : yield* decode(SnapshotTag, requested, "--tag")
          if (tag === undefined) {
            return yield* new SnapshotError({
              message:
                "No valid published API reference snapshot is available. Publish one with the API reference workflow before deploying.",
            })
          }
          const release = yield* github.releaseState(repository, tag)
          if (
            release === undefined ||
            release.isDraft ||
            release.isPrerelease
          ) {
            return yield* new SnapshotError({
              message: `API reference snapshot must be a published, non-prerelease release: ${tag}`,
            })
          }
          return tag
        }),
      )

    return {
      create,
      id,
      package: package_,
      prepare,
      publish,
      resolve: resolve_,
      validate,
    }
  }),
}) {
  static readonly layer = Layer.effect(this, this.make).pipe(
    Layer.provide(Layer.merge(GitHub.layer, CommandRunner.layer)),
  )
}
