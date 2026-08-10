---
name: write-effect-tutorials
description: Create and review beginner-friendly Effect tutorials for this website, especially MDX under apps/web/src/content/docs/v4/tutorials. Use when drafting, restructuring, integrating, or auditing a tutorial; designing its progressive backend scenario and controlled fixtures; adding checkpoints; presenting complete files with native Expressive Code highlights; or checking that every Effect API and concept is explained to a TypeScript developer with no prior Effect knowledge.
---

# Write Effect Tutorials

Create Diataxis-style tutorials that lead a TypeScript backend developer from familiar code to one robust, observable result through small verified steps.

Use `apps/web/src/content/docs/v4/tutorials/make-failures-explicit.mdx` as the canonical implementation reference. Inspect only the relevant portions when a concrete MDX or prompt pattern is needed.

## Establish the reader and outcome

- Treat the pain point as the organizing principle of the entire tutorial. The scenario, code, Effect APIs, and observable results are means for exploring how Effect addresses that pain, not subjects to emphasize for their own sake. Reject feature tours and API-first progressions.
- Assume the reader knows TypeScript, Promises, `async`/`await`, HTTP, and ordinary backend development.
- Assume no knowledge of Effect, generators, functional pipelines, fibers, error channels, interruption, defects, schedules, layers, or services.
- Name the tutorial after the positive outcome Effect provides for a general pain recognizable to backend developers. Do not name it after an API, feature, or scenario-specific task.
- Begin every tutorial with exactly one `TutorialPainPoint`. Give the card a short title that names the pain directly. In two short paragraphs, first describe how the problem appears in ordinary TypeScript and then explain how Effect addresses it. Use only language a TypeScript developer who has never used Effect already understands; introduce Effect-specific APIs and concepts later. Replace equivalent introductory prose instead of repeating it outside the card.
- Introduce the concrete scenario immediately after `TutorialPainPoint`. Keep scenario-specific actors and details outside the card, then explain the scenario before asking the reader to act.
- State what the reader will learn and the observable behavior of the finished backend. Use a compact table when several cases must be distinguished.
- Keep the tutorial learning-oriented and guided. Do not turn it into explanation, reference, or a menu of alternatives.

## Design a pain-first progression

1. Start with a small, working backend written in conventional TypeScript. Prefer one local HTTP server and one endpoint.
2. Keep the starter familiar and short. Inline one-use types and helpers when naming them adds ceremony rather than clarity.
3. Immediately demonstrate what can go wrong with the starter.
4. Introduce one limitation at a time. Follow each limitation with the smallest Effect change that addresses it.
5. Explain the new API or concept in terms of the exact code just added.
6. Describe the expected observable result and end with a checkpoint. Local execution may be available without being required to understand the result.
7. Preserve a single linear state progression. Every code block and checkpoint must correspond to the same current project state.

At every step, keep the connection to the original pain visible: identify the
specific limitation being removed, show the Effect capability that removes it,
and demonstrate the resulting behavior. If a section mainly showcases an API
without advancing that journey, remove it or move it to explanatory or
reference documentation.

Allow the tutorial to be long when the journey requires it, but keep each step small. Do not introduce an API merely for completeness. Avoid `Effect.gen`, `Schedule`, layers, and other new abstractions unless the current problem cannot be taught clearly with fewer concepts.

When a valuable capability would require enough setup to obscure the lesson, mention it briefly and defer its implementation to a later tutorial. Do not burden the reader merely to make the example comprehensive.

## Use a realistic controlled backend

- Build a real local backend rather than isolated toy expressions.
- Represent external providers with deterministic Promise-based fixtures. Model useful latency, rejection, outage, recovery, and cancellation behavior without public internet access, credentials, Docker, or a second process.
- Keep fixture setup out of the lesson. Supply it ready-made and label it as tutorial fixture code.
- Keep the external SDK contract, documented errors, inputs, outputs, and deterministic behavior visible before the tutorial first uses them. Do not hide that required context inside a `details` element.
- After a file has been presented once in full, collapse only fixture plumbing that the reader does not need to understand, such as an HTTP adapter's internal implementation.
- Put a fixture shared by several tutorials in a `.ts` asset rather than publishing an internal MDX documentation page.
- Give fixture inputs stable meanings throughout the tutorial suite.
- Make state reset behavior explicit when it affects verification.

