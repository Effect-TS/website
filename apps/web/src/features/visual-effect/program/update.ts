import { RadioGroup, Tabs } from "@foldkit/ui"
import { Array, Number, Option, Record, Schema } from "effect"
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
  type RunState,
} from "./domain"
import { Message } from "./message"
import { motionCommands } from "./motion-commands"
import { RunMessage, advance } from "./run-machine"
import { CategoryTabs, ControlGroup, ExampleTabs } from "./tabs"
import {
  Category,
  controlGroupId,
  controlGroupKey,
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
      Array.isReadonlyArrayEmpty(defaultLines)
        ? initialModel
        : modifyFields(initialModel, {
            maybeHighlighted: () =>
              Option.some({ source, lines: defaultLines }),
          }),
  })
  return { model, commands: highlightCommands(model) }
}

/** Every control of the example on show, with the learner's choice or the initial value. */
const controlValuesOf = (model: Model): Record<string, string> =>
  Option.match(entryOf(model), {
    onNone: () => ({}),
    onSome: ({ key, example }) =>
      Record.fromEntries(
        Array.map(example.controls, (control) => [
          control.id,
          controlValueOf(model.controls, key, control),
        ]),
      ),
  })

/**
 * Drops the run and everything it showed. A new `runId` makes the Messages of
 * the run that was there stale, and `StopRun` interrupts it.
 */
interface Shown {
  readonly maybeStepIndex: Option.Option<number>
  readonly message: string
  readonly durationMs: number
  readonly showOnHover: boolean
}

/** Gives the notification an id, puts it on its step or on the run, and starts its timer. */
const showNotification = (
  model: Model,
  { maybeStepIndex, message, durationMs, showOnHover }: Shown,
): UpdateReturn => {
  const notification = {
    id: model.notificationCount,
    message,
    durationMs,
    showOnHover,
  }
  const notified = RunMessage.Notified({ notification })
  const counted = modifyFields(model, {
    notificationCount: Number.increment,
  })
  return {
    commands: [WaitNotification({ id: notification.id, durationMs })],
    model: Option.match(maybeStepIndex, {
      onNone: () =>
        modifyFields(counted, { run: (run) => advance(run, notified) }),
      onSome: (stepIndex) => advanceStep(counted, stepIndex, notified),
    }),
  }
}

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
    isHighlightVisible: () => false,
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

const stepOf = (model: Model, stepIndex: number): RunState =>
  model.steps[stepKeyOf(model.exampleKey, stepIndex)] ?? idle

/** Tells a step what happened. The run machine decides what the step becomes. */
const advanceStep = (
  model: Model,
  stepIndex: number,
  message: RunMessage,
): Model => {
  const step = advance(stepOf(model, stepIndex), message)
  return withTimeline(
    modifyFields(model, {
      steps: Record.set(stepKeyOf(model.exampleKey, stepIndex), step),
    }),
    stepIndex,
    step,
  )
}

const hasTimeline = (model: Model): boolean =>
  Option.match(entryOf(model), {
    onNone: () => false,
    onSome: ({ example }) => example.features.timeline,
  })

const selectCategory = (
  model: Model,
  category: Model["category"],
): UpdateReturn =>
  reset(
    modifyFields(model, {
      category: () => category,
      exampleKey: () => firstKeyOf(category),
    }),
  )

