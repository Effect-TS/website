import { Effect, Context } from "effect"
import * as Services from "./Services"
import * as Workspace from "./Workspace"

const S3Test = (fail: boolean) =>
  Services.S3.of({
    createBucket: Effect.gen(function* (_) {
      yield* _(Effect.log("[S3] creating bucket"))
      if (fail) {
        return yield* _(Effect.fail(new Services.S3Error()))
      } else {
        return { name: "<bucket.name>" }
      }
    }),
    deleteBucket: (bucket) => Effect.log(`[S3] delete bucket ${bucket.name}`),
  })

const ElasticSearchTest = (fail: boolean) =>
  Services.ElasticSearch.of({
    createIndex: Effect.gen(function* (_) {
      yield* _(Effect.log("[ElasticSearch] creating index"))
      if (fail) {
        return yield* _(Effect.fail(new Services.ElasticSearchError()))
      } else {
        return { id: "<index.id>" }
      }
    }),
    deleteIndex: (index) =>
      Effect.log(`[ElasticSearch] delete index ${index.id}`),
  })

const DatabaseTest = (fail: boolean) =>
  Services.Database.of({
    createEntry: (bucket, index) =>
      Effect.gen(function* (_) {
        yield* _(
          Effect.log(
            `[Database] creating entry for bucket ${bucket.name} and index ${index.id}`
          )
        )
        if (fail) {
          return yield* _(Effect.fail(new Services.DatabaseError()))
        } else {
          return { id: "<entry.id>" }
        }
      }),
    deleteEntry: (entry) => Effect.log(`[Database] delete entry ${entry.id}`),
  })

const ctx = Context.empty().pipe(
  Context.add(Services.S3, S3Test(false)),
  Context.add(Services.ElasticSearch, ElasticSearchTest(false)),
  Context.add(Services.Database, DatabaseTest(false))
)

// $ExpectType Effect<never, S3Error | ElasticSearchError | DatabaseError, Entry>
const runnable = Effect.provideContext(Workspace.make, ctx)

Effect.runPromise(Effect.either(runnable)).then(console.log)
