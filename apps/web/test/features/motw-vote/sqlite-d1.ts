import { readdirSync, readFileSync } from "node:fs"
import { DatabaseSync, type SQLInputValue } from "node:sqlite"
import type { D1ClientConfig } from "@effect/sql-d1/D1Client"

type D1 = D1ClientConfig["db"]
type Prepared = ReturnType<D1["prepare"]>
type Meta = Awaited<ReturnType<Prepared["run"]>>["meta"]

interface Result<T> {
  readonly success: true
  readonly meta: Meta
  readonly results: Array<T>
}

const migrationsDir = new URL("../../../migrations/", import.meta.url)

const migrations = readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort()
  .map((file) => readFileSync(new URL(file, migrationsDir), "utf8"))

const meta: Meta = {
  duration: 0,
  size_after: 0,
  rows_read: 0,
  rows_written: 0,
  last_row_id: 0,
  changed_db: false,
  changes: 0,
}

const unsupported = (name: string) =>
  Promise.reject(new Error(`The SQLite test double has no ${name}`))

const isSqlInput = (value: unknown): value is SQLInputValue =>
  value === null ||
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "bigint"

class Statement implements Prepared {
  constructor(
    private readonly sqlite: DatabaseSync,
    private readonly query: string,
    private readonly values: ReadonlyArray<SQLInputValue>,
  ) {}

  bind(...values: Array<unknown>) {
    if (!values.every(isSqlInput)) throw new Error("Unsupported bound value")
    return new Statement(this.sqlite, this.query, values)
  }

  /** The rows of a query, or none for a write. */
  rows<T>(): Array<T> {
    const prepared = this.sqlite.prepare(this.query)
    if (prepared.columns().length === 0) {
      prepared.run(...this.values)
      return []
    }
    // D1 lets the caller choose the row type, and so does this double
    return prepared.all(...this.values) as unknown as Array<T>
  }

  async all<T = Record<string, unknown>>(): Promise<Result<T>> {
    return { success: true, meta, results: this.rows<T>() }
  }

  async run<T = Record<string, unknown>>(): Promise<Result<T>> {
    return this.all<T>()
  }

  first<T = unknown>(colName: string): Promise<T | null>
  first<T = Record<string, unknown>>(): Promise<T | null>
  first(): Promise<never> {
    return unsupported("first")
  }

  raw<T = Array<unknown>>(options: {
    columnNames: true
  }): Promise<[Array<string>, ...Array<T>]>
  raw<T = Array<unknown>>(options?: { columnNames?: false }): Promise<Array<T>>
  raw(): Promise<never> {
    return unsupported("raw")
  }
}

/**
 * A SQLite stand-in for a D1 binding, so the real SQL runs in tests. It runs
 * queries and batches, and refuses the rest.
 */
class Database implements D1 {
  private readonly sqlite = new DatabaseSync(":memory:")

  constructor() {
    for (const migration of migrations) this.sqlite.exec(migration)
  }

  prepare(query: string) {
    return new Statement(this.sqlite, query, [])
  }

  async batch<T = unknown>(
    statements: Array<Prepared>,
  ): Promise<Array<Result<T>>> {
    this.sqlite.exec("BEGIN")
    try {
      const results = statements.map((statement) => ({
        success: true as const,
        meta,
        results: statement instanceof Statement ? statement.rows<T>() : [],
      }))
      this.sqlite.exec("COMMIT")
      return results
    } catch (error) {
      this.sqlite.exec("ROLLBACK")
      throw error
    }
  }

  exec(): Promise<never> {
    return unsupported("exec")
  }

  withSession(): never {
    throw new Error("The SQLite test double has no sessions")
  }

  dump(): Promise<never> {
    return unsupported("dump")
  }
}

export const sqliteD1 = (): D1 => new Database()
