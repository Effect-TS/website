import { assert, test } from "vite-plus/test"
import * as Cause from "effect/Cause"
import * as AsyncResult from "effect/reactivity/AsyncResult"
import { createElement, type FunctionComponent } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { RunnersDidNotPause } from "../../../src/features/playground/services/run-control.ts"

// Solve and Reset can fail without touching the files, for instance when a
// runner in the terminal does not pause in time. The lesson toolbar shows that
// failure through `LessonActionStatus`, which renders the state of the last
// Solve or Reset. A newer click interrupting an older one is not a failure.
// The module is loaded at run time until it exists.

interface LessonActionStatusProps {
  readonly action: "solve" | "reset"
  readonly result: AsyncResult.AsyncResult<unknown, unknown>
}

const render = async (props: LessonActionStatusProps) => {
  const { LessonActionStatus } = (await import(
    /* @vite-ignore */ new URL(
      "../../../src/features/learn/LessonActionStatus.tsx",
      import.meta.url,
    ).href
  )) as { LessonActionStatus: FunctionComponent<LessonActionStatusProps> }
  return renderToStaticMarkup(createElement(LessonActionStatus, props))
}

test("a Solve that left the files unchanged says so and how to retry", async () => {
  const html = await render({
    action: "solve",
    result: AsyncResult.failure(
      Cause.fail(new RunnersDidNotPause({ pids: ["22"] })),
    ),
  })

  assert.include(html, 'role="alert"')
  assert.match(html, /Solve/)
  assert.match(html, /not changed/i)
  assert.match(html, /try again/i)
})

test("any other failed Reset is shown too", async () => {
  const html = await render({
    action: "reset",
    result: AsyncResult.failure(Cause.die(new Error("mount failed"))),
  })

  assert.include(html, 'role="alert"')
  assert.match(html, /Reset/)
})

test("nothing is shown before, during or after a successful action, or for an interrupted one", async () => {
  for (const result of [
    AsyncResult.initial(),
    AsyncResult.initial(true),
    // A retry after a failure: the atom keeps the old failure while it waits.
    AsyncResult.failure(Cause.fail(new RunnersDidNotPause({ pids: ["22"] })), {
      waiting: true,
    }),
    AsyncResult.success(undefined),
    AsyncResult.failure(Cause.interrupt()),
  ]) {
    assert.equal(await render({ action: "reset", result }), "", result._tag)
  }
})
