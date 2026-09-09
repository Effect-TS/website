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

| Area                   | Findings and implementation                                                                                                                                                                                                                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Page landmarks         | `Main.astro` supplies a single focusable skip-link destination across docs, API, marketing, events, and the playground. The playground has a page heading and a named main landmark.                                                                                                                                     |
| Navigation             | `Disclosure.astro` provides native disclosure semantics, Escape/focus recovery, and closing on link activation, outside interaction, or focus departure. Docs, event navigation, contents menus, and calendar links use it.                                                                                              |
| Sticky content         | `StickySubnav.astro` measures secondary navigation for anchor clearance. Headers become non-sticky in short viewports. Compact docs controls and a non-shrinking logo remain usable with enlarged text.                                                                                                                  |
| Dialogs and menus      | Shared Base UI primitives provide bounded, scrollable dialogs, focus containment, initial/final focus, and Escape. Theme and blog category menus use radio items. Explicit menu names take precedence over generated trigger labels.                                                                                     |
| Theme and focus        | Stronger subtle-text, destructive, callout, and focus tokens replace low-contrast styling. Buttons and ordinary links share a visible focus outline. Theme changes respect reduced motion.                                                                                                                               |
| Documentation tabs     | Named tablists, labelled panels, selected state, arrow/Home/End navigation, and optional storage. Without JavaScript, every example and its label remains readable.                                                                                                                                                      |
| Code and API reference | Expressive Code supplies focusable, numbered code regions and higher-contrast line numbers. Long declaration names and metadata wrap. Raw JSDoc code can scroll with the keyboard. Examples use figures/captions; generated “See” labels do not impose a heading level.                                                  |
| Filter results         | `FilterStatus.astro` announces package/module counts. Blog filtering and pagination announce the result count and page.                                                                                                                                                                                                  |
| Homepage               | `InstallCommand` preserves the package-manager logo dropdown and uses the shared radio menu beside a separate copy button. The copy result is announced. Quote scrolling has an explicit pause control, honors reduced motion, and hides duplicate slides from the accessibility tree.                                   |
| Merch                  | `CarouselControls.astro` provides named previous/next controls, 24px image targets around the original 6px dots, and current-image state. The controls retain their appearance over light product photographs.                                                                                                           |
| Playground             | File actions appear on hover, keyboard focus, and touch devices. Inputs have names and focus recovery. Inline deletion initially focuses No; Escape restores Delete, and confirmed deletion focuses the explorer before removing the row. Sharing uses the shared Base UI popover with named controls and live feedback. |
| Editor and terminal    | Monaco is named and uses automatic accessibility support. A keyboard-help control explains its native Tab-navigation shortcut. The light current-line tint preserves syntax contrast. xterm's screen-reader mode is enabled. Mobile file/editor panels stack vertically.                                                 |
| Trace viewer           | The shared radio menu handles trace selection with the original selector appearance. Column resizing, span controls, expanded states, duration/error names, and row/column headers have keyboard and accessibility-tree support.                                                                                         |
| Podcast                | Transcript cue names retain the visible text. Desktop follow-playback is explicit; a user pause persists and focus in the transcript pauses following. Chapter and guest links wrap.                                                                                                                                     |
| Motion and media       | Shared reduced-motion styles cover CSS animation and transitions. The loader honors reduced motion and announces progress. `VideoFigure.astro` provides native playback controls and descriptions for the three silent video uses.                                                                                       |
| Content structure      | Footer/job headings, documentation section levels, release-post section levels, and Micro comparison-table headers were corrected in their source content. Event inclusions expose “Included” and “Not included” text.                                                                                                   |
| Reflow                 | Shared prose, heading/link wrapping, navigation, footer, API metadata, calls to action, ticket rows, podcast columns, and merch badges were corrected at their shared layout/component boundaries.                                                                                                                       |

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

### Install panel visual regression

The initial audit replaced the homepage's logo dropdown with a native
select and changed the panel's background and spacing. Automated accessibility
checks did not catch that design regression. After the user reported it on PR
#1539, `InstallCommand.tsx` restored the logo dropdown, divider, spacing, and panel
styling through the shared radio menu and a separate copy button.