const selectExample = (model: Model, key: string): UpdateReturn =>
  Option.match(findEntry(key), {
    onNone: () => ({ model }),
    onSome: ({ category }) =>
      reset(
        modifyFields(model, {
          category: () => category,
          exampleKey: () => key,
        }),
      ),
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

const foldControlGroup = Update.foldChildAt({
  update: ControlGroup.update,
  readAt: (model: Model, controlId: string) =>
    Option.some(
      model.controlGroups[controlGroupKey(model.exampleKey, controlId)] ??
        RadioGroup.init({ id: controlGroupId(model.exampleKey, controlId) }),
    ),
  writeAt: (model, controlId, controlGroups) =>
    modifyFields(model, {
      controlGroups: (all) => ({
        ...all,
        [controlGroupKey(model.exampleKey, controlId)]: controlGroups,
      }),
    }),
  toParentMessage: (controlId, message) =>
    Message.GotControlGroupMessage({ controlId, message }),
  foldOutMessage: (controlId) =>
    RadioGroup.OutMessage.match<Step>({
      Selected:
        ({ value }) =>
        (model) =>
          changeControl(model, controlId, value),
    }),
})

const updateModel = (model: Model, message: Message): UpdateReturn =>
  Message.match<UpdateReturn>(message, {
    ClickedCategory: ({ category }) => selectCategory(model, category),
    ClickedExample: ({ key }) => selectExample(model, key),
    GotCategoryTabsMessage: ({ message: tabsMessage }) =>
      foldCategoryTabs(model, tabsMessage),
    GotExampleTabsMessage: ({ message: tabsMessage }) =>
      foldExampleTabs(model, tabsMessage),
    GotControlGroupMessage: ({ controlId, message: tabsMessage }) =>
      foldControlGroup(model, controlId, tabsMessage),
    EnteredHeader: () => ({
      model: modifyFields(model, { headerPointer: () => "Over" }),
    }),
    LeftHeader: () => ({
      model: modifyFields(model, { headerPointer: () => "Away" }),
    }),
    PressedHeader: () => ({
      model: modifyFields(model, { headerPointer: () => "Pressed" }),
    }),
    ReleasedHeader: () => ({
      model: modifyFields(model, { headerPointer: () => "Over" }),
    }),
    UpdatedStripFade: ({ strip, canScrollRight }) => ({
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
      const used = modifyFields(model, { hasInteracted: () => true })
      if (isRunning(used)) {
        return { model: used, commands: [StopRun()] }
      }
      if (canReset(used.run)) {
        return reset(used)
      }
      return {
        model: used,
        commands: [
          StartRun({
            runId: used.runId,
            key: used.exampleKey,
            controls: controlValuesOf(used),
          }),
        ],
      }
    },
    StartedRun: ({ runId, at }) =>
      isCurrent(model, runId) && model.run._tag === "Idle"
        ? {
            model: modifyFields(model, {
              run: (run) => advance(run, RunMessage.Started({ at })),
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
        ? { model: advanceStep(model, stepIndex, RunMessage.Started({ at })) }
        : { model },
    EndedStep: ({ runId, stepIndex, at, outcome }) => {
      if (!isCurrent(model, runId)) {
        return { model }
      }
      return {
        model: advanceStep(model, stepIndex, RunMessage.Ended({ at, outcome })),
      }
    },
    EndedRun: ({ runId, at, outcome }) =>
      isCurrent(model, runId) && model.run._tag === "Running"
        ? {
            model: modifyFields(model, {
              run: (run) => advance(run, RunMessage.Ended({ at, outcome })),
              clock: () => 0,
            }),
          }
        : { model },
    ShowedNotification: ({ runId, ...shown }) =>
      isCurrent(model, runId) ? showNotification(model, shown) : { model },
    UpdatedFinalizers: ({ runId, event }) =>
      isCurrent(model, runId)
        ? {
            model: modifyFields(model, {
              finalizers: (panel) => reduceFinalizerPanel(panel, event),
            }),
          }
        : { model },
    TickedClock: ({ deltaTime }) =>
      isRunning(model)
        ? { model: modifyFields(model, { clock: Number.sum(deltaTime) }) }
        : { model },
    UpdatedContainerWidth: ({ width }) => ({
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
              isHighlightVisible: () => false,
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
              maybeHighlightRect: (last) =>
                Option.orElse(maybeRect, () => last),
              isHighlightVisible: () => Option.isSome(maybeRect),
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
    // NOTE: A failed highlight leaves the plain source on screen, which is the fallback.
    FailedHighlightSnippet: () => ({ model }),
    CompletedStartRun: () => ({ model }),
    CompletedStopRun: () => ({ model }),
    CompletedAnimateNode: () => ({ model }),
    CompletedChangeNode: () => ({ model }),
    CompletedAnimateHeader: () => ({ model }),
    CompletedChangeHeader: () => ({ model }),
    CompletedShakeBubble: () => ({ model }),
    CompletedChangeBubble: () => ({ model }),
    CompletedAnimateFinalizerCard: () => ({ model }),
    CompletedChangeCard: () => ({ model }),
    CompletedAnimateHighlight: () => ({ model }),
    CompletedChangeHighlight: () => ({ model }),
    CompletedPulseChevrons: () => ({ model }),
  })

/** Runs the update, then adds the Commands that move the parts of the screen the Model change affects. */
export const update = (model: Model, message: Message): UpdateReturn => {
  const result = updateModel(model, message)
  const moves = motionCommands(model, result.model)
  return Array.isReadonlyArrayEmpty(moves)
    ? result
    : { model: result.model, commands: [...(result.commands ?? []), ...moves] }
}
