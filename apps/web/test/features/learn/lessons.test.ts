import { assert, test } from "vite-plus/test"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import * as Lessons from "../../../src/features/learn/lessons.ts"

// Lesson prose renders code from the course files rather than pasting it. A
// lesson that needs one declaration from a file whose rest it must not show,
// such as an exercise's answer in the same solution, renders that declaration
// alone: `<LessonCode file="..." declaration="Name" />`.

// Read off the module, so this file typechecks until the function exists.
const courseDeclaration = (path: string, name: string): string =>
  (
    Lessons as unknown as {
      readonly courseDeclaration: (path: string, name: string) => string
    }
  ).courseDeclaration(path, name)

const lesson4 = "lessons/part1/04-failure-you-can-see/solution/main.ts"
const lesson8 = "lessons/part1/08-a-place-for-rules/solution/main.ts"

test("a declaration is read from the file by name, exactly as written there and nothing after it", () => {
  assert.strictEqual(
    courseDeclaration(lesson4, "MissingField"),
    [
      `class MissingField extends Schema.TaggedError<MissingField>()("MissingField", {`,
      "  field: Schema.String",
      "}) {}",
    ].join("\n"),
  )
  assert.strictEqual(
    courseDeclaration(lesson8, "RuleStore"),
    [
      "class RuleStore extends Context.Service<RuleStore, {",
      "  readonly list: Effect.Effect<ReadonlyArray<string>>",
      `}>()("reflex/RuleStore") {}`,
    ].join("\n"),
  )
})

test("a name the file does not declare fails the build, naming the file", () => {
  assert.throws(
    () => courseDeclaration(lesson4, "RuleStore"),
    /04-failure-you-can-see/,
  )
})

const part1 = join(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "src",
  "content",
  "learn",
  "part-1",
)
const prose = (name: string) => readFileSync(join(part1, name), "utf8")

// Every `<LessonCode ... />` in the text, as its attributes.
const lessonCode = (text: string) =>
  [...text.matchAll(/<LessonCode\b([^>]*)\/>/g)].map(
    ([, attributes]) =>
      new Map(
        [...attributes!.matchAll(/(\w+)="([^"]*)"/g)].map(([, key, value]) => [
          key,
          value,
        ]),
      ),
  )

test("Part 1 renders its class declarations from the lesson files and pastes none", () => {
  const pasted = readdirSync(part1)
    .filter((name) => name.endsWith(".mdx"))
    .filter((name) => /`[^`]*\bclass \w+ extends\b[^`]*`/.test(prose(name)))
  assert.deepEqual(pasted, [])

  const rendered = (name: string) =>
    lessonCode(prose(name)).map((attributes) => [
      attributes.get("file"),
      attributes.get("declaration"),
    ])
  assert.deepInclude(rendered("04-failure-you-can-see.mdx"), [
    lesson4,
    "MissingField",
  ])
  assert.deepInclude(rendered("08-a-place-for-rules.mdx"), [
    lesson8,
    "RuleStore",
  ])
})

// Lesson 1 opens on the finished app as a terminal session captured from
// checkpoint 24, rendered from the checked-in file like any other listing.
const transcript = "checkpoints/24/transcript.txt"

test("lesson 1 renders the checkpoint 24 transcript from its file, in place of the clip slot", () => {
  const lesson1 = prose("01-the-finished-thing.mdx")
  assert.notInclude(lesson1, "Slot for the finished-app clip")
  assert.deepInclude(
    lessonCode(lesson1).map((attributes) => attributes.get("file")),
    transcript,
  )
})

test("the transcript names the command that regenerates it and shows a run succeed, one skip and one fail, each with its reason", () => {
  const text = Lessons.courseFile(transcript)
  const scripts = JSON.parse(
    readFileSync(
      join(import.meta.dirname, "../../../../../courses/reflex/package.json"),
      "utf8",
    ),
  ).scripts
  assert.include(scripts.transcript, "tools/transcript.ts")
  assert.include(text.split("\n")[0], "pnpm transcript")
  // `runs list` rows, as the CLI prints an outcome with its reason.
  assert.match(text, /\bsucceeded\b/)
  assert.match(text, /\bskipped \([^)]+\)/)
  assert.match(text, /\bfailed \((?:status|timeout|io)\)/)
})
