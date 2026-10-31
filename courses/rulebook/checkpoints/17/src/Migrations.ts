import { SqliteMigrator } from "@effect/sql-sqlite-node"
import { Effect, FileSystem, Path } from "effect"
import { SqlClient } from "effect/sql"

// Applies the SQL files in migrations/ that this database has not seen yet,
// in the order of their number. The migrator records each one it ran in a
// table of its own, so starting the server again changes nothing.
//
// The migrator's own file loader imports `.js` and `.ts` files. The supplied
// migrations are plain SQL, so this loader reads each file and runs its
// statements, one at a time.
const loader = Effect.gen(function*() {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const directory = path.join(import.meta.dirname, "..", "..", "..", "migrations")
  const files = yield* fs.readDirectory(directory).pipe(
    Effect.mapError((cause) =>
      new SqliteMigrator.MigrationError({ kind: "Failed", cause, message: "Failed to read migrations/" })
    )
  )
  return files.flatMap((file) => {
    const match = file.match(/^(\d+)_(.+)\.sql$/)
    if (match === null) return []
    // Loading a migration reads its file; running it runs each statement,
    // which ends with a semicolon at the end of a line.
    const load = fs.readFileString(path.join(directory, file)).pipe(
      Effect.map((text) =>
        Effect.gen(function*() {
          const sql = yield* SqlClient.SqlClient
          for (const statement of text.split(/;\s*$/m)) {
            if (statement.trim() !== "") yield* sql.unsafe(statement)
          }
        })
      )
    )
    return [[Number(match[1]), match[2], load] as const]
  }).toSorted(([a], [b]) => a - b)
})

export const layer = SqliteMigrator.layer({ loader })
