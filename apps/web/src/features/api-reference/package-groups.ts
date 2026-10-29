/**
 * Package groups of the API reference index, shared with the changelog index so
 * both list packages under the same headings in the same order.
 */
const GROUP_NAMES: Record<string, Record<string, string>> = {
  v3: {
    effect: "Core",
    "@effect/platform": "Platform",
    "@effect/platform-browser": "Platform",
    "@effect/platform-bun": "Platform",
    "@effect/platform-node": "Platform",
    "@effect/platform-node-shared": "Platform",
    "@effect/cluster": "Clustering",
    "@effect/workflow": "Workflows",
    "@effect/sql": "SQL",
    "@effect/sql-clickhouse": "SQL",
    "@effect/sql-d1": "SQL",
    "@effect/sql-drizzle": "SQL",
    "@effect/sql-kysely": "SQL",
    "@effect/sql-libsql": "SQL",
    "@effect/sql-mssql": "SQL",
    "@effect/sql-mysql2": "SQL",
    "@effect/sql-pg": "SQL",
    "@effect/sql-sqlite-bun": "SQL",
    "@effect/sql-sqlite-do": "SQL",
    "@effect/sql-sqlite-node": "SQL",
    "@effect/sql-sqlite-react-native": "SQL",
    "@effect/sql-sqlite-wasm": "SQL",
    "@effect/ai": "AI",
    "@effect/ai-amazon-bedrock": "AI",
    "@effect/ai-anthropic": "AI",
    "@effect/ai-google": "AI",
    "@effect/ai-openai": "AI",
    "@effect/ai-openrouter": "AI",
    "@effect/opentelemetry": "Telemetry",
    "@effect/cli": "CLI",
    "@effect/printer": "Printing",
    "@effect/printer-ansi": "Printing",
    "@effect/vitest": "Testing",
    "@effect/experimental": "Other",
    "@effect/typeclass": "Other",
  },
  v4: {
    effect: "Core",
    "@effect/platform-browser": "Platform",
    "@effect/platform-bun": "Platform",
    "@effect/platform-node-shared": "Platform",
    "@effect/platform-node": "Platform",
    "@effect/opentelemetry": "Telemetry",
    "@effect/sql-clickhouse": "SQL",
    "@effect/sql-d1": "SQL",
    "@effect/sql-libsql": "SQL",
    "@effect/sql-mssql": "SQL",
    "@effect/sql-mysql2": "SQL",
    "@effect/sql-pg": "SQL",
    "@effect/sql-pglite": "SQL",
    "@effect/sql-sqlite-bun": "SQL",
    "@effect/sql-sqlite-do": "SQL",
    "@effect/sql-sqlite-node": "SQL",
    "@effect/sql-sqlite-react-native": "SQL",
    "@effect/sql-sqlite-wasm": "SQL",
    "@effect/ai-anthropic": "AI",
    "@effect/ai-openai-compat": "AI",
    "@effect/ai-openai": "AI",
    "@effect/ai-openrouter": "AI",
    "@effect/atom-react": "Reactivity",
    "@effect/atom-solid": "Reactivity",
    "@effect/atom-vue": "Reactivity",
    "@effect/docgen": "Tooling",
    "@effect/openapi-generator": "Tooling",
    "@effect/vitest": "Testing",
  },
}

const GROUP_ORDERING = [
  "Core",
  "Platform",
  "SQL",
  "AI",
  "Clustering",
  "Workflows",
  "Reactivity",
  "Telemetry",
  "CLI",
  "Printing",
  "Testing",
  "Tooling",
  "Other",
]

function inferGroup(packageName: string): string {
  if (packageName.includes("/sql-") || packageName === "@effect/sql") {
    return "SQL"
  }
  if (packageName.includes("/ai-") || packageName === "@effect/ai") {
    return "AI"
  }
  if (packageName.includes("platform")) {
    return "Platform"
  }
  return "Other"
}

export function packageGroup(version: string, packageName: string): string {
  return GROUP_NAMES[version]?.[packageName] ?? inferGroup(packageName)
}

/** Known groups first, in display order, then the rest alphabetically. */
export function compareGroups(left: string, right: string): number {
  const leftIndex = GROUP_ORDERING.indexOf(left)
  const rightIndex = GROUP_ORDERING.indexOf(right)
  const leftOrder = leftIndex < 0 ? GROUP_ORDERING.length : leftIndex
  const rightOrder = rightIndex < 0 ? GROUP_ORDERING.length : rightIndex
  return leftOrder - rightOrder || left.localeCompare(right)
}
