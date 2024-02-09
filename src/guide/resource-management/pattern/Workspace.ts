import { Effect, Exit } from "effect"
import * as Services from "./Services"

// Create a bucket, and define the release function that deletes the bucket if the operation fails.
const createBucket = Effect.gen(function* (_) {
  const { createBucket, deleteBucket } = yield* _(Services.S3)
  return yield* _(
    Effect.acquireRelease(createBucket, (bucket, exit) =>
      // The release function for the Effect.acquireRelease operation is responsible for handling the acquired resource (bucket) after the main effect has completed.
      // It is called regardless of whether the main effect succeeded or failed.
      // If the main effect failed, Exit.isFailure(exit) will be true, and the function will perform a rollback by calling deleteBucket(bucket).
      // If the main effect succeeded, Exit.isFailure(exit) will be false, and the function will return Effect.unit, representing a successful, but do-nothing effect.
      Exit.isFailure(exit) ? deleteBucket(bucket) : Effect.unit
    )
  )
})

// Create an index, and define the release function that deletes the index if the operation fails.
const createIndex = Effect.gen(function* (_) {
  const { createIndex, deleteIndex } = yield* _(Services.ElasticSearch)
  return yield* _(
    Effect.acquireRelease(createIndex, (index, exit) =>
      Exit.isFailure(exit) ? deleteIndex(index) : Effect.unit
    )
  )
})

// Create an entry in the database, and define the release function that deletes the entry if the operation fails.
const createEntry = (bucket: Services.Bucket, index: Services.Index) =>
  Effect.gen(function* (_) {
    const { createEntry, deleteEntry } = yield* _(Services.Database)
    return yield* _(
      Effect.acquireRelease(createEntry(bucket, index), (entry, exit) =>
        Exit.isFailure(exit) ? deleteEntry(entry) : Effect.unit
      )
    )
  })

// $ExpectType Effect<Entry, S3Error | ElasticSearchError | DatabaseError, S3 | ElasticSearch | Database>
export const make = Effect.scoped(
  Effect.gen(function* (_) {
    const bucket = yield* _(createBucket)
    const index = yield* _(createIndex)
    return yield* _(createEntry(bucket, index))
  })
)
