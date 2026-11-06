import type * as Monaco from "@effect/monaco-editor"
import type { RunResult } from "./protocol"
import { runLesson } from "./run"
import type { TestResult } from "./test-api"

export interface Problem {
  readonly line: number
  readonly message: string
}

export type CheckResult =
  | { readonly _tag: "Passed"; readonly logs: ReadonlyArray<string> }
  | {
      readonly _tag: "TypeErrors"
      readonly problems: ReadonlyArray<Problem>
    }
  | {
      readonly _tag: "GoalTypeErrors"
      readonly problems: ReadonlyArray<Problem>
    }
  | {
      readonly _tag: "TestsFailed"
      readonly results: ReadonlyArray<TestResult>
      readonly logs: ReadonlyArray<string>
    }
  | { readonly _tag: "Crashed"; readonly message: string }

type Diagnostic = Monaco.languages.typescript.Diagnostic

const flatten = (text: Diagnostic["messageText"]): string =>
  typeof text === "string" ? text : text.messageText

type TypeScriptWorker = Monaco.languages.typescript.TypeScriptWorker

async function problemsOf(
  client: TypeScriptWorker,
  model: Monaco.editor.ITextModel,
): Promise<ReadonlyArray<Problem>> {
  const uri = model.uri.toString()
  const [syntactic, semantic] = await Promise.all([
    client.getSyntacticDiagnostics(uri),
    client.getSemanticDiagnostics(uri),
  ])
  return [...syntactic, ...semantic]
    .filter((diagnostic) => diagnostic.category === 1)
    .map((diagnostic) => ({
      line:
        diagnostic.start === undefined
          ? 1
          : model.getPositionAt(diagnostic.start).lineNumber,
      message: flatten(diagnostic.messageText),
    }))
}

/**
 * Monaco registers its TypeScript worker lazily, after the first TypeScript
 * model exists. Until then `getTypeScriptWorker` rejects.
 */
async function typeScriptWorker(monaco: typeof Monaco) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await monaco.languages.typescript.getTypeScriptWorker()
    } catch (error) {
      if (attempt >= 100) throw error
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
  }
}

async function emit(client: TypeScriptWorker, model: Monaco.editor.ITextModel) {
  const output = await client.getEmitOutput(model.uri.toString())
  const file = output.outputFiles[0]
  if (file === undefined) throw new Error("TypeScript emitted no output")
  return file.text
}

const summarise = (run: RunResult): CheckResult => {
  if (run.crash !== undefined) return { _tag: "Crashed", message: run.crash }
  if (run.results.length === 0) {
    return { _tag: "Crashed", message: "The goal test registered no tests." }
  }
  return run.results.every((result) => result.ok)
    ? { _tag: "Passed", logs: run.logs }
    : { _tag: "TestsFailed", results: run.results, logs: run.logs }
}

/** Type-checks the learner file and the goal test, then runs the test. */
export async function check(
  monaco: typeof Monaco,
  main: Monaco.editor.ITextModel,
  test: Monaco.editor.ITextModel,
): Promise<CheckResult> {
  const client = await (await typeScriptWorker(monaco))(main.uri)
  const mainProblems = await problemsOf(client, main)
  if (mainProblems.length > 0) {
    return { _tag: "TypeErrors", problems: mainProblems }
  }
  const testProblems = await problemsOf(client, test)
  if (testProblems.length > 0) {
    return { _tag: "GoalTypeErrors", problems: testProblems }
  }
  return summarise(
    await runLesson({
      main: await emit(client, main),
      test: await emit(client, test),
    }),
  )
}