Both homepage instances were visually compared with `https://effect.website` at
1280, 390, and 320 pixels. The desktop and 390-pixel panels retain their original
52-pixel height. At 320 pixels the command wraps rather than truncates, giving the
panel a 58-pixel height. Enlarged text stacks the controls when needed.

- Keyboard regression covers opening, selected-item state, Escape focus recovery,
  selection, Tab to Copy, clipboard contents, and feedback in both panels.
- All five package managers fit at all three widths with normal and 200% text,
  for 30 panel states. This checks panel containment, not whole-page reflow at
  every enlarged-text width.
- The open menu and closed panels have zero axe violations at all three widths.
- The default command remains readable without JavaScript.

Local evidence: `install-visual-verification.json`,
`install-package-manager-states.json`, and the `install-original-*` and
`install-restored-*` screenshots in the evidence directory documented below.

### Site-wide visual regression review

The user reported further design regressions after the install-panel fix.
The review compared the full PR diff with `86af6759`, the pre-audit revision,
running that revision locally with the same API dataset. Automated accessibility
results had missed changes to component appearance and interaction patterns.

| Component or area        | Regression and correction                                                                                                                                                                                  |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Docs navigation          | Restored the Docs label, divider, section spacing, bordered version segments, navigation background, and menu close icon. The full navigation fits from 960px; narrower layouts use the shared disclosure. |
| Theme menu               | Restored the moon in dark mode, sun in light mode, icon sizes, dropdown width, border, padding, and item spacing.                                                                                          |
| Shared disclosures       | Restored docs/event close icons and calendar/contents chevron rotation. Focus entering a menu rendered through a portal keeps its parent disclosure open.                                                  |
| Blog category menu       | Restored placement below the trigger, square item treatment, spacing, and the original selection marker. Removed the extra radio-indicator column.                                                         |
| Homepage install panels  | Restored logos, chevron, divider, background, dimensions, and separate keyboard-operable selection/copy actions in both instances.                                                                         |
| Quote controls           | Replaced the added wide pause-label button with an icon control matching the arrow buttons. Its accessible name and pressed state remain available.                                                        |
| Merch carousel           | Removed the added background boxes and always-visible desktop arrows. Larger transparent targets surround the small dots; arrows appear on hover and keyboard focus.                                       |
| Playground file explorer | Restored the original background, compact hover actions, and inline Yes/No confirmation. Keyboard focus also reveals the actions.                                                                          |
| Playground sharing       | Restored the anchored Share popover, original dimensions, and input/button arrangement. Base UI supplies focus management and Escape.                                                                      |
| Playground confirmations | Restored the modal width, padding, text spacing, button sizing, and neutral confirmation treatment.                                                                                                        |
| Editor and trace viewer  | Moved the added instruction strip into a keyboard-help popover. Restored trace-panel colors, radio-menu selection, and the narrow visible column separator with a larger transparent hit area.             |
| Shared colors            | Restored callout tint hues and green API JSDoc links. Separate foreground tokens provide text contrast without recoloring backgrounds. Form borders no longer supply button background colors.             |
| Footer                   | Removed the blanket opaque fill, preserving the original gradient and page backdrop.                                                                                                                       |
| Dark-only pages          | Merch and brand assets now use the existing `BaseLayout` dark-mode setting, so a saved light preference cannot put dark footer text over their fixed dark backgrounds.                                     |
| Blog media               | Removed added caption/control rows from the document flow. Play/Stop controls overlay the GIF previews, descriptions remain in the accessibility tree, and the 644px demo retains its natural dimensions.  |

The final screenshot capture includes 47 routes and 158 baseline/corrected pairs,
316 rendered page states. It covers 1280px and 390px, with both themes for docs,
blog, and the playground. All requested routes returned the expected status.
Screenshots include page tops, full pages under 12,000px tall, and footers.
Separate captures exercise open menus, sharing, confirmations, quote controls,
media, and podcast transcripts. Earlier exploratory captures included a podcast
URL with an invalid trailing slash; the final set uses the canonical route.

The review also inspected the source-only changes: landmarks and labels, code
focus/region names, tab initialization, API wrapping, transcript-follow behavior,
heading levels, table headers, media descriptions, and alternative text. Heading
level corrections retain the shared typography for each semantic level. Narrow
layouts wrap long API names and stack playground panels to keep them usable.

