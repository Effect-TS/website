import { Effect, Context } from "effect"

export class S3Error {
  readonly _tag = "S3Error"
}

export interface Bucket {
  readonly name: string
}

export interface S3 {
  createBucket: Effect.Effect<never, S3Error, Bucket>
  deleteBucket: (bucket: Bucket) => Effect.Effect<never, never, void>
}

export const S3 = Context.Tag<S3>()

export class ElasticSearchError {
  readonly _tag = "ElasticSearchError"
}

export interface Index {
  readonly id: string
}

export interface ElasticSearch {
  createIndex: Effect.Effect<never, ElasticSearchError, Index>
  deleteIndex: (index: Index) => Effect.Effect<never, never, void>
}

export const ElasticSearch = Context.Tag<ElasticSearch>()

export class DatabaseError {
  readonly _tag = "DatabaseError"
}

export interface Entry {
  readonly id: string
}

export interface Database {
  createEntry: (
    bucket: Bucket,
    index: Index
  ) => Effect.Effect<never, DatabaseError, Entry>
  deleteEntry: (entry: Entry) => Effect.Effect<never, never, void>
}

export const Database = Context.Tag<Database>()
