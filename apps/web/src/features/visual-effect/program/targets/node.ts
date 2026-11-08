import { Effect, Schema } from "effect"
import { Command, Mount } from "foldkit"
import { startAnimation } from "../drivers/animation"
import { NodeTagSchema } from "../drivers/node-motion"
import type { NodeTag } from "../drivers/node-motion"
import { Message } from "../message"
import { afterRender } from "../motion"
import { acquireDriver, makeTable } from "../target"

export const NodeKey = Schema.String.pipe(Schema.brand("NodeKey"))
export type NodeKey = typeof NodeKey.Type

const input = { id: NodeKey, tag: NodeTagSchema }

// NOTE: Module state on purpose. A Mount fills it and a Command reads it. See `target.ts`.
const table = makeTable<NodeKey, NodeTag>()

/** Starts the animation of a node. It lives as long as the node. A Command gives it each new state. */
export const AnimateNode = Mount.define("AnimateNode", {
  args: input,
  messages: [Message.CompletedAnimateNode],
  execute: ({ element, id, tag }) =>
    acquireDriver(
      element,
      (host) => startAnimation(host, tag),
      (driver) => table.register(id, driver),
    ).pipe(Effect.as(Message.CompletedAnimateNode())),
})

/** Moves a node to its new state. */
export const ChangeNode = Command.define("ChangeNode", {
  args: input,
  messages: [Message.CompletedAnimateNode],
  execute: ({ id, tag }) =>
    afterRender.pipe(
      Effect.andThen(Effect.sync(() => table.send(id, tag))),
      Effect.as(Message.CompletedAnimateNode()),
    ),
})
