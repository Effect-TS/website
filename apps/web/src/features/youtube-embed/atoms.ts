import * as Data from "effect/Data"
import * as Atom from "effect/unstable/reactivity/Atom"
import type { YouTubeVideo } from "./domain"
import { EmbedManager, type EmbedManagerOptions } from "./service"

export class EmbedManagerAtomParams extends Data.Class<{
  readonly video: YouTubeVideo
  readonly options?: EmbedManagerOptions | undefined
}> {}

export const embedManagerAtom = Atom.family(
  ({ video, options }: EmbedManagerAtomParams) => {
    const runtime = Atom.runtime(EmbedManager.layer(video, options))
    return runtime.atom(EmbedManager)
  },
)