## Explain Effect from zero

Introduce the mental model at the first Effect value:

- An Effect is a value that describes a computation.
- Creating or transforming it does not run the computation or perform side effects.
- A runner such as `Effect.runPromise` actually runs it at an application boundary.
- The success type describes the produced value. The error type describes expected failures and is called the error channel.
- Interruption is cancellation of a running computation.
- A defect is an unexpected bug, distinct from an expected failure.

Never leave abstract placeholders such as `Effect<Success, Error>` disconnected from the code. Show the concrete inferred type of the value the reader just created, map each type argument to a concrete outcome, and state when the type display is explanatory rather than code to paste.

Explain every Effect-specific API and term at its first use. When these APIs appear, cover at least the following points:

- `Effect.tryPromise`: adapt a Promise-producing function; resolved values become successes, rejections enter the error channel, the function remains lazy, and the provided `AbortSignal` reaches the Promise API.
- `Effect.runPromise`: run the computation, return a Promise, resolve with the success value, reject when the Effect does not succeed, and optionally observe an external `AbortSignal`.
- `pipe`: compose descriptions from top to bottom without running them.
- `Effect.map`: transform the success channel with a function and leave the
  error channel unchanged. Keep the general behavior separate from the
  concrete result type chosen by the tutorial.
- `Cause.UnknownError`: identify it as Effect's built-in wrapper for an unclassified rejection and explain preservation of the original `cause`.
- `Data.TaggedError`: explain the generated typed error class, the tag string, the constructor fields declared by the type argument, and the resulting instance.
- `_tag`: identify it as the ubiquitous Effect convention for discriminating variants.
- `Effect.catchTags`: match tagged values in the error channel, require handlers that return Effects, and remove a handled error when the handler succeeds.
- `Effect.sync`: defer synchronous work; its return value becomes the success value.
- `Effect.succeed`: describe success with an already available value.
- `Effect.fail`: describe a failed computation; creating it does not throw.
- `Effect.retry`: rerun the preceding computation after selected failures; explain the predicate and the total attempt bound concretely.
- `Effect.timeoutOrElse`: bound the preceding computation, interrupt it, and run the fallback on timeout.
- `Effect.fn`: use its named form for functions whose execution should be traced. Explain that calling the function returns an Effect, the generator body sequences Effect operations, and the named form creates and closes a span when that Effect runs. Reserve `Effect.withSpan` for an existing Effect or an anonymous block that does not merit a named function.

Present each concrete API explanation in the surrounding prose at its first meaningful use. Keep the explanation close to the code and focused on behavior the reader can connect to that step. Do not require a separate API card when prose communicates the concept more naturally.

- Link the API name inline to its generated reference declaration when one is available.
- Write the reference route explicitly so it remains useful in the raw `.md` representation.
- Verify ambiguous anchors against the generated reference. A symbol exported as both a type and a value may use suffixes such as `-interface` or `-variable`.

Inventory the APIs actually used instead of relying on memory:

```sh
rg -o '\b(?:Effect|Data|Cause)\.[A-Za-z0-9_]+' <tutorial.mdx> | sort -u
```

For each result, verify that a reader encounters a concrete explanation close to the first meaningful use. Ordinary backend terms such as “happy path” and “boundary” do not require Effect-specific definitions. Replace vague Effect jargon such as “bring the Promise into Effect” or “start the Effect” with observable behavior.

Verify API names and semantics against the installed v4 package under `apps/web/node_modules/effect`. Use only stable exports. Do not teach `effect/unstable`, historical APIs, migration material, or comparisons with other documentation versions.

## Write the human path

