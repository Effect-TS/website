import { overlay } from "@foldkit/devtools/vite"
import { Effect } from "effect"
import {
  type DevToolsOverlay,
  __setDevToolsOverlay,
} from "foldkit/devtools-host"
import { useNativeTrigger } from "./devtools-trigger"

const withNativeTrigger: DevToolsOverlay = (
  store,
  position,
  mode,
  maybeBanner,
) =>
  overlay(store, position, mode, maybeBanner).pipe(
    Effect.tap(() => Effect.sync(useNativeTrigger)),
  )

__setDevToolsOverlay(withNativeTrigger)
