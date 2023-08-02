import { Effect, Exit } from "effect"
import * as Services from "./Services"

const createBucket = Effect.gen(function* (_) {
  const { createBucket, deleteBucket } = yield* _(Services.S3)
  return yield* _(
    Effect.acquireRelease(createBucket, (bucket, exit) =>
      Exit.isFailure(exit) ? deleteBucket(bucket) : Effect.unit
    )
  )
})

const createIndex = Effect.gen(function* (_) {
  const { createIndex, deleteIndex } = yield* _(Services.ElasticSearch)
  return yield* _(
    Effect.acquireRelease(createIndex, (index, exit) =>
      Exit.isFailure(exit) ? deleteIndex(index) : Effect.unit
    )
  )
})

const createEntry = (bucket: Services.Bucket, index: Services.Index) =>
  Effect.gen(function* (_) {
    const { createEntry, deleteEntry } = yield* _(Services.Database)
    return yield* _(
      Effect.acquireRelease(createEntry(bucket, index), (entry, exit) =>
        Exit.isFailure(exit) ? deleteEntry(entry) : Effect.unit
      )
    )
  })

// $ExpectType Effect<S3 | ElasticSearch | Database, S3Error | ElasticSearchError | DatabaseError, void>
export const make = Effect.scoped(
  Effect.gen(function* (_) {
    const bucket = yield* _(createBucket)
    const index = yield* _(createIndex)
    yield* _(createEntry(bucket, index))
  })
)
