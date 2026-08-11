---
name: write-effect-docs
description: Write and review clear, consistent Effect documentation for this repository. Use when editing or auditing documentation prose, MDX, code examples, terminology, API explanations, links, typography, stable API claims, or generated `.md` output anywhere under apps/web/src/content/docs.
---

# Write Effect Docs

Apply these conventions to every documentation family. Diátaxis classification
and category-specific structure are owned by `write-effect-diataxis`; do not
duplicate those rules here.

## Establish the context

- Identify the page's audience and what earlier pages can safely be assumed.
  Do not assume knowledge that the collection has not introduced.
- Inspect adjacent pages before changing established terminology, navigation,
  or information hierarchy.
- Verify Effect API names and semantics against the installed v4 package under
  `apps/web/node_modules/effect`. Consult its `SCHEMA.md` for Schema work.
- Document only stable exports. Do not teach `effect/unstable`, migration
  material, historical APIs, or comparisons with previous documentation
  versions.
- Do not say “in v4” when the page already lives in the v4 documentation.

## Write direct prose

- Introduce a code block, model, table, or concept before presenting it. The
  reader should know what they are looking at and why it matters.
- Use direct, literal language. Replace unexplained jargon, idioms, vague
  metaphors, and feature-marketing language with observable behavior.
- Do not use Effect terminology or general software jargon as shorthand. Use
  the simplest words allowed by the audience's stated knowledge. When a
  technical term is necessary and falls outside that knowledge, define it in
  plain language at its first use.
- Prefer short paragraphs. Use lists for parallel roles, cases, steps, or
  outcomes, and tables when readers need to compare repeated fields.
- Use descriptive headings that help navigation. Do not create headings merely
  to enlarge a link or sentence.
- Use frontmatter for the page title and do not repeat it as an H1 in the body.
- Use site routes for internal links and never include a `.mdx` extension.
- Write important links explicitly so they remain useful in generated `.md`
  pages.
- Never use the em dash character `—` in documentation copy.

## Explain every Effect API and concept

Whenever a code snippet introduces an Effect-specific API or term, explain it
briefly immediately before or after that snippet. Do not postpone the
explanation to a later section. Cover:

- what the API does in general;
- what its arguments mean in the example;
- how it changes success values, expected failures, requirements, execution, or
  interruption when relevant;
- what concrete type or observable behavior results;
- what it does not do when the name could create a false impression.

Write Effect API names as inline code, never as links to their generated
reference declarations. A page may link to the API Reference as a separate
related resource when the reader genuinely needs its complete facts.

Before finalizing a page, inspect every code snippet and account for every
Effect API it contains. Each API must have been introduced and explained either
before that snippet or immediately after it. An explanation earlier on the same
page remains valid; do not repeat it mechanically.

When Effect is new to the reader, establish this mental model at the first
Effect value:

- An Effect is a value that describes a computation.
- Creating or transforming it does not run the computation or perform side
  effects.
- A runner such as `Effect.runPromise` runs it at an application boundary.
- The success type describes the produced value.
- The error type describes expected failures and is called the error channel.
- Interruption means cancelling a running computation.
- A defect is an unexpected bug, distinct from an expected failure.

Never leave an abstract placeholder such as `Effect<Success, Error>`
disconnected from the code. Show the concrete inferred type of the value just
created and connect every type argument to a concrete outcome.

For frequently used APIs, preserve these distinctions:

- `Effect.tryPromise` adapts a Promise-producing function. Resolutions become
  successes, rejections enter the error channel, the function stays lazy, and
  its `AbortSignal` reaches the Promise API.
- `Effect.runPromise` runs a computation and returns a Promise. It resolves with
  the success value, rejects when the Effect does not succeed, and can observe
  an external `AbortSignal`.
- `pipe` transforms descriptions from top to bottom without running them.
- `Effect.map` transforms the success channel with a function and leaves the
  error channel unchanged. Separate that general behavior from the concrete
  result chosen by the example.
- `Cause.UnknownError` is Effect's built-in wrapper for an unclassified
  rejection and preserves the original `cause`.
- `Data.TaggedError` creates a typed error class with a tag and declared fields.
- `_tag` is Effect's ubiquitous convention for discriminating variants.
- `Effect.catchTags` matches tagged expected failures. Its handlers return
  Effects, and a successful handler removes the handled failure.
- `Effect.sync` defers synchronous work and uses its return value as success.
- `Effect.succeed` describes success with an already available value.
- `Effect.fail` describes an expected failure; creating it does not throw.
- `Effect.retry` reruns the preceding computation after selected failures.
  Explain the predicate and total attempt bound concretely.
- `Effect.timeoutOrElse` bounds the preceding computation, interrupts it, and
  runs a fallback on timeout.
- Named `Effect.fn` functions return Effects, sequence operations through their
  generator body, and create and close a span when run. Use `Effect.withSpan`
  for an existing Effect or anonymous block that does not merit a named
  function.

Inventory APIs from the actual page instead of relying on memory. Adjust the
module list to the page:

```sh
rg -o '\b(?:Cause|Context|Data|Effect|Layer|Option|Result|Schema|SchemaTransformation|Scope|Tracer)\.[A-Za-z0-9_]+' <page.mdx> | sort -u
```

Also inspect generated members such as service `.use` accessors and shared
methods such as `.pipe(...)`; a qualified-name scan does not find them reliably.

## Present code clearly

- Verify every snippet against the installed package rather than remembered
  APIs.
- Give each code fence a short, meaningful title.
- Separate adjacent code fences with a brief transition so they do not render
  as one block.
- Add code comments sparingly. Explain only non-obvious decisions, boundaries,
  or behavior; do not narrate syntax or repeat the prose.
- Use Expressive Code's native highlighting features. Do not invent a custom
  plugin when the native presentation is sufficient.
- Ensure copied code is valid in the context promised by the page.

## Preserve the documentation presentation

Use the site's standard link styling throughout the documentation. Do not
encode a page's Diátaxis category in the color of links that point to it. Keep
current-page navigation neutral because it communicates location rather than
document family.

Keep pain points amber and errors red. Define and inspect both light and dark
values for any new semantic style, and keep text, labels, icons, borders, or
other non-color cues so color is never the only distinction.

Use normal documentation typography for explanatory content. Prefer native
Markdown headings, tables, and lists for static information. Do not hide static
content behind a component or shrink its text to make more information fit.

## Validate the page

- Inspect the page locally for information flow, typography, links, code-fence
  spacing, highlights, and responsive behavior.
- Request the `.md` version and confirm that essential prose, links, tables, and
  code survive conversion.
- Scan for forbidden historical framing and typography:

```sh
rg -n '—|\b(?:v3|v4|migration|migrat(?:e|ing|ion))\b' <page.mdx>
```

- Run `git diff --check` and the relevant repository checks through `pnpm` and
  `vp run`.
- Fix objective clarity, terminology, rendering, link, and API-explanation
  problems autonomously. Pause only when a choice would materially change the
  audience, outcome, or documented behavior.
