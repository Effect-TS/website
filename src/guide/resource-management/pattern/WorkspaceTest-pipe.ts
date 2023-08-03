import { Effect, Context, Layer } from "effect"
import * as Services from "./Services"
import * as Workspace from "./Workspace"

type Failure = "S3" | "ElasticSearch" | "Database" | undefined

const Failure = Context.Tag<Failure>()

const S3Test = Layer.function(Failure, Services.S3, (Failure) =>
  Services.S3.of({
    createBucket: Effect.log("[S3] creating bucket").pipe(
      Effect.flatMap(() =>
        Failure === "S3"
          ? Effect.fail(new Services.S3Error())
          : Effect.succeed({ name: "<bucket.name>" })
      )
    ),
    deleteBucket: (bucket) => Effect.log(`[S3] delete bucket ${bucket.name}`)
  })
)

const ElasticSearchTest = Layer.function(
  Failure,
  Services.ElasticSearch,
  (Failure) =>
    Services.ElasticSearch.of({
      createIndex: Effect.log("[ElasticSearch] creating index").pipe(
        Effect.flatMap(() =>
          Failure === "ElasticSearch"
            ? Effect.fail(new Services.ElasticSearchError())
            : Effect.succeed({ id: "<index.id>" })
        )
      ),
      deleteIndex: (index) =>
        Effect.log(`[ElasticSearch] delete index ${index.id}`)
    })
)

const DatabaseTest = Layer.function(Failure, Services.Database, (Failure) =>
  Services.Database.of({
    createEntry: (bucket, index) =>
      Effect.log(
        `[Database] creating entry for bucket ${bucket.name} and index ${index.id}`
      ).pipe(
        Effect.flatMap(() =>
          Failure === "Database"
            ? Effect.fail(new Services.DatabaseError())
            : Effect.succeed({ id: "<entry.id>" })
        )
      ),
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
