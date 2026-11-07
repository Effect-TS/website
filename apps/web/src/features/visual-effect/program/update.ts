import { Tabs } from "@foldkit/ui"
import { Option, Record, Schema } from "effect"
import { Update } from "foldkit"
import { modifyFields } from "foldkit/struct"
import {
  HighlightSnippet,
  MeasureHighlight,
  StartRun,
  StopRun,
  WaitHighlightDelay,
  WaitNotification,
} from "./command"
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
  type NodeTarget,
  reduceFinalizerPanel,
  settle,
  start,
  withNotification,
  type RunState,
} from "./domain"
import { Message } from "./message"
import { CategoryTabs, ControlTabs, ExampleTabs } from "./tabs"
import {
  Category,
  controlTabsId,
  controlTabsKey,
  initialModel,
  type Flags,
  type Model,
} from "./model"
import {
  snippetResultTargetKey,
  toStepSnippetTargetKey,
} from "../model/snippet-highlights"

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

/** The code a node stands for, as ranges of the snippet on show. */
const rangesOf = (model: Model, target: NodeTarget) =>
  Option.match(entryOf(model), {
    onNone: () => [],
    onSome: ({ key, example }) => {
      const snippet = example.code.resolve(model.controls[key] ?? {})
      const targetKey =
        target._tag === "Result"
          ? Option.some(snippetResultTargetKey)
          : Option.map(
              Option.fromNullishOr(example.steps[target.index]),
              (step) => toStepSnippetTargetKey(step.id),
            )
      return Option.match(targetKey, {
        onNone: () => [],
        onSome: (found) => snippet.highlightsByTarget[found] ?? [],
      })
    },
  })

const measureCommands = (model: Model) =>
  Option.match(model.maybeHighlightTarget, {
    onNone: () => [],
    onSome: (target) => [MeasureHighlight({ ranges: rangesOf(model, target) })],
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
    expiredNotifications: () => [],
    maybeHighlightTarget: () => Option.none(),
    maybeHighlightRect: () => Option.none(),
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

const selectCategory = (
  model: Model,
  category: Model["category"],
): UpdateReturn =>
  reset({ ...model, category, exampleKey: firstKeyOf(category) })

const selectExample = (model: Model, key: string): UpdateReturn =>
  Option.match(findEntry(key), {
    onNone: () => ({ model }),
    onSome: ({ category }) => reset({ ...model, category, exampleKey: key }),
  })

type Step = Update.Step<Model, Message>

const isCategory = Schema.is(Category)

const foldCategoryTabs = Update.foldChild({
  update: CategoryTabs.update,
  read: (model: Model) => Option.some(model.categoryTabs),
  write: (model, categoryTabs) =>
    modifyFields(model, { categoryTabs: () => categoryTabs }),
  toParentMessage: (message) => Message.GotCategoryTabsMessage({ message }),
  foldOutMessage: Tabs.OutMessage.match<Step>({
    Selected:
      ({ value }) =>
      (model) =>
        isCategory(value) ? selectCategory(model, value) : { model },
  }),
})

const foldExampleTabs = Update.foldChild({
  update: ExampleTabs.update,
  read: (model: Model) => Option.some(model.exampleTabs),
  write: (model, exampleTabs) =>
    modifyFields(model, { exampleTabs: () => exampleTabs }),
  toParentMessage: (message) => Message.GotExampleTabsMessage({ message }),
  foldOutMessage: Tabs.OutMessage.match<Step>({
    Selected:
      ({ value }) =>
      (model) =>
        selectExample(model, value),
  }),
})

const changeControl = (
  model: Model,
  controlId: string,
  value: string,
): UpdateReturn =>
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
      )

const foldControlTabs = Update.foldChildAt({
  update: ControlTabs.update,
  readAt: (model: Model, controlId: string) =>
    Option.some(
      model.controlTabs[controlTabsKey(model.exampleKey, controlId)] ??
        Tabs.init({ id: controlTabsId(model.exampleKey, controlId) }),
    ),
  writeAt: (model, controlId, controlTabs) =>
    modifyFields(model, {
      controlTabs: (all) => ({
        ...all,
        [controlTabsKey(model.exampleKey, controlId)]: controlTabs,
      }),
    }),
  toParentMessage: (controlId, message) =>
    Message.GotControlTabsMessage({ controlId, message }),
  foldOutMessage: (controlId) =>
    Tabs.OutMessage.match<Step>({
      Selected:
        ({ value }) =>
        (model) =>
          changeControl(model, controlId, value),
    }),
})

export const update = (model: Model, message: Message): UpdateReturn =>
  Message.match<UpdateReturn>(message, {
    ClickedCategory: ({ category }) => selectCategory(model, category),
    ClickedExample: ({ key }) => selectExample(model, key),
    GotCategoryTabsMessage: ({ message: tabsMessage }) =>
      foldCategoryTabs(model, tabsMessage),
    GotExampleTabsMessage: ({ message: tabsMessage }) =>
      foldExampleTabs(model, tabsMessage),
    GotControlTabsMessage: ({ controlId, message: tabsMessage }) =>
      foldControlTabs(model, controlId, tabsMessage),
    ChangedStripFade: ({ strip, canScrollRight }) => ({
      model:
        strip === "Categories"
          ? modifyFields(model, {
              categoriesCanScrollRight: () => canScrollRight,
            })
          : modifyFields(model, {
              examplesCanScrollRight: () => canScrollRight,
            }),
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
      changeControl(model, controlId, value),
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
        commands: [WaitNotification({ id: notification.id, durationMs })],
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
    HoveredNode: ({ target }) => {
      const next = modifyFields(model, {
        maybeHovered: () => Option.some(target),
        maybeHighlightTarget: () => Option.some(target),
        hoverToken: (token) => token + 1,
      })
      return { model: next, commands: measureCommands(next) }
    },
    LeftNode: () => {
      const next = modifyFields(model, {
        maybeHovered: () => Option.none(),
        hoverToken: (token) => token + 1,
      })
      return {
        model: next,
        commands: [WaitHighlightDelay({ token: next.hoverToken })],
      }
    },
    ElapsedHighlightDelay: ({ token }) =>
      token === model.hoverToken
        ? {
            model: modifyFields(model, {
              maybeHighlightTarget: () => Option.none(),
              maybeHighlightRect: () => Option.none(),
            }),
          }
        : { model },
    ExpiredNotification: ({ id }) => ({
      model: modifyFields(model, {
        expiredNotifications: (expired) => [...expired, id],
      }),
    }),
    MeasuredHighlight: ({ maybeRect }) =>
      Option.isSome(model.maybeHighlightTarget)
        ? {
            model: modifyFields(model, {
              maybeHighlightRect: () => maybeRect,
            }),
          }
        : { model },
    HighlightedSnippet: ({ source, lines }) => {
      if (
        !Option.exists(snippetOf(model), (shown) => shown.source === source)
      ) {
        return { model }
      }
      const next = modifyFields(model, {
        maybeHighlighted: () => Option.some({ source, lines }),
      })
      return { model: next, commands: measureCommands(next) }
    },
    FailedHighlightSnippet: () => ({ model }),
    CompletedStartRun: () => ({ model }),
    CompletedStopRun: () => ({ model }),
    CompletedAnimateNode: () => ({ model }),
  })
