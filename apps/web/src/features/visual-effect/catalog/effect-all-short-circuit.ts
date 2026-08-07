import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Random from "effect/Random"
import * as String from "effect/String"
import { defineExample } from "../model/define-example"
import { Notifications } from "../model/example-definition"
import { HighlightSelector } from "../model/snippet-definition"
import { ErrorResult } from "../ui/results/error"
import { PrimitiveResult } from "../ui/results/primitive"

class ShouldFail extends Context.Service<ShouldFail>()("ShouldFail", {
  make: Effect.gen(function* () {
    const failingIndex = yield* Random.nextIntBetween(0, 2)
    return (index: number) => failingIndex === index
  }),
}) {}

interface StepConfig {
  readonly label: string
  readonly errorMessage: string
  readonly successMessage: string
  readonly highlight: HighlightSelector
}

const STEP_CONFIGS: ReadonlyArray<StepConfig> = [
  {
    label: "balance",
    errorMessage: "Account Locked!",
    successMessage: "$58",
    highlight: HighlightSelector.Text({ text: "readAccountBalance()" }),
  },
  {
    label: "credit",
    errorMessage: "Too Low!",
    successMessage: "Approved",
    highlight: HighlightSelector.Text({ text: "checkCreditScore()" }),
  },
  {
    label: "payment",
    errorMessage: "Gateway Error!",
    successMessage: "Ka-ching!",
    highlight: HighlightSelector.Text({ text: "chargeCreditCard()" }),
  },
] as const

const simulateTransaction = Effect.fnUntraced(function* (
  errorMessage: string,
  successMessage: string,
  index: number,
) {
  const shouldFail = yield* ShouldFail

  const delay = yield* Random.nextIntBetween(400, 900)
  yield* Effect.sleep(delay)

  if (shouldFail(index)) {
    return yield* Effect.fail(new ErrorResult(errorMessage)).pipe(
      Effect.tapError((error) =>
        Notifications.use(({ notify }) =>
          notify(error.message, {
            showOnHover: true,
          }),
        ),
      ),
    )
  }

  return new PrimitiveResult(successMessage)
})

export const allShortCircuitExample = defineExample({
  label: "Effect.all",
  subtitle: "short circuit",
  description: "Stop execution on the first error encountered",
  code: {
    language: "typescript",
    source: String.stripMargin(
      `|const balance = readAccountBalance()
       |const credit = checkCreditScore()
       |const payment = chargeCreditCard()
       |
       |const result = Effect.all([balance, credit, payment])`,
    ),
  },
  resultHighlight: HighlightSelector.Text({
    text: "Effect.all([balance, credit, payment])",
  }),
  build: ({ addStep }) => {
    const steps = STEP_CONFIGS.map(
      ({ label, errorMessage, successMessage, highlight }, index) =>
        addStep(simulateTransaction(errorMessage, successMessage, index), {
          label,
          highlight,
        }),
    )

    return Effect.all(steps).pipe(
      Effect.as(new PrimitiveResult("done")),
      Effect.provideServiceEffect(ShouldFail, ShouldFail.make),
    )
  },
})
