# Website accessibility audit

Date: September 8, 2026. Branch: `accessibility/site-wide-audit`. The audit started
from `0519b29f`, the completed Astra article audit. Before publication, the branch
was rebased onto `main` at `86af6759`, which includes the merged Astra PR.

## Scope and method

The audit covers the site's route templates, documentation and blog collections,
published API reference, and interactive features. The reference standard is WCAG
2.2 A/AA; automated runs also include axe's best-practice rules.

| Content                          |              Inventory |
| -------------------------------- | ---------------------: |
| Documentation entries, v3 and v4 |                    234 |
| Blog posts                       |                    181 |
| API modules                      | 1,061 (542 v3; 519 v4) |
| API package/version indexes      |                     66 |
| Podcast episodes                 |                     10 |
| Job listings                     |                     20 |
| Merch products                   |                      9 |

The crawler reads Astro's parsed collection IDs instead of guessing slugs. Its
full inventory contains 1,573 routes, including redirect aliases, API version and
package indexes, marketing and event pages, and the 404 page. The representative
matrix contains 164 routes: the main templates, every API package index and its
first module, and all podcast episodes.

The API data is the published snapshot
`api-reference-b9a0871c7520ad63d8004f0e055e1a1182c72f4ba743e15fb361428e3b699036`.
Archive SHA-256:
`1fa226737f4bbb1e34b3f31bd1447bb0799385369f201dd4aa93ecdcfa073760`.

The browser checks use Chrome on macOS and axe-core 4.13.0 through Playwright.
The matrix requests light and dark themes at 1,280, 390, and 320 CSS pixels wide,
with a height of 900 pixels. Marketing and event pages intentionally force dark
mode; results record the rendered theme as well as the requested preference.
The full content crawl uses 1,280 × 900 in dark mode. These are separate coverage
sets: every content page was not tested in every layout.

Additional checks cover keyboard operation, focus recovery, 200% root-font
enlargement, WCAG text spacing, short viewports, reduced motion, selected no-JS
flows, screenshots, and the browser accessibility tree.

## Shared fixes

| Area                   | Findings and implementation                                                                                                                                                                                                                                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Page landmarks         | `Main.astro` supplies a single focusable skip-link destination across docs, API, marketing, events, and the playground. The playground has a page heading and a named main landmark.                                                                                                                                                             |
| Navigation             | `Disclosure.astro` provides native disclosure semantics, Escape/focus recovery, and closing on link activation, outside interaction, or focus departure. Docs, event navigation, contents menus, and calendar links use it.                                                                                                                      |
| Sticky content         | `StickySubnav.astro` measures secondary navigation for anchor clearance. Headers become non-sticky in short viewports. Compact docs controls and a non-shrinking logo remain usable with enlarged text.                                                                                                                                          |
| Dialogs and menus      | Shared Base UI primitives provide bounded, scrollable dialogs, focus containment, initial/final focus, and Escape. Theme and blog category menus use radio items. Explicit menu names take precedence over generated trigger labels.                                                                                                             |
| Theme and focus        | Stronger subtle-text, destructive, callout, and focus tokens replace low-contrast styling. Buttons and ordinary links share a visible focus outline. Theme changes respect reduced motion.                                                                                                                                                       |
| Documentation tabs     | Named tablists, labelled panels, selected state, arrow/Home/End navigation, and optional storage. Without JavaScript, every example and its label remains readable.                                                                                                                                                                              |
| Code and API reference | Expressive Code supplies focusable, numbered code regions and higher-contrast line numbers. Long declaration names and metadata wrap. Raw JSDoc code can scroll with the keyboard. Examples use figures/captions; generated “See” labels do not impose a heading level.                                                                          |
| Filter results         | `FilterStatus.astro` announces package/module counts. Blog filtering and pagination announce the result count and page.                                                                                                                                                                                                                          |
| Homepage               | A native package-manager select and separate copy button replace nested controls. The copy result is announced. Quote scrolling has an explicit pause control, honors reduced motion, and hides duplicate slides from the accessibility tree.                                                                                                    |
| Merch                  | `CarouselControls.astro` provides named previous/next controls, 28px image targets, and current-image state.                                                                                                                                                                                                                                     |
| Playground             | File actions are always available to keyboard users. Inputs have names and focus recovery. Deletion confirmation is owned by the explorer so removing a row does not unmount the focus manager. After deletion, focus returns to the explorer's first control. Sharing uses the common dialog with named copy/download controls and status text. |
| Editor and terminal    | Monaco is named and uses automatic accessibility support. Visible instructions explain its native Tab-navigation shortcut. The light current-line tint preserves syntax contrast. xterm's screen-reader mode is enabled. Mobile file/editor panels stack vertically.                                                                             |
| Trace viewer           | Native trace selection, keyboard column resizing, named span controls, expanded states, contextual duration/error names, and row/column headers. Empty and populated views were exercised.                                                                                                                                                       |
| Podcast                | Transcript cue names retain the visible text. Desktop follow-playback is explicit; a user pause persists and focus in the transcript pauses following. Chapter and guest links wrap.                                                                                                                                                             |
| Motion and media       | Shared reduced-motion styles cover CSS animation and transitions. The loader honors reduced motion and announces progress. `VideoFigure.astro` provides native playback controls and descriptions for the three silent video uses.                                                                                                               |
| Content structure      | Footer/job headings, documentation section levels, release-post section levels, and Micro comparison-table headers were corrected in their source content. Event inclusions expose “Included” and “Not included” text.                                                                                                                           |
| Reflow                 | Shared prose, heading/link wrapping, navigation, footer, API metadata, calls to action, ticket rows, podcast columns, and merch badges were corrected at their shared layout/component boundaries.                                                                                                                                               |

