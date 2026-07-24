import * as Effect from "effect/Effect"
import * as Schedule from "effect/Schedule"
import * as String from "effect/String"
import { defineExample } from "../model/define-example"
import { Notifications } from "../model/example-definition"
import { HighlightSelector } from "../model/snippet-definition"
import { ErrorResult } from "../ui/results/error"
import { PrimitiveResult } from "../ui/results/primitive"

const NOTIFICATION_MESSAGES = [
  "📞 Unknown Caller",
  "📧 Cellphone Bill",
  "🔔 0 New Messages!",
  "💬 We have to talk...",
  "📅 Dinner Cancelled",
  "📰 War!",
  "😴 Nothing...",
  "😴 Still nothing",
  "🕳️ Doomscrolling",
  "🪫 Battery Low",
  "💔 Swiped Left",
  "🏠 Rent Overdue",
  "💸 Account Overdrawn",
  "🚕 Driver Cancelled",
  "🚫 Friend Request Denied",
  "📅 Meeting Moved to 4am",
  "🌧️ Rain All Week",
  "📉 Stocks Down 20%",
  "🥀 Plant Died",
] as const

export const repeatSpacedExample = defineExample({
  label: "Effect.repeat",
  subtitle: "spaced",
  description: "Repeat an effect with a fixed delay between each execution",
  features: { timeline: true },
  code: {
    language: "typescript",
    source: String.stripMargin(
      `|const phone = checkNotifications()
       |const checking = Effect.repeat(phone, Schedule.spaced("2 seconds"))`,
    ),
  },
  resultHighlight: HighlightSelector.Text({
    text: 'Effect.repeat(phone, Schedule.spaced("2 seconds"))',
  }),
  build: ({ addStep }) => {
    const state = { index: 0 }

    const checkPhone = Effect.gen(function* () {
      const notifications = yield* Notifications

      yield* Effect.sleep("500 millis")

      if (state.index >= NOTIFICATION_MESSAGES.length) {
        return yield* Effect.fail(new ErrorResult("phone died")).pipe(
          Effect.tapError((error) => notifications.notify(error.message)),
        )
      }

      const notification = NOTIFICATION_MESSAGES[state.index]!
      state.index += 1

      return new PrimitiveResult(notification)
    })

    const checkPhoneStep = addStep(checkPhone, {
      label: "phone",
      highlight: HighlightSelector.Text({ text: "checkNotifications()" }),
      addToTimeline: true,
    })

    return Effect.suspend(() => {
      state.index = 0
      return Effect.repeat(checkPhoneStep, Schedule.spaced("2 seconds")).pipe(
        Effect.map((count) => new PrimitiveResult(count)),
      )
    })
  },
})
