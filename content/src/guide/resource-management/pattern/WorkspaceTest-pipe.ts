import { Effect, Context, Layer, Console } from "effect"
import * as Services from "./Services"
import * as Workspace from "./Workspace"

// The `FailureCase` type allows us to provide different error scenarios while testing our services.
// For example, by providing the value "S3", we can simulate an error scenario specific to the S3 service.
// This helps us ensure that our program handle errors correctly and behave as expected in various situations.
// Similarly, we can provide other values like "ElasticSearch" or "Database" to simulate error scenarios for those services.
// In cases where we want to test the absence of errors, we can provide `undefined`.
// By using this parameter, we can thoroughly test our services and verify their behavior under different error conditions.
type FailureCase = "S3" | "ElasticSearch" | "Database" | undefined

const FailureCase = Context.Tag<FailureCase>()

// Create a test layer for the S3 service

// $ExpectType Layer<FailureCase, never, S3>
const S3Test = Layer.effect(
  Services.S3,
  Effect.map(FailureCase, (failureCase) =>
    Services.S3.of({
      createBucket: Console.log("[S3] creating bucket").pipe(
        Effect.flatMap(() =>
          failureCase === "S3"
            ? Effect.fail(new Services.S3Error())
            : Effect.succeed({ name: "<bucket.name>" })
        )
      ),
      deleteBucket: (bucket) => Console.log(`[S3] delete bucket ${bucket.name}`)
    })
  )
)

// Create a test layer for the ElasticSearch service

// $ExpectType Layer<FailureCase, never, ElasticSearch>
const ElasticSearchTest = Layer.effect(
  Services.ElasticSearch,
  Effect.map(FailureCase, (failureCase) =>
    Services.ElasticSearch.of({
      createIndex: Console.log("[ElasticSearch] creating index").pipe(
        Effect.flatMap(() =>
          failureCase === "ElasticSearch"
            ? Effect.fail(new Services.ElasticSearchError())
            : Effect.succeed({ id: "<index.id>" })
        )
      ),
      deleteIndex: (index) =>
        Console.log(`[ElasticSearch] delete index ${index.id}`)
    })
  )
)

// Create a test layer for the Database service

// $ExpectType Layer<FailureCase, never, Database>
const DatabaseTest = Layer.effect(
  Services.Database,
  Effect.map(FailureCase, (failureCase) =>
    Services.Database.of({
      createEntry: (bucket, index) =>
        Console.log(
          `[Database] creating entry for bucket ${bucket.name} and index ${index.id}`
        ).pipe(
          Effect.flatMap(() =>
            failureCase === "Database"
              ? Effect.fail(new Services.DatabaseError())
              : Effect.succeed({ id: "<entry.id>" })
          )
        ),
      deleteEntry: (entry) => Console.log(`[Database] delete entry ${entry.id}`)
    })
  )
)

// Merge all the test layers for S3, ElasticSearch, and Database services into a single layer

// $ExpectType Layer<FailureCase, never, S3 | ElasticSearch | Database>
const layer = Layer.mergeAll(S3Test, ElasticSearchTest, DatabaseTest)

// Create a runnable effect to test the Workspace code
// The effect is provided with the test layer and a FailureCase service with undefined value (no failure case)

// $ExpectType Effect<never, S3Error | ElasticSearchError | DatabaseError, Entry>
const runnable = Workspace.make.pipe(
  Effect.provide(layer),
  Effect.provideService(FailureCase, undefined)
)

Effect.runPromise(Effect.either(runnable)).then(console.log)