## Verification

The final review also added `SearchField.astro` for named API filters with visible
input boundaries. Blog pagination now focuses the result heading and uses the
shared sticky-header clearance. A minimum playground workspace height permits
page scrolling in short viewports instead of collapsing the editor.

`AnimatedFigure.astro` gives seven GIF demos static previews and native Play/Stop
disclosures, including without JavaScript. The two Effect 3.0 survey charts now
have their labels and values in alt text.

Project checks completed after the implementation:

- Formatting: 814 files.
- Lint and TypeScript: 426 files, no diagnostics.
- Astro: 331 files, no errors, warnings, or hints.
- Unit tests: 336 tests in 30 files passed.
- Browser regressions: all 17 passed across the final suite and one targeted
  rerun. The suite passed 16; the new pagination test initially activated its
  server-rendered button before hydration. After adding a readiness wait, that
  test passed. Coverage includes four article tests and two playground file-sync
  tests.

After rebasing onto current `main`, verification passed again:

- Frozen-lockfile dependency installation.
- Formatting for 807 files, lint/TypeScript for 422 files, and Astro checks for
  331 files, with no diagnostics.
- All 332 unit tests in 29 files. The lower count reflects tests removed on
  `main` during the hosting migration.
- All 17 browser regressions in one run, including the corrected pagination test.

The broad crawl evidence below predates the rebase. Post-rebase logs are
`site-post-rebase-tests.log` and `site-post-rebase-e2e.log` in the same local
evidence directory.

### Automated results

Chrome version: `152.0.7977.76`. All four runs completed their expected state
counts, with no navigation/readiness errors, unexpected HTTP status, or root-width
overflow. The three broad runs exit with status 1 for the recorded violations.
The final control verification exits with status 0.

| Run                   | UTC start and finish |        States | States with violations |
| --------------------- | -------------------- | ------------: | ---------------------: |
| Full crawl            | 19:04:35 to 19:26:13 | 1,573 / 1,573 |                      2 |
| Representative matrix | 19:04:40 to 19:16:43 |     984 / 984 |                      6 |
| Targeted verification | 19:28:47 to 19:31:49 |     108 / 108 |                      8 |
| Final controls        | 19:38:56 to 19:39:18 |       18 / 18 |                      0 |

