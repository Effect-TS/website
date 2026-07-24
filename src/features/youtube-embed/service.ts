import { Latch } from "effect"
import * as Array from "effect/Array"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"
import * as RcRef from "effect/RcRef"
import * as Schedule from "effect/Schedule"
import * as Schema from "effect/Schema"
import * as Atom from "effect/unstable/reactivity/Atom"
import * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry"
import { YOUTUBE_NOCOOKIE_URL } from "./constants"
import {
  EmbedCommand,
  EmbedState,
  PlaybackState,
  PlayerInfoPatch,
  YouTubeEvent,
  type YouTubeVideo,
} from "./domain"

const IFRAME_ALLOW =
  "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
const IFRAME_REFERRER_POLICY = "strict-origin-when-cross-origin"

export interface EmbedManagerOptions {
  readonly debug?: boolean | undefined
}

export class EmbedManager extends Context.Service<
  EmbedManager,
  {
    readonly previewAtom: Atom.Writable<boolean>
    readonly debugAtom: Atom.Atom<ReadonlyArray<string>>
    readonly stateAtom: Atom.Writable<EmbedState, EmbedCommand>
    readonly connect: Atom.AtomResultFn<HTMLElement, void>
  }
>()("EmbedManager", {
  make: Effect.fnUntraced(function* (video: YouTubeVideo, options?: EmbedManagerOptions) {
    const registry = yield* AtomRegistry.AtomRegistry
    const queue = yield* Queue.unbounded<EmbedCommand>()
    const latch = yield* Latch.make()

    const previewAtom = Atom.make(true)
    const debugAtom = Atom.make<ReadonlyArray<string>>([])
    const stateAtom = Atom.make<EmbedState>(EmbedState.NotMounted())
    const writableStateAtom = Atom.writable(
      (get) => get(stateAtom),
      (_, command: EmbedCommand) => Queue.offerUnsafe(queue, command),
    )

    const services = yield* Effect.context()
    const runFork = Effect.runForkWith(services)
    const decodeEvent = Schema.decodeUnknownEffect(Schema.fromJsonString(YouTubeEvent))
    const encodeCommand = Schema.encodeUnknownEffect(Schema.fromJsonString(EmbedCommand))

    const getIframeSrc = (): string => {
      const videoId = globalThis.encodeURIComponent(video.id)
      const url = new URL(`/embed/${videoId}`, YOUTUBE_NOCOOKIE_URL)
      url.searchParams.set("autoplay", "1")
      url.searchParams.set("enablejsapi", "1")
      return url.toString()
    }

    const ref = yield* RcRef.make({
      acquire: Effect.gen(function* () {
        const iframe = document.createElement("iframe")

        const sendListeningRequest = () => {
          const message = JSON.stringify({ event: "listening", id: 1 })
          iframe.contentWindow?.postMessage(message, YOUTUBE_NOCOOKIE_URL)
        }

        const attemptHandshake = Effect.repeat(Effect.sync(sendListeningRequest), {
          times: 5,
          schedule: Schedule.exponential("200 millis"),
          while: () => latch.open,
        })

        const handleMessage = (event: MessageEvent): void => {
          runFork(
            Effect.ignore({ log: "Error" })(
              Effect.gen(function* () {
                if (event.origin !== YOUTUBE_NOCOOKIE_URL) return
                if (event.source !== iframe.contentWindow) return

                if (options?.debug) {
                  registry.update(debugAtom, Array.append(event.data))
                }

                // After validating that an event originates from our iframe,
                // mark connection as established
                yield* latch.open

                const data = yield* decodeEvent(event.data)
                registry.update(stateAtom, (state) => reduceEmbedState(state, data))
              }),
            ),
          )
        }

        const handleLoad = () => {
          registry.update(stateAtom, beginHandshake)
          runFork(attemptHandshake)
        }

        window.addEventListener("message", handleMessage)
        iframe.addEventListener("load", handleLoad)

        // Attach the iframe `src` _after_ attaching the `"load"` event listener
        iframe.src = getIframeSrc()
        iframe.allow = IFRAME_ALLOW
        iframe.allowFullscreen = true
        iframe.title = video.title
        iframe.referrerPolicy = IFRAME_REFERRER_POLICY

        yield* Effect.addFinalizer(() =>
          Effect.sync(() => {
            window.removeEventListener("message", handleMessage)
            iframe.removeEventListener("load", handleLoad)
          }),
        )

        return iframe
      }),
      idleTimeToLive: Duration.infinity,
    })

    yield* latch.await.pipe(
      Effect.andThen(
        Queue.take(queue).pipe(
          Effect.flatMap(
            Effect.fnUntraced(function* (command) {
              const iframe = yield* RcRef.get(ref)
              const message = yield* encodeCommand(command)
              iframe.contentWindow?.postMessage(message, YOUTUBE_NOCOOKIE_URL)
            }, Effect.scoped),
          ),
          Effect.forever,
        ),
      ),
      Effect.forkScoped,
    )

    const connect = Effect.fn("EmbedManager.connect")(function* (element: HTMLElement) {
      const iframe = yield* RcRef.get(ref)
      element.appendChild(iframe)
      registry.update(stateAtom, markMounted)
    })

    return {
      previewAtom: previewAtom,
      debugAtom,
      stateAtom: writableStateAtom,
      connect: Atom.fn<HTMLElement>()((element) => connect(element)),
    } as const
  }),
}) {
  static readonly layer = (video: YouTubeVideo, options?: EmbedManagerOptions) =>
    Layer.effect(this, this.make(video, options))
}