- Use frontmatter for the page title and do not repeat it as an H1 in the MDX body.
- Use site routes for internal links and never include a `.mdx` extension.
- Preserve the tutorial collection's existing sidebar placement and ordering conventions when adding or renaming a page.
- Use `npm` inside standalone tutorial projects unless the tutorial has a concrete reason to require another package manager. Continue using `pnpm` and `vp run` for work on this repository.
- Do not teach generic project initialization. Assume the reader can create and configure a normal TypeScript project; include setup only when it is specific to the tutorial's subject.
- Put tutorial-specific starter files and the reusable command that establishes the local run loop in a `## Project setup` section. Name every file, state its role, and make clear which file or files change during the tutorial and which remain fixed. Keep requests and checks that demonstrate a particular step beside that step.
- State a minimum runtime version only when a command or language feature requires it. Do not repeat environment trivia such as “checked on macOS” or pin an arbitrary current version.
- Make the tutorial understandable as a reading path. Creating files, starting the server, and sending requests must not be prerequisites for following the lesson.
- Treat that flexibility as an editorial rule. Do not tell the reader that setup, commands, sections, or verification are “optional,” and do not put “optional” in their titles.
- When offering local execution, start the server with `node --watch server.ts`, explicitly explain `--watch`, and tell the reader to keep it running.
- Say “open a second terminal pane” for verification commands.
- Do not tell the reader to stop and restart a watched server between edits.
- Add descriptive subsection headings when they help the reader orient themselves. Avoid generic headings that add no information.
- Prefer lists when presenting multiple parallel roles, cases, steps, or outcomes. Do not bury an enumeration in a long sentence.
- Use direct, literal language. Avoid colloquialisms, idioms, and unexplained jargon, even when they are common among fluent English speakers.
- Avoid adjacent code fences that render as one block. Separate them with a short transition and give each fence a meaningful `title`.
- Never use the em dash character `—` in documentation copy.

## Present code for copying

Show the complete current file for every human-facing code modification. A copied block must produce the working file for that checkpoint; do not make the reader reconstruct a file from fragments or manually apply a textual patch.

Use Expressive Code's native inserted-line highlighting:

````md
```ts title="server.ts" ins={CHANGED_RANGES}
// complete current file
```
````

- Show the final state of the file without `+` or `-` diff prefixes.
- Highlight new or changed lines with native `ins={...}` metadata.
- Explain removed code in the prose immediately before the block instead of retaining it in the copied file.
- Keep changed code visible.
- Never collapse code the first time it is introduced. Present the complete file or block once before collapsing any of its ranges in later snapshots.
- Prefer extracting stable plumbing or fixtures before collapsing the learning code. Collapse unchanged ranges only when the complete current file would otherwise obscure the change.
- After their first complete presentation, collapse unchanged ranges in long fixtures when that keeps later snapshots focused.
- Use the short filename, such as `server.ts`, as the title rather than a long path.
- Add code comments sparingly. Use them only to explain a non-obvious decision, boundary, or behavior; do not narrate ordinary syntax or repeat the surrounding prose.
- Do not use `useDiffSyntax`, `copyFinal`, formatter-ignore comments, or a custom copy plugin for tutorial code.
- Verify that the ordinary copy button produces the complete current file.
- Recalculate collapse ranges after every code edit and inspect the rendered result.

## Add checkpoints

Explain near the beginning that a checkpoint is a short summary of the behavior reached at that point.

End every meaningful state transition with one `TutorialCheckpoint`. Give it an outcome-oriented title and summarize what now works. Do not add internal dashed separators or decorative space that does not communicate state.

Keep checkpoints focused on the behavior produced by the current code:

```mdx
<TutorialCheckpoint number={N} total={TOTAL} title="Observable outcome">
  Summarize the verified state.
</TutorialCheckpoint>
```

- Do not add `AgentPrompt`, coding-agent buttons, hidden prompts, or an AI-assisted path through a tutorial.
- Do not make setup or verification depend on nondeterministic agent behavior.
- A tutorial may discuss AI-generated code when that is the subject being taught, but its instructions must still be deterministic and completed by the reader.

## Validate before handing off

- Materialize the tutorial project in a clean scratch directory and exercise every checkpoint in order.
- Confirm that every complete code snapshot type-checks and runs after copying.
- Keep tutorial code fences out of runtime doctests; validate the complete stateful tutorial project separately.
- Verify every HTTP status, body, log line, attempt count, timeout, and cancellation claim.
- Inspect the page locally for inserted-line highlights, collapsed ranges, copy behavior, code-fence spacing, and checkpoint flow.
- Request the `.md` version of the page and confirm that essential instructions and code survive conversion.
- Scan for forbidden historical framing and typography:

```sh
rg -n '—|\b(?:v3|v4|migration|migrat(?:e|ing|ion))\b' <tutorial.mdx>
```

- Run `git diff --check` and the relevant repository checks through `vp run`.
- During review, fix objective clarity, terminology, rendering, and API-explanation problems autonomously. Pause only for a strong editorial choice that would materially change the tutorial's audience, outcome, scenario, or architecture.