The full crawl reports Luma's calendar and the v3 `Order` table. The matrix
reports only Luma, in six states. The targeted run checks 18 affected routes in
all six width/theme combinations. It reports the source table in six states and
Luma loading headings in two. Later successful Luma loads do not resolve its
intermittent loading or event-content findings.

The matrix finished before the final GIF, input-boundary, and code-region naming
changes. The full crawl spans the GIF and input-boundary changes, so it is not a
single-revision snapshot. The restarted-server targeted run verifies those changes
and the code-region naming fix. Blog pagination and the playground's short-height
layout received a subsequent focused check. The last 18-state run covers blog,
playground, and the API package index in all width/theme combinations.

Incomplete results are review requests, not passing checks. The counts below sum
node occurrences across states, including repeated shared components.

| Incomplete rule          | Full crawl |  Matrix | Targeted |
| ------------------------ | ---------: | ------: | -------: |
| `color-contrast`         |    183,194 | 214,726 |   25,765 |
| `aria-prohibited-attr`   |     27,295 |  10,300 |        2 |
| `video-caption`          |         93 |       0 |       12 |
| `frame-title-unique`     |          4 |       0 |        0 |
| `link-in-text-block`     |          1 |       2 |        0 |
| `aria-required-children` |          0 |       4 |        6 |

Investigation of `aria-prohibited-attr` found labels on ordinary code blocks and
containers without roles. The code plugin now labels only overflow regions and
updates the labels when Expressive Code changes their roles. Documentation
version and API module groups have explicit group roles. The two remaining
targeted occurrences identified the module group and led to that final fix.
The sampled `aria-required-children` result comes from Monaco's empty sticky-line
list before it has entries.

The final control run has 2,866 incomplete contrast occurrences and five
`aria-required-children` occurrences, with no `aria-prohibited-attr` occurrences.
Direct input-boundary contrast measurements against the card background are
4.62:1 light and 3.67:1 dark. Populated trace details and sharing dialogs also pass
axe in both themes after the final token changes.

Local evidence is stored under the session's `T/opencode` directory:
`site-verified-crawl.json`, `site-verified-matrix.json`,
`site-verified-targeted.json`, `site-final-controls.json`, `site-final-manual.json`,
`site-posters-input-final.json`, `site-search-verified.json`,
`site-unit-tests.log`, and `site-final-e2e.log`. Earlier `site-final-*` crawl files
are exploratory results and do not replace these verification runs.

### Interaction and layout checks

- Skip-link entry on homepage, docs, API, events, merch, and blog.
- Mobile navigation focus containment; Escape recovery for docs/event/calendar
  disclosures; theme and blog menu keyboard selection.
- Documentation tabs with unavailable localStorage; no-JS docs navigation and
  all installation examples.
- Package-manager selection/copy, API zero-result and filtered counts, and
  navigation through the native API package selector.
- Search opening, initial input focus, Escape restoration, and error display.
  The local live search request failed. Successful result rendering and arrow-key
  navigation were checked with a schema-shaped fixture in both themes; that does
  not verify the deployed search backend.
- Playground create/cancel/delete, deletion Escape recovery, confirmed-deletion
  focus recovery, reset focus containment, sharing, native Monaco Tab navigation,
  and trace selection/resize/details. Light/dark loaded, reset, sharing, and empty
  trace states passed axe. The native Monaco shortcut tested on macOS was
  Ctrl+Shift+M, then Tab.
- Merch dot and previous controls with the keyboard; quote pause remained stable
  over an observation interval, and changing Reduce Motion updated its controls.
- Podcast desktop follow pause through close/reopen; mobile chapters and
  transcript; accessible title on the activated YouTube iframe.
- Nineteen route samples at 390px with 200% root font and with WCAG text spacing
  (line height 1.5, paragraph spacing 2em, letter spacing .12em, word spacing .16em).
  The final API-select and myths-stat wrapping fixes were checked separately.
