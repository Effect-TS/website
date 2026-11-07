import { defineProgram } from "@/lib/foldkit/program"
import type { Message } from "./message"
import { Flags, Model } from "./model"
import { subscriptions } from "./subscription"
import { init, update } from "./update"
import { view } from "./view"
import type { StyledLines } from "./highlight"

export interface Props {
  /** The default snippet, highlighted on the server. */
  readonly defaultLines: StyledLines
}

export const ExamplesApp = defineProgram<Props, Model, Message, Flags>({
  Model,
  Flags,
  init,
  update,
  view,
  subscriptions,
  flags: ({ props }) => ({ defaultLines: props.defaultLines }),
})
