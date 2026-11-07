import { defineProgram } from "@/lib/foldkit/program"
import type { Message } from "./message"
import { Flags, Model } from "./model"
import { subscriptions } from "./subscription"
import { init, update } from "./update"
import { view } from "./view"

export const ExamplesApp = defineProgram<{}, Model, Message, Flags>({
  Model,
  Flags,
  init,
  update,
  view,
  subscriptions,
  flags: () => ({}),
})
