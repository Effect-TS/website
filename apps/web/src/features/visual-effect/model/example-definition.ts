import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Scope from "effect/Scope"
import * as Atom from "effect/unstable/reactivity/Atom"
import * as React from "react"
import type { RenderableResult } from "./domain"
import type {
  CodeSnippet,
  CodeSnippetConfig,
  HighlightSelector,
} from "./snippet-highlights"

export type RenderableEffect<
  A extends RenderableResult,
  E extends RenderableResult,
  R = never,
> = Effect.Effect<A, E, R>

export interface ExampleDefinition {
  readonly key: string
  readonly title: string
  readonly subtitle: string | undefined
  readonly description: string | undefined
  readonly steps: ReadonlyArray<StepDefinition>
  readonly controls: ReadonlyArray<AnyExampleControl>
  readonly program: RenderableEffect<
    RenderableResult,
    RenderableResult,
    ExampleEnvironment
  >
  readonly code: CodeSnippetDefinition
  readonly features: ExampleFeatures
}

export type ExampleFeatureInput = {
  readonly finalizers?: boolean
  readonly timeline?: boolean
}

export interface ExampleDefinitionOptions<
  Features extends ExampleFeatureInput,
> {
  readonly label: string
  readonly subtitle?: string | undefined
  readonly description?: string | undefined
  readonly code: CodeSnippetConfig
  readonly resultHighlight?:
    | HighlightSelector
    | ReadonlyArray<HighlightSelector>
  readonly features?: Features | undefined
  readonly build: (
    ctx: BuildContext<Features>,
  ) => RenderableEffect<RenderableResult, RenderableResult, ExampleEnvironment>
}

export type ExampleEnvironment =
  | ControlSnapshot
  | Notifications
  | VisualFinalizers

export interface ExampleFeatures {
  readonly finalizers: boolean
  readonly timeline: boolean
}

export type FinalizersEnabled<Features extends ExampleFeatureInput> =
  Features extends {
    finalizers: true
  }
    ? true
    : Features extends { finalizers: boolean }
      ? Features["finalizers"] extends true
        ? true
        : false
      : false

export type TimelineEnabled<Features extends ExampleFeatureInput> =
  Features extends {
    timeline: true
  }
    ? true
    : Features extends { timeline: boolean }
      ? Features["timeline"] extends true
        ? true
        : false
      : false

export interface StepDefinition {
  readonly id: string
  readonly label: string
  readonly addToTimeline?: boolean
}

export class ExampleStep extends Context.Service<
  ExampleStep,
  {
    readonly definition: ExampleDefinition
    readonly step: StepDefinition
  }
>()("ExampleStep") {}

export interface AnyExampleControl {
  readonly id: string
  readonly label: string
  readonly description: string | undefined
  readonly initialValue: unknown
  readonly atom: Atom.Atom<unknown>
  readonly render: () => React.ReactNode
}

export interface ExampleControl<A> extends AnyExampleControl {
  readonly initialValue: A
  readonly atom: Atom.Writable<A>
}

export interface RegisterControlOptions<A> {
  readonly id: string
  readonly label: string
  readonly description?: string | undefined
  readonly initialValue: A
  readonly render: React.ComponentType<ControlRenderProps<A>>
}

export interface ControlRenderProps<A> {
  readonly control: ExampleControl<A>
}

export interface ControlValues {
  readonly get: <A>(control: ExampleControl<A>) => A
}

export class ControlSnapshot extends Context.Service<
  ControlSnapshot,
  { readonly get: <A>(atom: Atom.Atom<A>) => A }
>()("ControlSnapshot") {}

export interface CodeSnippetDefinition {
  readonly atom: Atom.Atom<CodeSnippet>
}

export type CodeDefinitionOptions =
  | CodeSnippetConfig
  | ((controls: ControlValues) => CodeSnippetConfig)

export type CodeSnippetSelectorOptions =
  | CodeSnippetSelectorConfig
  | ((controls: ControlValues) => CodeSnippetSelectorConfig)

export type CodeSnippetSelectorConfig =
  | HighlightSelector
  | ReadonlyArray<HighlightSelector>

export interface NotificationOptions {
  readonly duration?: Duration.Input | undefined
  readonly showOnHover?: boolean | undefined
}

export class Notifications extends Context.Service<
  Notifications,
  {
    readonly notify: (
      message: string,
      options?: NotificationOptions,
    ) => Effect.Effect<void>
  }
>()("Notifications") {}

export class VisualFinalizers extends Context.Service<
  VisualFinalizers,
  {
    readonly register: (label: string) => Effect.Effect<string>
    readonly run: <A, E, R>(
      id: string,
      effect: Effect.Effect<A, E, R>,
    ) => Effect.Effect<A, E, R>
  }
>()("VisualFinalizers") {}

export type FinalizerBuildContext = {
  readonly finalizers: {
    readonly add: <R>(
      label: string,
      finalizer: Effect.Effect<void, never, R>,
    ) => Effect.Effect<void, never, R | ExampleEnvironment | Scope.Scope>
  }
}

export type BaseBuildContext<Features extends ExampleFeatureInput> = {
  readonly addStep: {
    <A extends RenderableResult, E extends RenderableResult, R>(
      self: RenderableEffect<A, E, R>,
      options: AddStepOptions<Features>,
    ): RenderableEffect<A, E, R>
    (
      options: AddStepOptions<Features>,
    ): <A extends RenderableResult, E extends RenderableResult, R>(
      self: RenderableEffect<A, E, R>,
    ) => RenderableEffect<A, E, R>
  }
  readonly controls: {
    readonly register: <A>(
      input: RegisterControlOptions<A>,
    ) => ExampleControl<A>
    readonly read: <A>(
      control: ExampleControl<A>,
    ) => Effect.Effect<A, never, ExampleEnvironment>
  }
  readonly snippet: {
    readonly setCode: (input: CodeDefinitionOptions) => void
    readonly setResultHighlight: (input: CodeSnippetSelectorOptions) => void
  }
}

export type BuildContext<Features extends ExampleFeatureInput> =
  BaseBuildContext<Features> &
    (FinalizersEnabled<Features> extends true ? FinalizerBuildContext : {})

export type TimelineStepOptions = {
  readonly addToTimeline?: boolean | undefined
}

export type AddStepOptions<Features extends ExampleFeatureInput> = {
  readonly label: string
  readonly highlight?: CodeSnippetSelectorOptions | undefined
} & (TimelineEnabled<Features> extends true ? TimelineStepOptions : {})
