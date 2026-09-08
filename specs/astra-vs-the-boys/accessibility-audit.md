# Accessibility audit

Audited September 8, 2026. Page: `/blog/astra-vs-the-boys`, "Astra vs. The Boys: A Tale of 200 PRs". Starting revision: `8aaf16ee`.

## Result

The audit found issues in the article components, tweet embeds, and shared navigation. The fixes accompany this report.

- Lighthouse accessibility improved from **96 to 100** on desktop. The final mobile score is **100**.
- axe-core **4.13.0** reports **zero violations** for WCAG 2.2 A/AA rules and its best-practice rules across the tested page layouts.
- Browser keyboard tests cover the skip link, menu focus, theme selection, search dismissal, and enlarged text.

These results describe the tested states. Lighthouse and axe do not establish full WCAG conformance. Screen-reader semantics were inspected through Chromium's accessibility tree; this audit did not include a listening session in VoiceOver, NVDA, or JAWS.

## Scope and method

The target was WCAG 2.2 AA. Testing covered the rendered article, both sound controls, the cast, conversation cards, quotes, images, review diagram, tally, tweet embeds, table of contents, and page navigation.

- Local Astro page, including the production components and styles.
- Lighthouse navigation audits on desktop and mobile.
- axe scans at **1280 × 900** and **390 × 844**, in light and dark themes.
- Additional scans at **640 × 450** and **320 × 256** in light mode. These exercise the layouts corresponding to 200% and 400% browser zoom from a 1280px-wide viewport.
- A separate **200% root font-size** stress test at 1280px width.
- Text-spacing overrides of **1.5 line height**, **0.12em letter spacing**, **0.16em word spacing**, and **2em paragraph spacing** at 390px width.
- Keyboard traversal, focus visibility and occlusion checks, menu interactions, screenshots, accessibility-tree inspection, and computed-color contrast measurements.
- Search-dialog axe scans in both themes, including its reduced-motion behavior.
- Reading and explicit audio-link checks with JavaScript disabled.

The Astro development toolbar was excluded from page axe scans and keyboard-occlusion checks. It is absent from production.

## Findings and fixes

| Finding                                                                                                                                                                                   | Relevant criterion                                          | Fix                                                                                                                                                                                                                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The skip link stayed above the viewport when focused. Two different CSS translation mechanisms were applied together. Its destination also lacked a programmatic focus target.            | 2.4.1 Bypass Blocks; 2.4.3 Focus Order; 2.4.7 Focus Visible | The critical hiding rule now excludes the focused link. The main landmark accepts programmatic focus. Enter moves focus to main; the next Tab reaches the breadcrumb.                                                                             |
| Opening mobile navigation blurred focus onto the page. Tab could then move behind the overlay.                                                                                            | 2.1.1 Keyboard; 2.4.3 Focus Order; 4.1.2 Name, Role, Value  | Added a named modal-dialog role, focus on the close button, forward/backward Tab wrapping, and Escape focus restoration.                                                                                                                          |
| Closing search after opening it from the mobile menu attempted to restore focus to a hidden control.                                                                                      | 2.4.3 Focus Order                                           | Search now returns focus to the visible navigation-menu button. Desktop search returns focus to its trigger.                                                                                                                                      |
| The theme picker used ARIA menu roles without the corresponding arrow-key navigation or focus management.                                                                                 | 2.1.1 Keyboard; 2.4.3 Focus Order                           | Opening focuses the selected option. Arrow keys, Home, End, selection, Tab, and Escape manage focus.                                                                                                                                              |
| Enlarged text overflowed the navbar and share controls. Author names, a neighbouring post title, and quoted-tweet metadata were clipped. Some heading permalink controls moved offscreen. | 1.4.4 Resize Text; 1.4.10 Reflow                            | Navigation now switches layout according to available container width and text size. Share controls wrap; bylines and post titles can wrap. The sidebar scrolls within the available height. Permalinks stay inline in narrow reading containers. |
| The announcement and tweet metadata clipped text under spacing overrides.                                                                                                                 | 1.4.12 Text Spacing                                         | Text wraps instead of truncating. The announcement measures its height so sticky-content offsets remain accurate.                                                                                                                                 |
| Tweet-header author, username, and Follow links were only **20px** high and too close together.                                                                                           | 2.5.8 Target Size, Minimum                                  | Header links now have at least **24px** height. Their layout supports wrapping.                                                                                                                                                                   |
| Links within tweet text relied on blue alone. In dark mode their contrast against surrounding text was only **1.74:1**.                                                                   | 1.4.1 Use of Color                                          | Tweet-body links are underlined.                                                                                                                                                                                                                  |
| The usage screenshot in dax's tweet had the alt text "Image".                                                                                                                             | 1.1.1 Non-text Content                                      | Added article-supplied alt text describing the dashboard, its seven-day period, and the displayed cost, request count, and token count. It describes the screenshot without inferring who paid.                                                   |
| The highlighted tally had **2.47:1** contrast on white, below the **3:1** large-text threshold. Diagram lines and arrowheads also needed stronger contrast.                               | 1.4.3 Contrast, Minimum; 1.4.11 Non-text Contrast           | The tally and arrows use a darker token-based green in light mode. Diagram lines use the muted-foreground token.                                                                                                                                  |
| The cast's light-mode focus outline used the same **2.47:1** green. The audio button also relied on a faint ring.                                                                         | 1.4.11 Non-text Contrast; 2.4.7 Focus Visible               | Cast and sound controls use foreground-colored focus outlines. Tweet links have explicit focus outlines; heading-link icons use a higher-contrast token.                                                                                          |
| The announcement sat outside named landmarks. Search displayed a shortcut without a visible Search label. Byline portraits repeated the adjacent author name.                             | Landmark and naming improvements                            | Added an announcement region and a visible Search label. Shortcuts use `aria-keyshortcuts`; decorative byline portraits have empty alt text. Search has the concise dialog name "Search Effect".                                                  |

