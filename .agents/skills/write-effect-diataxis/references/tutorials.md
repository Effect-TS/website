# Tutorials

Create a managed learning experience that leads a TypeScript developer from
familiar code to one robust, observable result through small steps.

Use
`apps/web/src/content/docs/v4/tutorials/handle-failures-without-guessing.mdx`
as the canonical tutorial implementation. Inspect only the relevant portions
when a concrete MDX pattern is needed.

## Contents

- [Establish the reader and outcome](#establish-the-reader-and-outcome)
- [Build a pain-first progression](#build-a-pain-first-progression)
- [Use a realistic controlled backend](#use-a-realistic-controlled-backend)
- [Keep the tutorial suite coherent](#keep-the-tutorial-suite-coherent)
- [Show where the tutorial fits](#show-where-the-tutorial-fits)
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
- Organize the entire tutorial around a common development pain. Treat the
  scenario, code, and Effect APIs as means for exploring Effect's solution, not
  as subjects for a feature tour.
- Name the tutorial after the positive outcome Effect provides. Do not name it
  after an API, feature, or scenario-specific task.
- Begin with exactly one `TutorialPainPoint`. Give it a short title that names
  the pain directly. In two short paragraphs, first describe the problem in
  ordinary TypeScript, then explain at a high level how Effect addresses it.
- Keep this terminology strict: the pain point is the problem; the tutorial
  title is the positive outcome.
- Introduce the concrete scenario immediately after the pain-point card. Keep
  scenario-specific actors and details outside the card.
- Use `## What you will build` to state the observable behavior of the finished
  backend. Use a compact table when several cases must be distinguished.
- Keep the tutorial learning-oriented and guided. Do not turn it into an
  explanation page, reference page, or menu of alternatives.

## Build a pain-first progression

1. Start with a small working backend in conventional TypeScript. Prefer one
   local HTTP server and one endpoint.
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

Keep the connection to the original pain visible at every step. Identify the
limitation being removed, show the capability that removes it, and demonstrate
the resulting behavior. Remove or relocate sections that mainly showcase an
API without advancing that journey.

Allow a tutorial to be long when necessary, but keep each step small. Avoid
`Effect.gen`, `Schedule`, Layers, and other new abstractions unless the current
problem cannot be taught clearly with fewer concepts. Mention and defer a
valuable capability when its setup would obscure the lesson.

## Use a realistic controlled backend

- Build a real local backend rather than isolated expressions.
- Represent external providers with deterministic Promise-based fixtures.
  Model latency, rejection, outage, recovery, and cancellation without public
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

## Keep the tutorial suite coherent

Before changing the order-processing scenario, domain terms, routes, or
architectural responsibilities, read both:

- `specs/tutorial-order-processing/CONTEXT.md`
- `specs/tutorial-order-processing/SUITE-CONTRACT.md`

Treat every tutorial as a small standalone projection of the same backend, not
as an independent reinvention. Align:

- domain terms, identifiers, and value ownership;
- routes and response statuses;
- HTTP, application, service, and infrastructure boundaries;
- service and error names;
- deterministic fixture behavior;
- cancellation and resource lifetimes.

A tutorial may use only the fields and services required for its lesson. The
reduced model must preserve the canonical meaning of every term it keeps. Keep
unrelated capabilities behind small fixtures instead of adding Effect APIs
merely for consistency.

Treat the separate reference application as the integration target. Tutorial
solutions should fit its contracts conceptually, but they need not reproduce
its full architecture or concatenate mechanically. When coherence conflicts
with pedagogical simplicity, preserve focus through a compatible fixture.

## Show where the tutorial fits

- Give every tutorial a `## Where this tutorial fits` section after
  `What you will build`.
- Link that section directly to
  `/docs/v4/tutorials/introduction#architecture`.
- Show only the architectural parts covered by the tutorial in a native
  Markdown table. Do not hide static architecture behind a component.
- Add a short Mermaid sequence diagram when sequence or concurrency helps
  explain the lesson.
- In the suite introduction, document stable components and responsibilities,
  then present the tutorial directory as one Markdown table with `Tutorial`,
  `Outcome`, and `Architecture focus` columns.

## Structure project setup consistently

- Assume Effect is already installed through the dedicated installation page.
  Do not repeat installation commands.
- Do not teach generic project initialization.
- Use `npm` inside standalone tutorial projects. Continue using `pnpm` and
  `vp run` for repository work.
- Put starter files and the local run loop in `## Project setup`.
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
- When offering local execution, use `node --watch server.ts`, explain
  `--watch`, and tell the reader to keep the process running.
- Say “open a second terminal pane” for verification commands. Do not tell the
  reader to restart a watched server between edits.

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
- Verify every claimed HTTP status, body, log line, attempt count, timeout, and
  cancellation result.
- Inspect inserted-line highlights, collapsed ranges, copy behavior, code-fence
  spacing, checkpoint flow, and Mermaid rendering locally.