Verification after these corrections passed formatting for 810 files,
lint/TypeScript for 425 files, Astro checks for 334 files, all 332 unit tests,
and all 20 browser regressions. New regressions cover both install panels,
desktop docs geometry, mobile nested-menu focus, natural GIF dimensions, inline
deletion, sharing, and editor keyboard help.

Late verification found and corrected the fixed-dark-page theme mismatch,
homepage feature-grid and CTA width constraints, and podcast breadcrumb contrast.
The final project check passed, and the homepage/merch browser tests passed again.
Homepage and docs root widths match the viewport in 28 states: 320, 390, 768, 960,
1024, 1280, and 1536px, each with normal and 200% root text. Both default install
commands remain readable without JavaScript. All seven native animation controls
and their posters also passed a no-JS check with reduced motion.

The 84-state accessibility rerun covered 14 affected routes in six width/theme
combinations. It reported two light-theme merch states with the footer contrast
failure. After correcting the theme boundary, a 24-state check of homepage,
merch, brand assets, and the podcast episode had no violations, readiness errors,
unexpected status, or root overflow. These runs have 28,151 and 22,310 incomplete
contrast occurrences respectively. The first also has 12 caption, four required-
children, and two link-in-text incompletes; the second has two link-in-text
incompletes. They remain review requests.

Open-control checks cover 32 distinct states across 16 scenarios. Four states
retain axe's `region` recommendation for theme/category menus portalled outside
the page landmarks. The pointer-open category menu also triggers
`scrollable-region-focusable` in both themes. Its popup is already focused with
`tabindex="-1"`; ArrowDown and End navigate its items, End scrolls it by 87px,
and the scrollability flag clears after keyboard navigation. These flags are
recorded rather than suppressed or addressed by adding unrelated landmarks.
The final ten-state follow-up has 24 `aria-hidden-focus`, four
`aria-valid-attr-value`, 10,988 contrast, and two link-in-text incomplete node
occurrences. Populated trace selection was separately exercised with two fixture
traces. Selection, focus restoration, rendering, and axe passed in both themes.

Evidence is in `visual-audit/final`, `visual-check-final.log`,
`visual-unit-final.log`, and `visual-e2e-final.log` under the local evidence
directory. `visual-audit/verified` contains the corrected podcast capture and
menu-rule follow-up. `visual-axe-final.json`, `visual-axe-verified.json`,
`visual-reflow-verified.json`, `visual-trace-verified.json`, and
`visual-e2e-late.log` record the later checks. The original broad crawl below
describes the earlier audit revision.

### Review follow-up, September 9

The next review identified emerald search focus outlines and overly bright
Share/navbar-search borders. The shared focus token now restores the original
neutral treatment: zinc-900 in light mode and white in dark mode, with the
existing two-pixel outline and offset.

Share and Reset use the shared `Button` subtle variant, with the original
dimmed fill, text, and border colors. Navbar search has separate resting and
hover border tokens. Both playground panel dividers use `ResizableHandle`'s
shared colors and sizing, matching the pre-audit desktop divider treatment.
The dividers retain keyboard resizing and a visible focus outline.

The project check passed formatting for 810 files, lint/TypeScript for 425 files,
and Astro checks for 334 files with no diagnostics. All 20 article/site
accessibility and playground file-sync browser tests passed in one run.

The final comparison used Chrome `152.0.7977.83`, both themes, and 1280px,
390px, and 320px widths. It captured 18 baseline/corrected pairs for the
playground, open Share popover, and focused search dialog, plus six corrected
keyboard-resize states. Computed colors and dimensions match the baseline for
Share/Reset; search focus color, thickness, and offset also match. Desktop
search borders and divider colors match in resting and hover states.
Search/Share focus recovery and keyboard resizing passed.

All 18 corrected axe states had zero violations and no root-width overflow.
The run retained 360 contrast, 84 `aria-hidden-focus`, six
`aria-valid-attr-value`, and five `aria-required-children` incomplete node
occurrences. Direct checks measured Share text contrast at 9.99:1 light and
11.74:1 dark, and the search focus outline at 17.72:1 light and 19.90:1 dark.
These measurements do not resolve every contrast incomplete.

Local evidence: `review-verification/results.json` and screenshots,
`review-check.log`, and `review-e2e.log`. The final comparison ran from
14:46:22 to 14:47:03 UTC on September 9 and exited with status 0.

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
