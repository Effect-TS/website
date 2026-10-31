export interface TestResult {
  readonly name: string
  readonly ok: boolean
  readonly message: string
}

const tests: Array<{ readonly name: string; readonly run: () => unknown }> = []

export const it = (name: string, run: () => unknown): void => {
  tests.push({ name, run })
}

const show = (value: unknown): string => {
  try {
    return JSON.stringify(value) ?? String(value)
  } catch {
    return String(value)
  }
}

interface Assert {
  ok(value: unknown, message?: string): asserts value
  strictEqual(actual: unknown, expected: unknown, message?: string): void
}

export const assert: Assert = {
  ok(value: unknown, message?: string): asserts value {
    if (!value) throw new Error(message ?? "Expected a truthy value")
  },
  strictEqual(actual: unknown, expected: unknown, message?: string): void {
    if (!Object.is(actual, expected)) {
      throw new Error(
        message ?? `Expected ${show(expected)}, received ${show(actual)}`,
      )
    }
  },
}

export async function runTests(): Promise<ReadonlyArray<TestResult>> {
  const results: Array<TestResult> = []
  for (const test of tests) {
    try {
      await test.run()
      results.push({ name: test.name, ok: true, message: "" })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      results.push({ name: test.name, ok: false, message })
    }
  }
  return results
}
