import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { identity } from "effect/Function"
import * as Random from "effect/Random"
import * as String from "effect/String"
import { defineExample } from "../model/define-example"
import { Notifications } from "../model/example-definition"
import { HighlightSelector } from "../model/snippet-definition"
import { EmojiResult } from "../ui/results/emoji"
import { ErrorResult } from "../ui/results/error"
import { PrimitiveResult } from "../ui/results/primitive"

const PASSWORDS = [
  "password123",
  "12345678",
  "SuperSecret2024!",
  "p@ssw0rd",
  "admin",
  "correcthorsebatterystaple",
  "ThisIsWayTooLongForAnyReasonablePasswordManagerToHandle2024!",
  "abc",
  "P@ssw0rd123!",
  "hunter2",
  "qwerty",
  "letmein",
  "iloveyou",
  "monkey123",
  "dragon",
]

class Password extends Context.Service<Password, string>()("Password", {
  make: Effect.gen(function* () {
    const index = yield* Random.nextIntBetween(0, PASSWORDS.length, {
      halfOpen: true,
    })
    return PASSWORDS[index]!
  }),
}) {}

export const validateExample = defineExample({
  label: "Effect.validate",
  description: "Accumulate validation errors instead of short-circuiting",
  code: {
    language: "typescript",
    source: String.stripMargin(
      `|const length = checkLength(password)
       |const complexity = checkComplexity(password)
       |const vibes = checkVibes(password)
       |
       |const result = Effect.validate(
       |  [iceCream, battery, popsicle, toad, lollipop],
       |  performLick
       |)`,
    ),
  },
  resultHighlight: HighlightSelector.LineRange({
    startLine: 5,
    endLine: 8,
  }),
  build: ({ addStep }) => {
    const length = Effect.gen(function* () {
      const notifications = yield* Notifications
      const password = yield* Password

      const delay = yield* Random.nextIntBetween(600, 900)
      yield* Effect.sleep(delay)

      const length = password.length

      if (length < 8) {
        return yield* Effect.fail(new ErrorResult("Too Short!")).pipe(
          Effect.tapError((error) => notifications.notify(error.message)),
        )
      }

      if (length > 20) {
        return yield* Effect.fail(new ErrorResult("Too Long!")).pipe(
          Effect.tapError((error) => notifications.notify(error.message)),
        )
      }

      const roll = yield* Random.next
      if (length === 8 && roll < 0.3) {
        return yield* Effect.fail(new ErrorResult("Too Weak!")).pipe(
          Effect.tapError((error) => notifications.notify(error.message)),
        )
      }

      return new EmojiResult("Ok")
    })

    const complexity = Effect.gen(function* () {
      const notifications = yield* Notifications
      const password = yield* Password

      const delay = yield* Random.nextIntBetween(400, 600)
      yield* Effect.sleep(delay)

      const hasLower = /[a-z]/.test(password)
      const hasUpper = /[A-Z]/.test(password)
      const hasNumbers = /[0-9]/.test(password)
      const hasSpecial = /[^a-zA-Z0-9]/.test(password)

      const complexityScore = [
        hasLower,
        hasUpper,
        hasNumbers,
        hasSpecial,
      ].filter(Boolean).length

      if (complexityScore < 2) {
        return yield* Effect.fail(new ErrorResult("Too Simple!")).pipe(
          Effect.tapError((error) => notifications.notify(error.message)),
        )
      }

      if (password.toLowerCase() === password && !hasNumbers && !hasSpecial) {
        return yield* Effect.fail(new ErrorResult("Weak!")).pipe(
          Effect.tapError((error) => notifications.notify(error.message)),
        )
      }

      if (/^\d+$/.test(password)) {
        return yield* Effect.fail(new ErrorResult("Only #s!")).pipe(
          Effect.tapError((error) => notifications.notify(error.message)),
        )
      }

      const roll = yield* Random.next
      if (complexityScore === 2 && roll < 0.3) {
        return yield* Effect.fail(new ErrorResult("Meh!")).pipe(
          Effect.tapError((error) => notifications.notify(error.message)),
        )
      }

      return new EmojiResult("Ok")
    })

    const vibes = Effect.gen(function* () {
      const notifications = yield* Notifications
      const password = yield* Password

      const delay = yield* Random.nextIntBetween(350, 550)
      yield* Effect.sleep(delay)

      const roll = yield* Random.next
      if (roll > 0.4) {
        return new EmojiResult("Ok")
      }

      const vibeFailures: Record<string, string> = {
        password123: "Basic!",
        "12345678": "Boring!",
        "SuperSecret2024!": "Try Hard!",
        "p@ssw0rd": "Cringe!",
        admin: "Sus!",
        correcthorsebatterystaple: "Too XKCD!",
        "ThisIsWayTooLongForAnyReasonablePasswordManagerToHandle2024!":
          "Extra!",
        abc: "Lazy!",
        "P@ssw0rd123!": "Obvious!",
        hunter2: "Meme!",
        qwerty: "NO, DVORAK!",
        letmein: "Desperate!",
        iloveyou: "Cheesy!",
        monkey123: "Random!",
        dragon: "Fantasy!",
      }

      const vibeError = vibeFailures[password]
      if (vibeError) {
        return yield* Effect.fail(new ErrorResult(vibeError)).pipe(
          Effect.tapError((error) => notifications.notify(error.message)),
        )
      }

      return yield* Effect.fail(new ErrorResult("Off!")).pipe(
        Effect.tapError((error) => notifications.notify(error.message)),
      )
    })

    const lengthStep = addStep(length, {
      label: "length",
      highlight: HighlightSelector.Text({ text: "checkLength(password)" }),
    })

    const complexityStep = addStep(complexity, {
      label: "complexity",
      highlight: HighlightSelector.Text({ text: "checkComplexity(password)" }),
    })

    const vibesStep = addStep(vibes, {
      label: "vibes",
      highlight: HighlightSelector.Text({ text: "checkVibes(password)" }),
    })

    return Effect.validate(
      [lengthStep, complexityStep, vibesStep],
      identity,
    ).pipe(
      Effect.as(new PrimitiveResult("Password Accepted!")),
      Effect.catch(
        Effect.fnUntraced(function* (errors) {
          const notifications = yield* Notifications
          const notification =
            errors.length === 1 ? "1 error" : `${errors.length} errors`
          yield* notifications.notify(notification, { showOnHover: true })
          const message = errors.map((error) => error.message).join(", ")
          return yield* Effect.fail(new ErrorResult(message))
        }),
      ),
      Effect.provideServiceEffect(Password, Password.make),
    )
  },
})
