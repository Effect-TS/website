import { Effect, Context } from "effect"

export class S3Error {
  readonly _tag = "S3Error"
}

export interface Bucket {
  readonly name: string
}

export class S3 extends Context.Tag("S3")<
  S3,
  {
    readonly createBucket: Effect.Effect<Bucket, S3Error>
    readonly deleteBucket: (bucket: Bucket) => Effect.Effect<void>
  }
>() {}

export class ElasticSearchError {
  readonly _tag = "ElasticSearchError"
}

export interface Index {
  readonly id: string
}

export class ElasticSearch extends Context.Tag("ElasticSearch")<
  ElasticSearch,
  {
    readonly createIndex: Effect.Effect<Index, ElasticSearchError>
    readonly deleteIndex: (index: Index) => Effect.Effect<void>
  }
>() {}

export class DatabaseError {
  readonly _tag = "DatabaseError"
}

export interface Entry {
  readonly id: string
}

export class Database extends Context.Tag("Database")<
  Database,
  {
    readonly createEntry: (
      bucket: Bucket,
      index: Index
    ) => Effect.Effect<Entry, DatabaseError>
    readonly deleteEntry: (entry: Entry) => Effect.Effect<void>
  }
>() {}
