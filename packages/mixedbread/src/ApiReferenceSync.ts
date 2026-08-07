export interface LocalFileIdentity {
  readonly externalId: string
  readonly fileHash: string
}

export interface RemoteFileIdentity {
  readonly external_id?: string | null
  readonly metadata?: unknown
  readonly status?: string
}

export function reconcileApiReferenceFiles<
  T extends LocalFileIdentity,
  R extends RemoteFileIdentity,
>(
  localFiles: ReadonlyArray<T>,
  storeFiles: ReadonlyArray<R>,
  version: number,
): {
  readonly changedFiles: ReadonlyArray<T>
  readonly staleFiles: ReadonlyArray<R>
} {
  const storeFilesById = new Map(
    storeFiles.flatMap((file) =>
      file.external_id === null || file.external_id === undefined
        ? []
        : [[file.external_id, file] as const],
    ),
  )
  const desiredIds = new Set(localFiles.map(({ externalId }) => externalId))
  const changedFiles = localFiles.filter(({ externalId, fileHash }) => {
    const file = storeFilesById.get(externalId)
    if (file === undefined) return true
    const metadata = file.metadata
    return (
      typeof metadata !== "object" ||
      metadata === null ||
      !("file_hash" in metadata) ||
      metadata.file_hash !== fileHash ||
      !("version" in metadata) ||
      metadata.version !== version ||
      file.status === "failed" ||
      file.status === "cancelled"
    )
  })
  const staleFiles = storeFiles.filter(
    (file) =>
      file.external_id !== null &&
      file.external_id !== undefined &&
      !desiredIds.has(file.external_id),
  )
  return { changedFiles, staleFiles }
}

export const syncApiReference = Effect.fn("ApiReferenceSync.sync")(
  function* (options: {
    readonly branch: string
    readonly client: MixedbreadClient
    readonly files: ReadonlyArray<LocalFile>
    readonly store: MixedbreadClient.Store
    readonly stores: StoreClient
    readonly sync: SyncOptions
    readonly version: number
  }) {
    const { branch, client, files, store, stores, sync, version } = options
    const duplicateIds = Map.groupBy(files, (file) => file.externalId)
      .entries()
      .filter(([, duplicates]) => duplicates.length > 1)
      .map(([externalId]) => externalId)
      .toArray()
    if (duplicateIds.length > 0) {
      return yield* new UnknownError({
        cause: new Error(
          `Duplicate Mixedbread external IDs: ${duplicateIds.join(", ")}`,
        ),
      })
    }

    const remoteFiles = (yield* Stream.runCollect(
      stores.listFiles(store.id),
    )).filter((file) => file.external_id?.startsWith("api-reference/"))
    const { changedFiles, staleFiles } = reconcileApiReferenceFiles<
      LocalFile,
      MixedbreadClient.Stores.StoreFile
    >(files, remoteFiles, version)
    const unchanged = files.length - changedFiles.length
    yield* Effect.log(
      changedFiles.length === 0
        ? `API reference index for ${store.name} is up to date; no uploads required (${unchanged} files unchanged)`
        : `Uploading ${changedFiles.length} changed API reference files to ${store.name} (${unchanged} files unchanged)`,
    )

    yield* Effect.forEach(
      staleFiles,
      Effect.fnUntraced(function* (file) {
        yield* Effect.tryPromise({
          try: () =>
            client.stores.files.delete(file.id, {
              store_identifier: store.id,
            }),
          catch: (cause) => new FailedToDeleteError({ file, cause }),
        })
        yield* Effect.log(
          `Deleted stale API reference file: ${file.external_id}`,
        )
      }),
      { concurrency: UPLOAD_CONCURRENCY },
    )

    yield* Effect.forEach(
      changedFiles,
      Effect.fnUntraced(function* ({ externalId, fileHash, metadata, upload }) {
        const now = yield* DateTime.now
        const uploadFile = (
          attempt: number,
        ): Effect.Effect<
          MixedbreadClient.Stores.StoreFile,
          FailedToIndexError
        > =>
          Effect.tryPromise({
            try: async () =>
              client.stores.files.upload({
                storeIdentifier: store.id,
                file: await upload(),
                body: {
                  external_id: externalId,
                  overwrite: true,
                  config: { parsing_strategy: "fast" },
                  metadata: {
                    ...metadata,
                    file_hash: fileHash,
                    git_branch: branch,
                    git_commit: sync.revision,
                    version,
                    ...(sync.kind === "preview"
                      ? { pull_request: sync.pullRequest }
                      : {}),
                    synced: true,
                    uploaded_at: DateTime.formatIso(now),
                  },
                },
              }),
            catch: (cause) => {
              const conflict = fileInProgressConflict(cause)
              return conflict === undefined
                ? new FailedToIndexError({ externalId, cause })
                : new FileInProgressError({ externalId, ...conflict })
            },
          }).pipe(
            Effect.catchTag("FileInProgressError", (error) =>
              Effect.gen(function* () {
                const existing = yield* Effect.tryPromise({
                  try: () =>
                    client.stores.files.retrieve(error.fileIdentifier, {
                      store_identifier: store.id,
                    }),
                  catch: (cause) =>
                    new FailedToIndexError({ externalId, cause }),
                })
                const existingMetadata = existing.metadata
                if (
                  existing.status !== "failed" &&
                  existing.status !== "cancelled" &&
                  Schema.is(StoreFileMetadata)(existingMetadata) &&
                  existingMetadata.file_hash === fileHash &&
                  existingMetadata.version === version
                ) {
                  return existing
                }
                if (attempt >= FILE_UPLOAD_ATTEMPTS) {
                  return yield* new FailedToIndexError({
                    externalId: error.externalId,
                    cause: error.cause,
                  })
                }
                yield* Effect.tryPromise({
                  try: () =>
                    client.stores.files.delete(error.fileIdentifier, {
                      store_identifier: store.id,
                    }),
                  catch: (cause) =>
                    new FailedToIndexError({ externalId, cause }),
                })
                yield* Effect.sleep("1 second")
                return yield* uploadFile(attempt + 1)
              }),
            ),
          )

        const remoteFile = yield* uploadFile(1)
        if (
          remoteFile.status === "failed" ||
          remoteFile.status === "cancelled"
        ) {
          return yield* new FailedToIndexError({
            externalId,
            cause: remoteFile.last_error ?? remoteFile.status,
          })
        }
        yield* Effect.log(`Synchronized API reference file: ${externalId}`)
      }),
      { concurrency: UPLOAD_CONCURRENCY },
    )
  },
)
import MixedbreadClient from "@mixedbread/sdk"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import {
  FILE_UPLOAD_ATTEMPTS,
  type SyncOptions,
  UPLOAD_CONCURRENCY,
} from "./Config.ts"
import {
  FailedToDeleteError,
  FailedToIndexError,
  FileInProgressError,
  fileInProgressConflict,
  UnknownError,
} from "./Error.ts"
import type { LocalFile } from "./ApiReferenceFiles.ts"
import { StoreFileMetadata, type StoreClient } from "./Store.ts"
