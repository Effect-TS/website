---
name: write-effect-tutorials
description: Create and review beginner-friendly Effect tutorials for this website, especially MDX under apps/web/src/content/docs/v4/tutorials. Use when drafting, restructuring, integrating, or auditing a tutorial; designing its progressive backend scenario and controlled fixtures; adding checkpoints and coding-agent prompts; presenting full-file Expressive Code diffs; or checking that every Effect API and concept is explained to a TypeScript developer with no prior Effect knowledge.
---

# Write Effect Tutorials

Create Diataxis-style tutorials that lead a TypeScript backend developer from familiar code to one robust, observable result through small verified steps.

Use `apps/web/src/content/docs/v4/tutorials/handle-failures-without-guessing.mdx` as the canonical implementation reference. Inspect only the relevant portions when a concrete MDX or prompt pattern is needed.

## Establish the reader and outcome

- Assume the reader knows TypeScript, Promises, `async`/`await`, HTTP, and ordinary backend development.
- Assume no knowledge of Effect, generators, functional pipelines, fibers, error channels, interruption, defects, schedules, layers, or services.
- Name the tutorial after a general pain recognizable to backend developers. Do not make the title depend on knowing the tutorial's scenario.
- Explain the concrete scenario before asking the reader to act.
- State what the reader will learn and the observable behavior of the finished backend. Use a compact table when several cases must be distinguished.
- Keep the tutorial learning-oriented and guided. Do not turn it into explanation, reference, or a menu of alternatives.

## Design a pain-first progression

1. Start with a small, working backend written in conventional TypeScript. Prefer one local HTTP server and one endpoint.
2. Keep the starter familiar and short. Inline one-use types and helpers when naming them adds ceremony rather than clarity.
3. Immediately demonstrate what can go wrong with the starter.
4. Introduce one limitation at a time. Follow each limitation with the smallest Effect change that addresses it.
5. Explain the new API or concept in terms of the exact code just added.
6. Run the backend, show the expected observable result, and end with a checkpoint.
7. Preserve a single linear state progression. The manual path and coding-agent path must produce the same files and verification result at every checkpoint.

Allow the tutorial to be long when the journey requires it, but keep each step small. Do not introduce an API merely for completeness. Avoid `Effect.gen`, `Schedule`, layers, and other new abstractions unless the current problem cannot be taught clearly with fewer concepts.

When a valuable capability would require enough setup to obscure the lesson, mention it briefly and defer its implementation to a later tutorial. Do not burden the reader merely to make the example comprehensive.

## Use a realistic controlled backend

- Build a real local backend rather than isolated toy expressions.
- Represent external providers with deterministic Promise-based fixtures. Model useful latency, rejection, outage, recovery, and cancellation behavior without public internet access, credentials, Docker, or a second process.
- Keep fixture setup out of the lesson. Supply it ready-made, label it as tutorial fixture code, and collapse it whenever the reader does not need to inspect it.
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

Present each concrete API explanation in the shared `EffectApi` card. Keep general concepts such as the error channel, interruption, and defects in the surrounding narrative.

```mdx
<EffectApi
  name="Effect.tryPromise"
  href="/docs/v4/api/effect/Effect#tryPromise"
>
  Describe the API in terms of the code just introduced.
</EffectApi>
```

- Use the complete API name as the card title.
- Keep the description focused on behavior the reader can connect to the current step.
- Link directly to the declaration in the API reference.
- Write the `href` explicitly so the reference remains visible in the raw `.md` representation.
- Verify ambiguous declaration anchors against the generated reference. A symbol exported as both a type and a value may use suffixes such as `-interface` or `-variable`.
- Reuse a card when a later step introduces a materially different capability of an API, such as passing an external `AbortSignal` to `Effect.runPromise`.
- Let adjacent `EffectApi` cards form the component's automatic visual stack.
  Do not add filler prose or MDX wrappers merely to separate related API cards.

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
- State a minimum runtime version only when a command or language feature requires it. Do not repeat environment trivia such as “checked on macOS” or pin an arbitrary current version.
- Start the server with `node --watch server.ts`, explicitly explain `--watch`, and tell the reader to keep it running.
- Say “open a second terminal pane” for verification commands.
- Do not tell the reader to stop and restart a watched server between edits.
- Add descriptive subsection headings when they help the reader orient themselves. Avoid generic headings that add no information.
- Avoid adjacent code fences that render as one block. Separate them with a short transition and give each fence a meaningful `title`.
- Never use the em dash character `—` in documentation copy.

