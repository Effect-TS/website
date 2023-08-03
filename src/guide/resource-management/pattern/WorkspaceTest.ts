import { Effect, Context, Layer } from "effect"
import * as Services from "./Services"
import * as Workspace from "./Workspace"

type Failure = "S3" | "ElasticSearch" | "Database" | undefined

const Failure = Context.Tag<Failure>()

const S3Test = Layer.function(Failure, Services.S3, (Failure) =>
  Services.S3.of({
    createBucket: Effect.gen(function* (_) {
      yield* _(Effect.log("[S3] creating bucket"))
      if (Failure === "S3") {
        return yield* _(Effect.fail(new Services.S3Error()))
      } else {
        return { name: "<bucket.name>" }
      }
    }),
    deleteBucket: (bucket) => Effect.log(`[S3] delete bucket ${bucket.name}`)
  })
)

const ElasticSearchTest = Layer.function(
  Failure,
  Services.ElasticSearch,
  (Failure) =>
    Services.ElasticSearch.of({
      createIndex: Effect.gen(function* (_) {
        yield* _(Effect.log("[ElasticSearch] creating index"))
        if (Failure === "ElasticSearch") {
          return yield* _(Effect.fail(new Services.ElasticSearchError()))
        } else {
          return { id: "<index.id>" }
        }
      }),
      deleteIndex: (index) =>
        Effect.log(`[ElasticSearch] delete index ${index.id}`)
    })
)

const DatabaseTest = Layer.function(Failure, Services.Database, (Failure) =>
  Services.Database.of({
    createEntry: (bucket, index) =>
      Effect.gen(function* (_) {
        yield* _(
          Effect.log(
            `[Database] creating entry for bucket ${bucket.name} and index ${index.id}`
          )
        )
        if (Failure === "Database") {
          return yield* _(Effect.fail(new Services.DatabaseError()))
        } else {
          return { id: "<entry.id>" }
        }
      }),
    deleteEntry: (entry) => Effect.log(`[Database] delete entry ${entry.id}`)
  })
)

const layer = Layer.mergeAll(S3Test, ElasticSearchTest, DatabaseTest)

// $ExpectType Effect<never, S3Error | ElasticSearchError | DatabaseError, Entry>
const runnable = Workspace.make.pipe(
  Effect.provideLayer(layer),
  Effect.provideService(Failure, undefined)
)

Effect.runPromise(Effect.either(runnable)).then(console.log)
