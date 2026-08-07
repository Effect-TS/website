import * as Atom from "effect/unstable/reactivity/Atom"
import type {
  ExampleDefinition,
  StepDefinition,
} from "@/features/visual-effect/model/example-definition"
import {
  InitialFinalizerPanelState,
  InitialState,
  type VisualFinalizerState,
  type VisualEffectScheduleTimeline,
  type VisualEffectState,
} from "@/features/visual-effect/model/domain"

export const exampleStateAtom = Atom.family((_definition: ExampleDefinition) =>
  Atom.make<VisualEffectState>(InitialState),
)

export const stepStateAtom = Atom.family((_definition: StepDefinition) =>
  Atom.make<VisualEffectState>(InitialState),
)

export const scheduleTimeAtom = Atom.family((_definition: ExampleDefinition) =>
  Atom.make(0),
)

export const scheduleTimelineAtom = Atom.family(
  (_definition: ExampleDefinition) =>
    Atom.make<VisualEffectScheduleTimeline>([]),
)

export const finalizersAtom = Atom.family((_definition: ExampleDefinition) =>
  Atom.make<VisualFinalizerState>(InitialFinalizerPanelState),
)

export interface ResetOptions {
  readonly silent?: boolean | undefined
}