Tweet changes extend the existing `astro-tweet` package patch. The previous entity and whitespace fixes are retained. Its new `mediaAlt` prop accepts article-specific descriptions; no article-specific text is embedded in the package.

## Contrast measurements

Ratios use rendered foreground colors and composited ancestor background colors, converted to sRGB. Text antialiasing is not part of the calculation.

| Content                  |   Light |    Dark |
| ------------------------ | ------: | ------: |
| Article body             | 10.43:1 | 13.46:1 |
| Cast descriptions        |  7.72:1 |  7.59:1 |
| Conversation text        | 10.17:1 | 12.71:1 |
| Highlighted tally        |  5.29:1 | 12.29:1 |
| Diagram connecting lines |  7.52:1 |  7.16:1 |
| Diagram arrowheads       |  5.16:1 | 11.61:1 |
| Play label               |  7.72:1 |  7.59:1 |

axe marks some contrast checks as incomplete because of decorative overlays, gradients, and short text. It reports 395 such nodes on desktop and 26–60 in the smaller layouts. Those are **manual-review results, not automated passes**. The table records measured content styles; screenshots were also inspected for the title area, diagram, and embedded content. An independent assistive-technology and visual review remains useful before making a full conformance claim.

## Confirmed behavior

- The document has an English language declaration, a descriptive title, a main landmark, and one page H1. The article's H2/H3 hierarchy follows its sections.
- Both themes retain readable body text. Content and controls reflow without page-level horizontal scrolling in the tested layouts.
- The 200% text-enlargement test keeps links and controls inside the viewport. Text-spacing overrides preserve visible content.
- Keyboard traversal reaches the article's links and controls without an unintended trap or a focused control hidden by the sticky header.
- Mobile navigation and search restore focus to visible triggers. Theme options support keyboard selection.
- The cast and tally use description lists. Conversation text and tweet text are present in the HTML rather than available only as images.
- The diagram exposes a prose description of the investigation, revision, human-review, and merge/close paths. Its decorative SVG content does not replace that description.
- All three story figures have contextual alt text. The tweet usage screenshot now has a meaningful description in the accessibility tree.
- Both sound controls expose Play/Stop names and work by keyboard. Their text identifies the Law & Order sound effect.
- The 1.3-second sting carries no information unavailable in the written "Dun dun." cue. It is shorter than the three-second threshold in WCAG 1.4.2.
- Automatic audio follows the existing Off/On/System sound policy. System suppresses it with Reduce Motion. Deliberate Play remains available. The preceding audio verification covered fresh contexts, preference changes, blocked or malformed storage, keyboard activation, and mobile taps.
- Search's opening/closing animation is disabled with Reduce Motion. The article's diagram, screenshots, and tally are static.
- The article and direct Play links remain available without JavaScript.

## Reproduction and regression checks

The regression tests are in `apps/web/test/e2e/blog-accessibility.spec.ts`.

```sh
direnv exec . pnpm dev
direnv exec . env PLAYGROUND_URL=http://localhost:4321 pnpm exec playwright test apps/web/test/e2e/blog-accessibility.spec.ts
direnv exec . pnpm exec vp run check
direnv exec . pnpm exec vp run test
direnv exec . pnpm stop
```

Raw local artifacts are under `/private/var/folders/fh/xtmqwt1n0hd0tq2nstd7b7500000gn/T/opencode/`:

- `astra-audit-baseline.json` and `astra-audit-final.json`
- `astra-audit-final-lighthouse-desktop/` and `astra-audit-final-lighthouse-mobile/`
- `astra-audit-ax-final-light.json` and `astra-audit-ax-final-dark.json`
- `astra-audit-contrast-final.json`
- `astra-audit-spacing-final.png`, `astra-audit-reflow-400-final.png`, and `astra-audit-diagram-final-*.png`

These local artifacts are temporary. This report and the regression tests are retained in the repository.
