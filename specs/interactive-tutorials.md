# Interactive tutorials

Browser tutorials like [svelte.dev/tutorial](https://svelte.dev/tutorial). One lesson source gives two outputs: an interactive page, and plain markdown for AI. Effect v4 only.

## Outputs

| URL                               | Output                                     |
| --------------------------------- | ------------------------------------------ |
| `/tutorial/<chapter>/<lesson>`    | Prose, editor, results, Reset, Solve, Next |
| `/tutorial/<chapter>/<lesson>.md` | Prose, start file, goal test, solution     |
| `/tutorial/llms.txt`              | Index of lessons with `.md` links          |
| `/tutorial/llms-full.txt`         | All lessons in one file                    |
| `/tutorial/types.json`            | `effect` type definitions for the editor   |

## Lesson folder

```
src/content/tutorial/01-errors/01-failing/
  index.md       # frontmatter: title; body: prose
  main.ts        # start file, mounted in the editor
  solution.ts    # Solve button replaces main.ts with this
  main.test.ts   # hidden goal test, runs against the learner's main.ts
```

- Numeric prefixes set the order. The URL drops them.
- Files live in the repo. The browser mounts them in Monaco.
- Lessons are self-contained.

## Check (in the browser)

1. Monaco's TypeScript worker type-checks `main.ts` against the real `effect` types. Errors stop the check.
2. The same worker type-checks `main.test.ts`. A failure means the types do not match the goal.
3. A web worker runs the emitted ES modules and the goal test. Pass = every test passes.
4. A pass marks the lesson done.

Test API (`runner/test-api.ts`): `it(name, fn)` and `assert.ok` / `assert.strictEqual`.

## Progress

- `Atom.kvs` on localStorage (`effect-website/tutorial/...`): completed slugs and the learner's code per lesson.
- Lesson N opens only when lessons before it are done. Otherwise the page redirects to the first unfinished lesson.
- Next is disabled until the lesson passes.

## CI gate

`test/features/tutorial/lessons.test.ts` runs for every lesson:

- solution: no type errors, goal test passes.
- start: no type errors in `main.ts`; goal test fails or has type errors.

## Routing

- The lesson text is static HTML from Astro, outside any island. Only two islands hydrate: `TutorialHeader` (menu, arrows, Reset, Solve, progress) and `TutorialWorkbench` (editor, goals, footer). Both start as server-rendered twins.
- The islands share state through atoms (`state.ts`): current lesson, check status, boot steps, editor actions. Lesson changes use the History API: no reload, Monaco and its worker stay alive.
- On a lesson change the workbench swaps the HTML inside the static prose element.
- Each lesson page is still prerendered, so a direct URL works. Other lessons load on demand from `/tutorial/data/<slug>.json` (code) and `/tutorial/prose/<slug>` (HTML fragment, Astro `partial`). Neighbours prefetch.
- Astro's `<ClientRouter />` was not used: it swaps whole pages and would remount the editor.

## UI

- Header under the site nav: lesson menu (chapters, status, locks), prev/next arrows, breadcrumb, Reset, Solve, progress bar.
- Results panel lists the goals (the test's `it` names) with pass/fail and type errors. A footer under it holds Next, disabled with the reason until the goals pass.
- Lesson code blocks have no line numbers (`remark-lesson-code`).
- `DocsNavigation`, docs prose (`prose prose-effect`), playground editor chrome and themes.
- Reading panel and editor column split with a small separator (`split.ts`: pointer and arrow keys, width saved in localStorage, applied before first paint). The results box fits its content.

## Later

1. Trace and timeline panes from `visual-effect` and `trace-viewer`.
2. Multi-file lessons. WebContainer lessons for Node APIs.
3. `/docs/llms.txt` from the same generator.
4. Search: index lessons in Mixedbread.
5. `types.json` is 10 MB (1.35 MB gzip). Trim to the modules lessons use.
