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
    createBucket: Effect.Effect<Bucket, S3Error>
    deleteBucket: (bucket: Bucket) => Effect.Effect<void>
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
    createIndex: Effect.Effect<Index, ElasticSearchError>
    deleteIndex: (index: Index) => Effect.Effect<void>
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
    createEntry: (
      bucket: Bucket,
      index: Index
    ) => Effect.Effect<Entry, DatabaseError>
    deleteEntry: (entry: Entry) => Effect.Effect<void>
  }
>() {}