## Present code for copying

Show the complete current file for every human-facing code modification. A copied block must produce the working file for that checkpoint; do not make the reader reconstruct a file from fragments or manually apply a textual patch.

Use Expressive Code's repository integration:

````md
```ts title="server.ts" collapse={UNCHANGED_RANGES} useDiffSyntax copyFinal
// complete file, with changed lines marked by diff syntax
```
````

- Mark additions and removals in the complete file.
- Keep changed code visible.
- Collapse as much unchanged code as possible both before and after the changed area.
- Collapse long fixtures by default.
- Use the short filename, such as `server.ts`, as the title rather than a long path.
- Verify that the copy button produces the complete final file without removed lines.
- Recalculate collapse ranges after every code edit and inspect the rendered result.

## Add checkpoints and coding-agent prompts

Explain near the beginning that a checkpoint is a short verification performed before continuing, and that each checkpoint offers an optional coding-agent prompt.

End every meaningful state transition with one `TutorialCheckpoint`. Give it an outcome-oriented title and summarize what now works. Do not add internal dashed separators or decorative space that does not communicate state.

Nest one `AgentPrompt` in each checkpoint when agent assistance is useful:

````mdx
<TutorialCheckpoint number={N} total={TOTAL} title="Observable outcome">
  Summarize the verified state.

  <AgentPrompt label="AI prompt: concise action">

```text
Agent-ready instructions live here.
```

  </AgentPrompt>
</TutorialCheckpoint>
````

- Keep labels short and always prefix them with `AI prompt:`.
- Keep prompt content inline in the MDX. Do not load it from an external file. The page's `.md` representation must retain the instructions.
- Optimize visible prose and code for the human. Keep agent-only operational detail inside the button.
- Use one prompt per meaningful checkpoint, not one per command or substep.
- Make the initial prompt capable of creating the complete starter project, starting the watched server, and verifying the first request.
- For later edits, give the agent an exact predetermined patch. Do not ask it to design, refactor, or improve the solution.
- State the working directory, allowed files, expected prior checkpoint, exact requested change, verification command, and expected result.
- Require a clean preflight: if the patch does not apply to the expected state, stop and report the mismatch without changing files.
- If verification refuses the connection, allow the agent to start `node --watch server.ts`, wait for the listening message, retry, and leave the server active. Do not restart a server that returned an incorrect HTTP response.
- On verification failure, report the observed difference without silently repairing it.
- Keep the manual instructions and agent prompt semantically identical.

## Validate before handing off

- Materialize the tutorial project in a clean scratch directory and exercise every checkpoint in order.
- Confirm that every complete code snapshot type-checks and runs after copying.
- Keep tutorial code fences out of runtime doctests; validate the complete stateful tutorial project separately.
- Verify every HTTP status, body, log line, attempt count, timeout, and cancellation claim.
- Inspect the page locally for collapsed ranges, diff colors, copy behavior, prompt button visibility, code-fence spacing, and checkpoint flow.
- Request the `.md` version of the page and confirm that inline prompts and essential code survive conversion.
- Scan for forbidden historical framing and typography:

```sh
rg -n '—|\b(?:v3|v4|migration|migrat(?:e|ing|ion))\b' <tutorial.mdx>
```

- Run `git diff --check` and the relevant repository checks through `vp run`.
- During review, fix objective clarity, terminology, rendering, and API-explanation problems autonomously. Pause only for a strong editorial choice that would materially change the tutorial's audience, outcome, scenario, or architecture.
