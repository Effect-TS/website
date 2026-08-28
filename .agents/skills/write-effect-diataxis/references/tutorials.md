# Tutorials

Create a managed learning experience that leads a TypeScript developer from
familiar code to one robust, observable result through small steps.

Use
`apps/web/src/content/docs/v4/tutorials/handle-failures-without-guessing.mdx`
as the canonical tutorial implementation. Inspect only the relevant portions
when a concrete MDX pattern is needed.

## Contents

- [Establish the reader and outcome](#establish-the-reader-and-outcome)
- [Build a strength-led progression](#build-a-strength-led-progression)
- [Use the smallest executable scenario](#use-the-smallest-executable-scenario)
- [Prefer coherent scenarios](#prefer-coherent-scenarios)
- [Keep editorial reuse invisible](#keep-editorial-reuse-invisible)
- [Structure project setup consistently](#structure-project-setup-consistently)
- [Present complete project states](#present-complete-project-states)
- [Add checkpoints](#add-checkpoints)
- [Validate the tutorial path](#validate-the-tutorial-path)

## Establish the reader and outcome

- Assume the reader knows TypeScript, Promises, `async`/`await`, HTTP, and
  ordinary backend development.
- Assume no knowledge of Effect, generators, functional pipelines, fibers,
  error channels, interruption, defects, schedules, layers, or services.
- Treat every tutorial as the reader's first encounter with Effect. Do not rely
  on another tutorial having introduced an API, term, or mental model.
- Organize the entire tutorial around a recognizable Effect strength. Treat the
  scenario, code, and Effect APIs as means for experiencing that strength, not
  as subjects for a feature tour.
- Give an introductory tutorial one pain point and one primary Effect strength.
  Remove secondary policies, failure modes, infrastructure, and API tours that
  do not make that specific strength easier to experience.
- Keep a small concept budget. Prefer no more than one new Effect concept in a
  step and introduce only the APIs needed to reach the promised outcome.
- Name the tutorial after the positive outcome Effect provides. Do not name it
  after an API, feature, or scenario-specific task.
- Begin with exactly one `EffectStrength`. Give it a short, positive title
  that names the capability Effect provides. In the card body, state the
  ordinary limitation first, then show how Effect removes it and what that
  makes possible for the reader. Keep the title strength-led so the card does
  not read as a complaint about the baseline.
- Keep this terminology strict: the strength is the capability; the tutorial
  title is the positive outcome the reader will learn to achieve.
- Introduce the concrete scenario immediately after the strength card. Keep
  scenario-specific actors and details outside the card.
- Use `## What you will build` to state the observable behavior of the finished
  program. Use a compact table when several cases must be distinguished.
- Keep the tutorial learning-oriented and guided. Do not turn it into an
  explanation page, reference page, or menu of alternatives.

## Build a strength-led progression

1. Start with a small working program in conventional TypeScript. Make the
   baseline realistic and complete: use the documented APIs, error types, and
   ordinary handling available to the reader.
2. Keep the starter familiar and short. Inline one-use types and helpers when a
   name adds ceremony rather than clarity.
3. Immediately show what can go wrong.
4. Introduce one limitation at a time and follow it with the smallest Effect
   change that addresses it.
5. Apply `write-effect-docs` API-explanation rules to every new Effect API or
   concept at the point where it first matters.
6. State the expected observable result and end the transition with a
   checkpoint.
7. Preserve one linear project state. Every code block and checkpoint must
   describe the same current version of the project.

Build the Effect solution through two to four small transformations. Do not
jump directly from the ordinary baseline to the final implementation merely to
shorten the page. Reduce incidental code and secondary behavior instead.

Introduce the numbered progression with a specific H2 that names the
transformation the reader is about to follow. Keep its position and heading
level consistent across tutorials, but do not reuse a generic title such as
“The solution, step by step.”

Keep the connection to the Effect strength visible at every step. Identify the
ordinary limitation being removed, show the capability that removes it, and
demonstrate the resulting behavior. Remove or relocate sections that mainly
showcase an API without advancing that journey.

Never weaken the baseline to make Effect look better. Before presenting a
limitation, ask whether ordinary TypeScript could address it with the
information already available. If so, show that reasonable solution and teach
the actual remaining advantage of Effect, such as making the contract visible
in the type or expressing policies without manual coordination.

Allow a tutorial to be long when necessary, but keep each step small. Avoid
`Effect.gen`, `Schedule`, Layers, and other new abstractions unless the current
problem cannot be taught clearly with fewer concepts. Mention and defer a
valuable capability when its setup would obscure the lesson.

## Use the smallest executable scenario

- Prefer one small `main.ts` program for an introductory tutorial. Use an HTTP
  backend only when the request boundary is necessary to experience the pain
  point or the Effect strength.
- Keep the scenario realistic enough to make the consequence observable, but
  remove transport, parsing, configuration, and domain detail that the lesson
  does not use.
- Represent external providers with deterministic local functions or fixtures.
  Model only the behavior required by the current lesson, without public
  internet access, credentials, Docker, or another process.
- Keep fixture setup out of the lesson. Supply it ready-made and label it as
  tutorial fixture code.
- Show the external SDK contract, documented errors, inputs, outputs, and
  deterministic behavior before the tutorial first uses it. Do not collapse
  this required context.
- After a fixture has been presented once in full, collapse only plumbing the
  reader no longer needs to inspect.
- Put a fixture shared by multiple tutorials in a `.ts` asset rather than an
  internal MDX page.
- Give fixture inputs stable meanings across the suite and explain when state
  resets affect verification.

## Prefer coherent scenarios

Treat the order-processing scenario as the preferred editorial baseline, not
as a required premise for every tutorial.

When a tutorial naturally fits order processing, read both before choosing its
domain terms, routes, models, or architectural responsibilities:

- `specs/tutorial-order-processing/CONTEXT.md`
- `specs/tutorial-order-processing/SUITE-CONTRACT.md`

Reuse the established names, models, boundaries, error meanings, fixture
behavior, cancellation rules, and resource lifetimes when they support the
learning outcome without distortion. A reduced example may omit anything the
lesson does not need, but every retained term must preserve its canonical
meaning.

Use a different scenario when it makes the target behavior clearer, more
realistic, or easier to experience. Do not expand or bend the order-processing
architecture merely to accommodate a new topic. Scenario consistency serves
the lesson; it never outranks pedagogical focus.

Treat any separate reference application as an integration target only for
tutorials that reuse its domain. Their solutions should fit its contracts
conceptually, but they need not reproduce its full architecture or concatenate
mechanically.

## Keep editorial reuse invisible

- Make every tutorial understandable in isolation, even when its vocabulary
  and fixtures reuse the editorial baseline.
- Introduce the concrete scenario locally and include only the context the
  current lesson requires.
- Do not tell readers that tutorials project one shared system, require a suite
  introduction, or link to an internal architecture map.
- Do not add a mandatory `Where this tutorial fits` section or expose the
  editorial contract in public documentation.
- Add a short local Mermaid diagram when sequence or concurrency materially
  clarifies the current tutorial.
- Link to another tutorial only when it is a useful next learning step, not to
  explain the current tutorial's place in a shared architecture.

## Structure project setup consistently

- Assume Effect is already installed through the dedicated installation page.
  Do not repeat installation commands.
- Do not teach generic project initialization.
- Use `npm` inside standalone tutorial projects. Continue using `pnpm` and
  `vp run` for repository work.
- Put starter files in `## Project setup`. Include a local run loop only when
  it has non-obvious arguments, options, inputs, or multiple processes.
- Begin with the same `File` / `Role` table. State which files change and which
  remain fixed in the table rather than repeating it in prose.
- Describe fixed fixtures next, then present the watched-server command after
  any fixture code the reader must copy.
- Mark a fixed TypeScript fixture in its `Role` cell and with one brief comment
  at the top of its first complete code block.
- Keep Node.js versions and type-stripping requirements in the installation
  page.
- Make the tutorial understandable by reading alone. Creating files, starting
  the server, and sending requests must not be prerequisites for understanding.
- Do not describe setup, commands, sections, or verification as “optional.”
- Do not teach the reader how to run a one-file `main.ts` program. When the
  tutorial genuinely needs a server, give only the command and details needed
  to coordinate the example.
- For a running server, say “open a second terminal pane” for verification
  commands. Do not tell the reader to restart a watched server between edits.

## Present complete project states

Show the complete current file for every human-facing code modification. A
copied block must produce the working file for that checkpoint.

Use Expressive Code's native inserted-line highlighting:

````md
```ts title="server.ts" ins={CHANGED_RANGES}
// complete current file
```
````

- Show the final state without `+` or `-` diff prefixes.
- Highlight new or changed lines with `ins={...}`.
- Explain removed code in the prose before the block.
- Keep changed code visible.
- Never collapse code the first time it appears.
- Prefer extracting stable plumbing or fixtures before collapsing learning
  code. Collapse unchanged ranges only when the complete current file would
  obscure the change.
- Recalculate collapse ranges after every edit.
- Do not use `useDiffSyntax`, `copyFinal`, formatter-ignore comments, custom
  copy plugins, or coding-agent prompts.
- Verify that the ordinary copy button produces the complete current file.

## Add checkpoints

Explain near the beginning that a checkpoint is a short summary of the
behavior reached at that point.

End every meaningful state transition with one outcome-oriented checkpoint:

```mdx
<TutorialCheckpoint number={N} total={TOTAL} title="Observable outcome">
  Summarize the verified state.
</TutorialCheckpoint>
```

- Keep a checkpoint focused on behavior produced by the current code.
- Do not add dashed separators or decorative space inside it.
- Do not add `AgentPrompt`, coding-agent buttons, hidden prompts, or an
  AI-assisted path.
- A tutorial may discuss AI-generated code when that is the subject, but its
  instructions must remain deterministic and reader-driven.

## Validate the tutorial path

In addition to the general documentation checks:

- Materialize the tutorial project in a clean scratch directory.
- Exercise every project state and checkpoint in order.
- Confirm that every complete code snapshot type-checks and runs after copying.
- Keep stateful tutorial code fences out of runtime doctests and validate the
  materialized project separately.
- Run a runtime doctest only when the selected page or directory contains a
  fence marked with `import.meta.vitest`. From the repository root, use
  `pnpm doctest:file -- <page-or-directory>`; both exact file paths and
  directory filters are supported. If the selection has no marked fences,
  Vitest reports that it found no test files; this does not validate or reject
  the tutorial snapshots.
- Verify every claimed HTTP status, body, log line, attempt count, timeout, and
  cancellation result.
- Inspect inserted-line highlights, collapsed ranges, copy behavior, code-fence
  spacing, checkpoint flow, and Mermaid rendering locally.