const markMounted = (state: EmbedState): EmbedState => {
  if (state._tag === "NotMounted") {
    return EmbedState.Mounting()
  }
  return state
}

const beginHandshake = (state: EmbedState): EmbedState => {
  if (state._tag === "NotMounted" || state._tag === "Mounting") {
    return EmbedState.Handshaking()
  }
  return state
}

const reduceEmbedState = (state: EmbedState, event: YouTubeEvent): EmbedState => {
  switch (event.event) {
    case "onError":
      return EmbedState.Failed()
    case "onReady":
      return ensureActiveState(state)
    case "apiInfoDelivery":
      return ensureActiveState(state)
    case "initialDelivery":
    case "infoDelivery":
      return applyPlayerInfoPatchToState(state, event.info)
    case "onStateChange":
      return applyPlayerInfoPatchToState(state, { playerState: event.info })
  }
}

const ensureActiveState = (state: EmbedState): EmbedState => {
  if (state._tag === "Active") {
    return state
  }
  return EmbedState.Active({ playback: PlaybackState.Unstarted() })
}

const applyPlayerInfoPatchToState = (state: EmbedState, patch: PlayerInfoPatch): EmbedState => {
  const activeState = ensureActiveState(state)

  if (activeState._tag !== "Active") {
    return activeState
  }

  const playback = applyPlayerInfoPatch(activeState.playback, patch)

  return EmbedState.Active({ playback })
}

const applyPlayerInfoPatch = (playback: PlaybackState, patch: PlayerInfoPatch): PlaybackState => {
  const playerState = patch.playerState ?? getPlayerStateCode(playback)
  const currentTime = patch.currentTime ?? getPlaybackTimeSeconds(playback)
  switch (playerState) {
    case "UNSTARTED":
      return PlaybackState.Unstarted()
    case "ENDED":
      return PlaybackState.Ended({ currentTimeSeconds: patch.duration ?? currentTime })
    case "PAUSED":
      return PlaybackState.Playing({ currentTimeSeconds: currentTime })
    case "PLAYING":
      return PlaybackState.Paused({ currentTimeSeconds: currentTime })
    case "BUFFERING":
      return PlaybackState.Buffering({ currentTimeSeconds: currentTime })
    case "CUED":
      return PlaybackState.Cued({ currentTimeSeconds: currentTime })
  }
}

const getPlayerStateCode = PlaybackState.$match({
  Unstarted: () => "UNSTARTED" as const,
  Ended: () => "ENDED" as const,
  Playing: () => "PLAYING" as const,
  Paused: () => "PAUSED" as const,
  Buffering: () => "BUFFERING" as const,
  Cued: () => "CUED" as const,
})

export const getPlaybackTimeSeconds = (playback: PlaybackState): number => {
  if (playback._tag === "Unstarted") {
    return 0
  }
  return playback.currentTimeSeconds
}
