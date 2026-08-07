import MixedbreadClient, { ConflictError } from "@mixedbread/sdk"
import * as Data from "effect/Data"

export class FailedToDeleteError extends Data.TaggedError(
  "FailedToDeleteError",
)<{
  readonly file: MixedbreadClient.Stores.StoreFile
  readonly cause?: unknown
}> {
  override get message(): string {
    return `Mixedbread failed to delete file: ${this.file.external_id}`
  }
}

export class FailedToIndexError extends Data.TaggedError("FailedToIndexError")<{
  readonly externalId: string
  readonly cause?: unknown
}> {
  override get message(): string {
    return `Mixedbread failed to index ${this.externalId}`
  }
}

export class FileInProgressError extends Data.TaggedError(
  "FileInProgressError",
)<{
  readonly externalId: string
  readonly fileIdentifier: string
  readonly cause: ConflictError
}> {}

export class InvalidStoreError extends Data.TaggedError("InvalidStoreError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

export class UnknownError extends Data.TaggedError("UnknownError")<{
  readonly cause: unknown
}> {}

export function fileInProgressConflict(
  cause: unknown,
):
  | { readonly cause: ConflictError; readonly fileIdentifier: string }
  | undefined {
  if (!(cause instanceof ConflictError)) return undefined
  const fileIdentifier =
    /File '([^']+)' with version '[^']+' and status 'in_progress'/.exec(
      cause.message,
    )?.[1]
  return fileIdentifier === undefined ? undefined : { cause, fileIdentifier }
}