- At 320 × 256, homepage, docs, API index, events, myths, and the Astra article
  measured 320px root width and released their sticky headers. The playground's
  editor initially collapsed to 5px high. With a minimum workspace height, it
  measures 225px and the page scrolls vertically with a 320px root width.
- All seven GIF disclosures passed keyboard Play/Stop checks with JavaScript
  enabled and disabled. Both underlying MP4 assets have no audio tracks, as
  checked through the browser's captured media stream. Native controls and
  descriptions supply the silent demos' alternatives.

The text-enlargement sample includes `/`, onboarding, installation, API version
and package indexes, v3 Arbitrary and Google Generated modules, blog listing and
Astra article, podcast listing and Foldkit episode, merch, Effect Days, brand
assets, community, jobs, myths, privacy, and 404.

## Open findings and review limits

### External calendar

The Luma iframe on `/community-hub` still reports third-party violations:
weekday text at 2.29:1 (`#a6a6a6` on `#f8f8f8`, 16px), unnamed event-overlay links,
and empty headings during loading. Findings vary with the calendar's loading and
event state. The host page offers a visible calendar link; the embedded calendar
itself needs a supplier fix or an accessible replacement. It is not excluded
from the audit results.

### Published API source table

`/docs/v3/api/effect/Order` contains an empty fourth column header in a source
truth table. Correct the source JSDoc and republish the API snapshot. The generic
renderer cannot infer the column's intended meaning reliably.

### Assistive technology and media

- Accessibility-tree inspection is not a VoiceOver, NVDA, or JAWS listening
  session. Speech order, live announcements, Monaco navigation, and terminal
  output still need direct assistive-technology validation.
- The blog source contains 422 YouTube component uses and 767 Tweet component
  uses, including repeated embeds. Their captions, transcripts, audio description,
  and third-party interaction states were not individually reviewed. The activated
  YouTube frame loaded its player container, but the browser run did not establish
  successful playback, seeking, or caption operation. Podcast
  pages have transcripts, but transcript accuracy and coverage of visual-only
  demonstrations still need editorial review.
- Browser runs inspect a finite set of states. Complex gradients, overlays,
  syntax colors, short strings, and third-party frames can produce incomplete
  contrast checks. The audit includes selected direct contrast checks; it does
  not establish that every incomplete node passes.
- macOS Chrome was the browser used. Safari, Firefox, Windows high-contrast mode,
  touch screen readers, and speech-control software remain separate checks.

These results document the tested coverage and the fixes made. They are not a
claim of full WCAG conformance.

## Reproducing the browser audit

Prepare the published API-reference data in `apps/web/.data`, then run:

```sh
direnv exec . pnpm exec vp run check
direnv exec . pnpm dev
```

In another terminal:

```sh
# Representative templates, both themes, 1280/390/320px.
direnv exec . pnpm exec node apps/web/scripts/audit-accessibility.mjs

# Every discovered content route, 1280px dark.
direnv exec . env AUDIT_ALL=1 AUDIT_OUTPUT=test-results/accessibility-full.json \
  pnpm exec node apps/web/scripts/audit-accessibility.mjs

direnv exec . env PLAYGROUND_URL=http://localhost:4321 pnpm exec playwright test \
  apps/web/test/e2e/site-accessibility.spec.ts \
  apps/web/test/e2e/blog-accessibility.spec.ts \
  apps/web/test/e2e/playground-file-sync.spec.ts
```

`WEBSITE_URL`, `AUDIT_ROUTES` (comma-separated paths), `AUDIT_WIDTHS`,
`AUDIT_THEMES`, and `AUDIT_OUTPUT` support targeted runs. The scanner records
violations, incomplete-rule counts, HTTP status, rendered theme, root overflow,
and route coverage. It fails for violations, unexpected status, overflow, missing
script/stylesheets, unready content, or incomplete coverage.

Keep source files stable during a crawl. Earlier exploratory runs were affected
by Astro HMR navigation interruptions and stale Expressive Code assets. The final
verification uses a restarted server, with targeted reruns for subsequent content
changes. Stop the server afterward with `direnv exec . pnpm stop`.
