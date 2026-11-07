import { Option, Record } from "effect"
import { Update } from "foldkit"
import { modifyFields } from "foldkit/struct"
import { HighlightSnippet, StartRun, StopRun } from "./command"
import {
  controlValueOf,
  findEntry,
  firstKeyOf,
  stepKeyOf,
  type CatalogEntry,
} from "./catalog"
import {
  advanceTimeline,
  canReset,
  emptyFinalizerPanel,
  idle,
  reduceFinalizerPanel,
  settle,
  start,
  withNotification,
  type RunState,
} from "./domain"
import { Message } from "./message"
import { initialModel, type Flags, type Model } from "./model"

type UpdateReturn = Update.Return<Model, Message>

const entryOf = (model: Model): Option.Option<CatalogEntry> =>
  findEntry(model.exampleKey)

/** The snippet on show, for the control values the learner chose. */
const snippetOf = (model: Model) =>
  Option.map(entryOf(model), ({ key, example }) =>
    example.code.resolve(model.controls[key] ?? {}),
  )

/** Tokens arrive late: until they match the snippet on show, the view prints plain source. */
const highlightCommands = (model: Model) =>
  Option.match(snippetOf(model), {
    onNone: () => [],
    onSome: ({ language, source }) =>
      Option.exists(model.maybeHighlighted, (shown) => shown.source === source)
        ? []
        : [HighlightSnippet({ language, source })],
  })

export const init = ({ defaultLines }: Flags): UpdateReturn => {
  const model = Option.match(snippetOf(initialModel), {
    onNone: () => initialModel,
    onSome: ({ source }) =>
      defaultLines.length === 0
        ? initialModel
        : {
            ...initialModel,
            maybeHighlighted: Option.some({ source, lines: defaultLines }),
          },
  })
  return { model, commands: highlightCommands(model) }
}

/** Every control of the example on show, with the learner's choice or the initial value. */
const controlValuesOf = (model: Model): Record<string, string> =>
  Option.match(entryOf(model), {
    onNone: () => ({}),
    onSome: ({ key, example }) =>
      Object.fromEntries(
        example.controls.map((control) => [
          control.id,
          controlValueOf(model.controls, key, control),
        ]),
      ),
  })

/**
 * Drops the run and everything it showed. A new `runId` makes the Messages of
 * the run that was there stale, and `StopRun` interrupts it.
 */
const reset = (model: Model): UpdateReturn => {
  const next = modifyFields(model, {
    runId: (runId) => runId + 1,
    run: () => idle,
    steps: () => ({}),
    clock: () => 0,
    timeline: () => [],
    finalizers: () => emptyFinalizerPanel,
  })
  return { model: next, commands: [StopRun(), ...highlightCommands(next)] }
}

const isCurrent = (model: Model, runId: number): boolean =>
  model.runId === runId

const isRunning = (model: Model): boolean => model.run._tag === "Running"

const startedAtOf = (state: RunState, fallback: number): number =>
  state._tag === "Running" ? state.startedAt : fallback

/** Steps that sit on the timeline move it on, while the run is going. */
const withTimeline = (
  model: Model,
  stepIndex: number,
  step: RunState,
): Model => {
  const addsToTimeline = Option.match(entryOf(model), {
    onNone: () => false,
    onSome: ({ example }) => example.steps[stepIndex]?.addToTimeline === true,
  })
  return addsToTimeline && model.run._tag === "Running"
    ? modifyFields(model, {
        timeline: (segments) =>
          advanceTimeline(segments, step, startedAtOf(model.run, 0)),
      })
    : model
}

const setStep = (model: Model, stepIndex: number, step: RunState): Model =>
  withTimeline(
    modifyFields(model, {
      steps: (steps) => ({
        ...steps,
        [stepKeyOf(model.exampleKey, stepIndex)]: step,
      }),
    }),
    stepIndex,
    step,
  )

const stepOf = (model: Model, stepIndex: number): RunState =>
  model.steps[stepKeyOf(model.exampleKey, stepIndex)] ?? idle

const hasTimeline = (model: Model): boolean =>
  Option.match(entryOf(model), {
    onNone: () => false,
    onSome: ({ example }) => example.features.timeline,
  })

