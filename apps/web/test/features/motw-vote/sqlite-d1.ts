import { readFileSync } from "node:fs"
import { DatabaseSync, type SQLInputValue } from "node:sqlite"
import type { D1ClientConfig } from "@effect/sql-d1/D1Client"

const migration = readFileSync(
  new URL("../../../migrations/0001_module_votes.sql", import.meta.url),
  "utf8",
)

interface Statement {
  readonly bind: (...values: ReadonlyArray<SQLInputValue>) => Statement
  readonly all: () => Promise<{ readonly results: ReadonlyArray<unknown> }>
  readonly rows: () => ReadonlyArray<unknown>
}

/**
 * A SQLite stand-in for a D1 binding, so the real SQL runs in tests. It has
 * only what `D1Client` calls: `prepare`, `bind`, `all` and `batch`.
 */
export const sqliteD1 = (): D1ClientConfig["db"] => {
  const sqlite = new DatabaseSync(":memory:")
  sqlite.exec(migration)

  const statement = (
    query: string,
    values: ReadonlyArray<SQLInputValue>,
  ): Statement => {
    const rows = () => {
      const prepared = sqlite.prepare(query)
      if (prepared.columns().length > 0) return prepared.all(...values)
      prepared.run(...values)
      return []
    }
    return {
      bind: (...next) => statement(query, next),
      all: async () => ({ results: rows() }),
      rows,
    }
  }

  const db = {
    prepare: (query: string) => statement(query, []),
    batch: async (statements: ReadonlyArray<Statement>) => {
      sqlite.exec("BEGIN")
      try {
        const results = statements.map((s) => ({ results: s.rows() }))
        sqlite.exec("COMMIT")
        return results
      } catch (error) {
        sqlite.exec("ROLLBACK")
        throw error
      }
    },
  }
  return db as unknown as D1ClientConfig["db"]
}
