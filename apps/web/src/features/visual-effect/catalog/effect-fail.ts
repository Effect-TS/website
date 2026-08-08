import * as Effect from "effect/Effect"
import { defineExample } from "../model/define-example"
import { Notifications } from "../model/example-definition"
import { HighlightSelector } from "../model/snippet-definition"
import { ErrorResult } from "../ui/results/error"

export const failExample = defineExample({
  label: "Effect.fail",
  description: "Create an effect that represents a recoverable error",
  code: {
    language: "typescript",
    source: 'const error = Effect.fail("Kaboom!")',
  },
  resultHighlight: HighlightSelector.Text({
    text: 'Effect.fail("Kaboom!")',
  }),
  build: () =>
    Effect.fail(new ErrorResult("Kaboom!")).pipe(
      Effect.tapError((error) =>
        Notifications.use(({ notify }) =>
          notify(error.message, {
            duration: "2 seconds",
            showOnHover: true,
          }),
        ),
      ),
    ),
})
