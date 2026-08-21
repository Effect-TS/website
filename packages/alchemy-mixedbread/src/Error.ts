import * as Data from "effect/Data"

export class MixedbreadApiError extends Data.TaggedError("MixedbreadApiError")<{
  readonly operation: string
  readonly cause: unknown
}> {
  override get message(): string {
    return `Mixedbread API operation failed: ${this.operation}`
  }
}
