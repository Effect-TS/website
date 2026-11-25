import { Data } from "effect"

export class ExpiredCardError extends Data.TaggedError("ExpiredCardError") {}

export class InvalidTokenError extends Data.TaggedError("InvalidTokenError") {}

export class NetworkError extends Data.TaggedError("NetworkError") {}