export const update = (model: Model, message: Message): UpdateReturn =>
  Message.match<UpdateReturn>(message, {
    ClickedCategory: ({ category }) =>
      reset({
        ...model,
        category,
        exampleKey: firstKeyOf(category),
      }),
    ClickedExample: ({ key }) =>
      Option.match(findEntry(key), {
        onNone: () => ({ model }),
        onSome: ({ category }) =>
          reset({ ...model, category, exampleKey: key }),
      }),
    ClickedHeader: () => {
      if (isRunning(model)) {
        return { model, commands: [StopRun()] }
      }
      if (canReset(model.run)) {
        return reset(model)
      }
      return {
        model,
        commands: [
          StartRun({
            runId: model.runId,
            key: model.exampleKey,
            controls: controlValuesOf(model),
          }),
        ],
      }
    },
    ChangedControl: ({ controlId, value }) =>
      controlValuesOf(model)[controlId] === value
        ? { model }
        : reset(
            modifyFields(model, {
              controls: (controls) => ({
                ...controls,
                [model.exampleKey]: {
                  ...controls[model.exampleKey],
                  [controlId]: value,
                },
              }),
            }),
          ),
    StartedRun: ({ runId, at }) =>
      isCurrent(model, runId) && model.run._tag === "Idle"
        ? {
            model: modifyFields(model, {
              run: () => start(at),
              clock: () => (hasTimeline(model) ? at : 0),
              steps: () => ({}),
              timeline: () => [],
              finalizers: (panel) =>
                reduceFinalizerPanel(panel, { _tag: "RunStarted" }),
            }),
          }
        : { model },
    StartedStep: ({ runId, stepIndex, at }) =>
      isCurrent(model, runId) && isRunning(model)
        ? { model: setStep(model, stepIndex, start(at)) }
        : { model },
    EndedStep: ({ runId, stepIndex, at, outcome }) => {
      if (!isCurrent(model, runId)) {
        return { model }
      }
      const previous = stepOf(model, stepIndex)
      return {
        model: setStep(
          model,
          stepIndex,
          settle(previous, outcome, startedAtOf(previous, at), at),
        ),
      }
    },
    EndedRun: ({ runId, at, outcome }) =>
      isCurrent(model, runId) && model.run._tag === "Running"
        ? {
            model: modifyFields(model, {
              run: (run) => settle(run, outcome, startedAtOf(run, at), at),
              clock: () => 0,
            }),
          }
        : { model },
    ShowedNotification: ({
      runId,
      maybeStepIndex,
      message: text,
      durationMs,
      showOnHover,
    }) => {
      if (!isCurrent(model, runId)) {
        return { model }
      }
      const notification = {
        id: model.notificationCount,
        message: text,
        durationMs,
        showOnHover,
      }
      const counted = modifyFields(model, {
        notificationCount: (count) => count + 1,
      })
      return {
        model: Option.match(maybeStepIndex, {
          onNone: () =>
            modifyFields(counted, {
              run: (run) => withNotification(run, notification),
            }),
          onSome: (stepIndex) =>
            setStep(
              counted,
              stepIndex,
              withNotification(stepOf(counted, stepIndex), notification),
            ),
        }),
      }
    },
    ChangedFinalizers: ({ runId, event }) =>
      isCurrent(model, runId)
        ? {
            model: modifyFields(model, {
              finalizers: (panel) => reduceFinalizerPanel(panel, event),
            }),
          }
        : { model },
    TickedClock: ({ at }) =>
      isRunning(model)
        ? { model: modifyFields(model, { clock: () => at }) }
        : { model },
    ChangedContainerWidth: ({ width }) => ({
      model: modifyFields(model, { containerWidth: () => width }),
    }),
    HighlightedSnippet: ({ source, lines }) =>
      Option.exists(snippetOf(model), (shown) => shown.source === source)
        ? {
            model: modifyFields(model, {
              maybeHighlighted: () => Option.some({ source, lines }),
            }),
          }
        : { model },
    FailedHighlightSnippet: () => ({ model }),
    CompletedStartRun: () => ({ model }),
    CompletedStopRun: () => ({ model }),
    CompletedAnimateNode: () => ({ model }),
  })
