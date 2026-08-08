import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import * as Exit from "effect/Exit"
import { dual } from "effect/Function"
import * as Types from "effect/Types"
import * as Atom from "effect/unstable/reactivity/Atom"
import * as React from "react"
import type { RenderableResult } from "./domain"
import {
  ControlSnapshot,
  ExampleStep,
  VisualFinalizers,
  type AddStepOptions,
  type AnyExampleControl,
  type BaseBuildContext,
  type CodeDefinitionOptions,
  type CodeSnippetSelectorOptions,
  type ControlValues,
  type ExampleControl,
  type ExampleDefinition,
  type ExampleDefinitionOptions,
  type ExampleFeatureInput,
  type FinalizerBuildContext,
  type RegisterControlOptions,
  type StepDefinition,
} from "./example-definition"
import { resolveSnippetDefinition } from "./snippet-definition"
import { toStepSnippetTargetKey } from "./snippet-highlights"

class DuplicateExampleControlIdError extends Error {
  constructor(exampleLabel: string, controlId: string) {
    super(
      `Duplicate control id \`${controlId}\` in example \`${exampleLabel}\``,
    )
  }
}

class InvalidExampleControlIdError extends Error {
  constructor(exampleLabel: string) {
    super(`Example \`${exampleLabel}\` registered a control with an empty id`)
  }
}

export const defineExample = <const Features extends ExampleFeatureInput = {}>(
  options: ExampleDefinitionOptions<Features>,
): ExampleDefinition => {
  const steps: Array<StepDefinition> = []
  const controls: Array<AnyExampleControl> = []
  const controlIds = new Set<string>()
  const selectorsByTarget: Record<string, CodeSnippetSelectorOptions> = {}
  let codeDefinitionOptions: CodeDefinitionOptions = options.code
  let resultHighlightDefinition: CodeSnippetSelectorOptions | undefined =
    options.resultHighlight

  const registerStep = (
    stepOptions: AddStepOptions<Features>,
  ): StepDefinition => {
    const step: Types.Mutable<StepDefinition> = {
      id: crypto.randomUUID(),
      label: stepOptions.label,
    }

    if ("addToTimeline" in stepOptions && stepOptions.addToTimeline) {
      step.addToTimeline = true
    }

    Equal.byReferenceUnsafe(step)
    steps.push(step)

    if (stepOptions.highlight !== undefined) {
      selectorsByTarget[toStepSnippetTargetKey(step.id)] = stepOptions.highlight
    }

    return step
  }

  const addStep: BaseBuildContext<Features>["addStep"] = dual(
    2,
    <A extends RenderableResult, E extends RenderableResult, R>(
      self: Effect.Effect<A, E, R>,
      stepOptions: AddStepOptions<Features>,
    ): Effect.Effect<A, E, R> => {
      const step = registerStep(stepOptions)
      return Effect.suspend(() =>
        Effect.withSpan(self, step.label, {
          annotations: ExampleStep.context({
            definition,
            step,
          }),
        }),
      )
    },
  )

  const registerControl = <A>(
    control: RegisterControlOptions<A>,
  ): ExampleControl<A> => {
    const normalizedControlId = control.id.trim()

    if (normalizedControlId.length === 0) {
      throw new InvalidExampleControlIdError(options.label)
    }

    if (controlIds.has(normalizedControlId)) {
      throw new DuplicateExampleControlIdError(
        options.label,
        normalizedControlId,
      )
    }

    controlIds.add(normalizedControlId)

    const atom = Atom.make(control.initialValue).pipe(
      Atom.withLabel(`${options.label}:control:${normalizedControlId}`),
    )

    const registeredControl: ExampleControl<A> = {
      id: normalizedControlId,
      label: control.label,
      description: control.description,
      initialValue: control.initialValue,
      atom,
      render: () =>
        React.createElement(control.render, { control: registeredControl }),
    }

    controls.push(registeredControl)
    Equal.byReferenceUnsafe(registeredControl)

    return registeredControl
  }

  const readControl = <A>(
    control: ExampleControl<A>,
  ): Effect.Effect<A, never, ControlSnapshot> => {
    return ControlSnapshot.useSync((snapshot) => snapshot.get(control.atom))
  }

  const addVisualFinalizer = <R>(
    label: string,
    finalizer: (
      exit: Exit.Exit<unknown, unknown>,
    ) => Effect.Effect<void, never, R>,
  ) =>
    VisualFinalizers.use((visualFinalizers) =>
      Effect.gen(function* () {
        const id = yield* visualFinalizers.register(label)
        yield* Effect.addFinalizer((exit) =>
          visualFinalizers.run(id, finalizer(exit)),
        )
      }),
    )

  const context: BaseBuildContext<Features> = {
    addStep,
    controls: {
      register: registerControl,
      read: readControl,
    },
    snippet: {
      setCode: (next) => {
        codeDefinitionOptions = next
      },
      setResultHighlight: (next) => {
        resultHighlightDefinition = next
      },
    },
  }

  const finalizersContext: FinalizerBuildContext = {
    finalizers: {
      add: (label, finalizer) => addVisualFinalizer(label, () => finalizer),
    },
  }

  const program =
    options.features?.finalizers === true
      ? options.build({ ...context, ...finalizersContext } as any)
      : options.build(context as any)

  const hasDynamicCode = typeof codeDefinitionOptions === "function"
  const hasDynamicResultHighlight =
    typeof resultHighlightDefinition === "function"
  const hasDynamicStepHighlight = Object.values(selectorsByTarget).some(
    (selectorDefinition) => typeof selectorDefinition === "function",
  )

  const codeAtom =
    hasDynamicCode || hasDynamicResultHighlight || hasDynamicStepHighlight
      ? Atom.make((get) => {
          const controlValues: ControlValues = {
            get: (control) => get(control.atom),
          }

          return resolveSnippetDefinition({
            codeDefinition: codeDefinitionOptions,
            selectorsByTarget,
            resultHighlightDefinition,
            controlValues,
            exampleLabel: options.label,
          })
        })
      : Atom.make(
          resolveSnippetDefinition({
            codeDefinition: codeDefinitionOptions,
            selectorsByTarget,
            resultHighlightDefinition,
            controlValues: { get: (control) => control.initialValue },
            exampleLabel: options.label,
          }),
        )

  const definition: ExampleDefinition = {
    key: crypto.randomUUID(),
    title: options.label,
    subtitle: options.subtitle,
    description: options.description,
    steps,
    controls,
    program,
    code: { atom: codeAtom },
    features: {
      finalizers: options.features?.finalizers === true,
      timeline: options.features?.timeline === true,
    },
  }

  Equal.byReferenceUnsafe(definition)

  return definition
}
