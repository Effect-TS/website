import { Effect, Option, Schema } from "effect"
import { Command } from "foldkit"
import { findEntry } from "./catalog"
import { Message } from "./message"
import * as Runner from "./runner"

export const StartRun = Command.define("StartRun", {
  args: {
    runId: Schema.Number,
    key: Schema.String,
    controls: Schema.Record(Schema.String, Schema.String),
  },
  messages: [Message.CompletedStartRun],
  execute: ({ runId, key, controls }) =>
    Option.match(findEntry(key), {
      onNone: () => Effect.void,
      onSome: ({ example }) => Runner.start(runId, example, controls),
    }).pipe(Effect.as(Message.CompletedStartRun())),
})

export const StopRun = Command.define("StopRun", {
  messages: [Message.CompletedStopRun],
  execute: Runner.stop.pipe(Effect.as(Message.CompletedStopRun())),
})
