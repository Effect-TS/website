import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import { CommandRunner } from "./Process.ts"

const snapshotTagPattern = /^api-reference-[a-f0-9]{64}$/

const Release = Schema.Struct({
  draft: Schema.Boolean,
  prerelease: Schema.Boolean,
  published_at: Schema.NullOr(Schema.String),
  tag_name: Schema.String,
})

const ReleaseState = Schema.Struct({
  isDraft: Schema.Boolean,
  isPrerelease: Schema.Boolean,
})

export type ReleaseState = typeof ReleaseState.Type

export class GitHubError extends Data.TaggedError("GitHubError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

export class GitHub extends Context.Service<
  GitHub,
  {
    readonly latestPublishedSnapshot: (
      repository: string,
    ) => Effect.Effect<string | undefined, GitHubError>
    readonly downloadManifest: (
      repository: string,
      tag: string,
      directory: string,
    ) => Effect.Effect<void, GitHubError>
    readonly releaseState: (
      repository: string,
      tag: string,
    ) => Effect.Effect<ReleaseState | undefined, GitHubError>
    readonly deleteRelease: (
      repository: string,
      tag: string,
    ) => Effect.Effect<void, GitHubError>
    readonly publishRelease: (options: {
      readonly repository: string
      readonly tag: string
      readonly id: string
      readonly v3: string
      readonly v4: string
      readonly assets: string
    }) => Effect.Effect<void, GitHubError>
  }
>()("@website/api-reference/GitHub", {
  make: Effect.gen(function* () {
    const process = yield* CommandRunner

    const mapError = <A>(effect: Effect.Effect<A, unknown>, message: string) =>
      effect.pipe(
        Effect.mapError((cause) => new GitHubError({ message, cause })),
      )

    const latestPublishedSnapshot = Effect.fn("GitHub.latestPublishedSnapshot")(
      function* (repository: string) {
        const output = yield* mapError(
          process.run("gh", [
            "api",
            `repos/${repository}/releases?per_page=100`,
          ]),
          `Unable to list releases for ${repository}`,
        )
        const releases = yield* Schema.decodeUnknownEffect(
          Schema.fromJsonString(Schema.Array(Release)),
        )(output).pipe(
          Effect.mapError(
            (cause) =>
              new GitHubError({
                message: `GitHub returned an invalid release list for ${repository}`,
                cause,
              }),
          ),
        )
        return releases
          .filter(
            (
              release,
            ): release is typeof release & { readonly published_at: string } =>
              !release.draft &&
              !release.prerelease &&
              release.published_at !== null &&
              snapshotTagPattern.test(release.tag_name),
          )
          .sort((left, right) =>
            left.published_at.localeCompare(right.published_at),
          )
          .at(-1)?.tag_name
      },
    )

    const downloadManifest = Effect.fn("GitHub.downloadManifest")(function* (
      repository: string,
      tag: string,
      directory: string,
    ) {
      yield* mapError(
        process.run("gh", [
          "release",
          "download",
          tag,
          "--repo",
          repository,
          "--dir",
          directory,
          "--pattern",
          "manifest.json",
        ]),
        `Unable to download API reference manifest from ${tag}`,
      )
    })

    const releaseState = Effect.fn("GitHub.releaseState")(function* (
      repository: string,
      tag: string,
    ) {
      yield* mapError(
        process.run("gh", [
          "repo",
          "view",
          repository,
          "--json",
          "nameWithOwner",
        ]),
        `Unable to access GitHub repository ${repository}`,
      )
      const result = yield* mapError(
        process.execute("gh", [
          "release",
          "view",
          tag,
          "--repo",
          repository,
          "--json",
          "isDraft,isPrerelease",
        ]),
        `Unable to inspect API reference release ${tag}`,
      )
      if (result.exitCode !== 0) {
        if (result.stderr.trim().toLowerCase() === "release not found") {
          return undefined
        }
        return yield* new GitHubError({
          message: `Unable to inspect API reference release ${tag}: ${result.stderr.trim() || `exit status ${String(result.exitCode)}`}`,
        })
      }
      return yield* Schema.decodeUnknownEffect(
        Schema.fromJsonString(ReleaseState),
      )(result.stdout).pipe(
        Effect.mapError(
          (cause) =>
            new GitHubError({
              message: `GitHub returned invalid release state for ${tag}`,
              cause,
            }),
        ),
      )
    })

    const deleteRelease = Effect.fn("GitHub.deleteRelease")(function* (
      repository: string,
      tag: string,
    ) {
      yield* mapError(
        process.run("gh", [
          "release",
          "delete",
          tag,
          "--repo",
          repository,
          "--yes",
          "--cleanup-tag",
        ]),
        `Unable to delete draft API reference release ${tag}`,
      )
    })

    const publishRelease = Effect.fn("GitHub.publishRelease")(
      function* (options: {
        readonly repository: string
        readonly tag: string
        readonly id: string
        readonly v3: string
        readonly v4: string
        readonly assets: string
      }) {
        const { assets, id, repository, tag, v3, v4 } = options
        yield* mapError(
          process.run("gh", [
            "release",
            "create",
            tag,
            "--repo",
            repository,
            "--draft",
            "--latest=false",
            "--title",
            `API reference snapshot ${id}`,
            "--notes",
            `Effect v3: ${v3}\nEffect v4: ${v4}`,
          ]),
          `Unable to create API reference release ${tag}`,
        )
        yield* mapError(
          process.run("gh", [
            "release",
            "upload",
            tag,
            `${assets}/api-reference.tar.gz`,
            `${assets}/api-reference.sha256`,
            `${assets}/manifest.json`,
            "--repo",
            repository,
          ]),
          `Unable to upload API reference release ${tag}`,
        )
        yield* mapError(
          process.run("gh", [
            "release",
            "edit",
            tag,
            "--repo",
            repository,
            "--draft=false",
          ]),
          `Unable to publish API reference release ${tag}`,
        )
      },
    )

    return {
      deleteRelease,
      downloadManifest,
      latestPublishedSnapshot,
      publishRelease,
      releaseState,
    }
  }),
}) {
  static readonly layer = Layer.effect(this, this.make).pipe(
    Layer.provide(CommandRunner.layer),
  )
}
