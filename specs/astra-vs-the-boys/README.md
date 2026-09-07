# Astra vs The Boys: a tail of 200 PRs

Research notes for the proposed post. Repository: [Effect-TS/effect](https://github.com/Effect-TS/effect). PR author: [Kit Langton, @kitlangton](https://github.com/kitlangton).

## The count

Kit opened **207 PRs** in the two-week window. **195 merged, 12 closed without merging, and none remain open.** Of the 12 unmerged PRs, Giulio explicitly replaced two with different implementations that have since merged. The other ten closures have no explanation in the public PR or linked issue discussion.

The creation window is August 24, 2026 at 09:14:53 UTC through September 7, 2026 at 09:14:53 UTC. All dates below use UTC. This is a creation-date cohort, with outcomes and follow-ups checked on September 7. A separate search found no older Kit PRs updated during the window.

| Outcome                | PRs | Share of opened PRs |
| ---------------------- | --: | ------------------: |
| Merged                 | 195 |               94.2% |
| Closed without merging |  12 |                5.8% |
| Still open             |   0 |                  0% |
| Total opened           | 207 |                100% |

"Opened" means all PRs created in the window, including those now merged or closed. "Rejected" is shorthand for closed without merging; it does not establish that the reported bug was invalid.

The full material is in three companion files:

- [Merged PRs](merged-prs.md) covers every one of the 195 merges, with the change, review revisions, and any identified later follow-up.
- [PR inventory](prs.csv) contains all 207 PRs, exact timestamps, current outcomes, merge SHAs, commit authors, and research notes in spreadsheet form.
- [Backchannel chronology](backchannel.md) records the twelve supplied screenshots, quotes, audit origin, stopping point, and the Bun/CI follow-up they reveal. Its Slack times use the displayed timezone, which the screenshots do not identify.

## What the backchannel adds

Kit names [Queue #7576](https://github.com/Effect-TS/effect/pull/7576) as the bug he found while working on OpenCode that prompted him to send agents looking for similar bugs. Tim encourages the audit, asks for the `audit` label, and jokes about avoiding 100 PRs a day. Sebastian's "Tim needs food for his boys" supplies the title's running joke, with agent-assisted investigation visible on the receiving side too.

On September 4, Tim asks Kit to stop because the PRs are reaching exotic edge cases in internal tooling. Kit replies, "Good boy, Astra!" Later, dax confirms that OpenAI said they could discuss what was built with Astra.

Tim's assessment on September 5 is worth quoting together:

> I had to fix up every PR because the quality was average, so not sure how I feel about gpt 6 now lol
>
> But the findings were good

That is his account of the workload. The retained-commit counts below measure a narrower fact and should accompany it. The [backchannel notes](backchannel.md) preserve the chronology and source image for each quote.

## When the PRs arrived

| Date opened | Opened | Eventually merged | Closed without merging |
| ----------- | -----: | ----------------: | ---------------------: |
| August 28   |      1 |                 1 |                      0 |
| September 2 |     91 |                90 |                      1 |
| September 3 |     84 |                74 |                     10 |
| September 4 |     31 |                30 |                      1 |
| Total       |    207 |               195 |                     12 |

That is **206 PRs opened on September 2 through September 4**, plus the earlier RcMap fix, [#7516](https://github.com/Effect-TS/effect/pull/7516). The concentrated batch accounts for 194 merges and all 12 unmerged closures.

Merges arrived on August 30 and September 2 through September 5. September 3 alone had 99. Median creation-to-merge time was **6 hours, 48 minutes, 18 seconds**. The fastest took about ten minutes; the slowest took about 56.5 hours. These are elapsed times, not measurements of review effort.

## Who did the integration work

| Merger                    |                                            Kit PRs merged |
| ------------------------- | --------------------------------------------------------: |
| Tim Smart, `tim-smart`    |                                                       193 |
| Giulio Canti, `gcanti`    | 1, [#7870](https://github.com/Effect-TS/effect/pull/7870) |
| Sebastian Lorenz, `fubhy` | 1, [#7920](https://github.com/Effect-TS/effect/pull/7920) |

The retained branch histories contain maintainer-authored commits in **185 of 195 merged PRs**. Tim appears in 184; Giulio appears in one. Those histories contain 549 commit records: 379 attributed to Tim, 169 to Kit, and one to Giulio.

In 28 merged PRs, every commit still visible on the PR branch is attributed to Tim. There are also recorded force pushes on 102 merged PRs. Rewritten history matters here. GitHub's current commit list is evidence of the retained integration work, not a complete transcript of the original submission or a reliable measure of who wrote every line. Account attribution also does not establish whether a person used an agent to produce a commit.

Only ten merged PRs have exclusively Kit-authored commits in their retained histories: [#7576](https://github.com/Effect-TS/effect/pull/7576), [#7585](https://github.com/Effect-TS/effect/pull/7585), [#7594](https://github.com/Effect-TS/effect/pull/7594), [#7595](https://github.com/Effect-TS/effect/pull/7595), [#7596](https://github.com/Effect-TS/effect/pull/7596), [#7598](https://github.com/Effect-TS/effect/pull/7598), [#7605](https://github.com/Effect-TS/effect/pull/7605), [#7606](https://github.com/Effect-TS/effect/pull/7606), [#7615](https://github.com/Effect-TS/effect/pull/7615), and [#7804](https://github.com/Effect-TS/effect/pull/7804). That does not mean nobody reviewed them.

## Cases worth telling in the post

### The first RcMap fix still left a timer alive

[#7516](https://github.com/Effect-TS/effect/pull/7516) protects a replacement resource from cleanup belonging to an invalidated predecessor. It covers zero, finite and infinite idle TTLs.

Tim [asked whether the change leaked running fibers](https://github.com/Effect-TS/effect/pull/7516#discussion_r3886123122). It did: an already-running finite-TTL timer could stay asleep after its resource scope closed. His [follow-up commit](https://github.com/Effect-TS/effect/commit/76ecd2d40f) interrupts the idle fiber before external scope closure and checks immediate interruption in the regression test.

There is a downstream connection to OpenCode. [anomalyco/opencode#46074](https://github.com/anomalyco/opencode/pull/46074) proposes backporting the RcMap fix for Location-service cleanup. That PR reports a synthetic 1,000-cycle resource test dropping retained heap from roughly 1,005 MiB to 4.56 MiB. Those are the backport author's measurements, not production-server savings or measurements repeated for this report. The backport remains open and was proposed before Effect merged #7516.

### A bug report can lead to a different API

Three merged PRs are particularly clear examples:

- [#7657](https://github.com/Effect-TS/effect/pull/7657) began as a fix for `Channel.runDone` returning the wrong completion value. Tim [asked to remove it](https://github.com/Effect-TS/effect/pull/7657#discussion_r3919950524) because `runDrain` already does the job. The merged PR removes the API and updates its documentation and migration guidance.
- [#7915](https://github.com/Effect-TS/effect/pull/7915) reported an `Effectable.Class` evaluation loop. Tim [requested an abstract `asEffect()` method](https://github.com/Effect-TS/effect/pull/7915#discussion_r3930743451) instead of the original override mechanism. The later [#7907](https://github.com/Effect-TS/effect/pull/7907) adds `Effectable.Mixin` using that same evaluation contract.
- [#7987](https://github.com/Effect-TS/effect/pull/7987) proposed restricting `Multipart.isPart` to streamed parts. Tim [kept the existing broad guard](https://github.com/Effect-TS/effect/pull/7987#discussion_r3930780970) and added `isStreamPart` as a separate API.

These PRs count as merges, but the original proposed change and the final public contract differ.

### Review found more edge cases

| PR                                                     | What changed during review                                                                                                                                                     |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [#7604](https://github.com/Effect-TS/effect/pull/7604) | Tim corrected overlapping Pool reservations and usage-TTL reclamation, beyond the initial borrower-release fix.                                                                |
| [#7627](https://github.com/Effect-TS/effect/pull/7627) | Header redaction had to preserve the caller's regex cursor as well as match repeated global/sticky patterns. The final implementation uses `String.search`.                    |
| [#7693](https://github.com/Effect-TS/effect/pull/7693) | CORS review added wildcard, preflight and rejected-origin cases, then shared Vary handling with compression.                                                                   |
| [#7864](https://github.com/Effect-TS/effect/pull/7864) | The exclusive-upper-bound fix expanded from `Random.nextBetween` to `Crypto.randomBetween` through a shared floating-point calculation.                                        |
| [#8016](https://github.com/Effect-TS/effect/pull/8016) | Tim found further unsafe `Effect.try`/`tryPromise` overload calls, tightened direct versus mapped calls, and removed mapped error defaults.                                    |
| [#8020](https://github.com/Effect-TS/effect/pull/8020) | Suspending a throwing use callback needed to preserve the existing acquisition mask. Tim corrected that interaction.                                                           |
| [#8047](https://github.com/Effect-TS/effect/pull/8047) | The initial Markdown-fence fix could itself overflow the stack on many backtick runs. Tim replaced the calculation with an iterative helper shared by fences and inline spans. |
| [#8049](https://github.com/Effect-TS/effect/pull/8049) | Tim extended the Markdown TypeScript fix to MDX and checked native execution, imports, source maps and assertion composition.                                                  |

### Maintaining the tests was a large part of the work

The same review requests recur: move the regression into its owning suite, remove a standalone fixture, reduce a generated matrix, keep the test that fails for the reported bug.

Examples include the [libSQL transaction test](https://github.com/Effect-TS/effect/pull/7829#discussion_r3929251047), the [Deno Redis test](https://github.com/Effect-TS/effect/pull/7833#discussion_r3929281727), and [three separate Sharding test files](https://github.com/Effect-TS/effect/pull/7906#discussion_r3929387302).

[#8045](https://github.com/Effect-TS/effect/pull/8045) is easy to explain in the post. Tim replaced a standalone 90-case CRLF matrix with three cases in the existing migration-document suite. [#8030](https://github.com/Effect-TS/effect/pull/8030) ended with two focused type tests rather than added runtime fixtures for a declaration-only correction.

Eleven merged PRs have no test or type-test file changes in the actual merge commit: [#7724](https://github.com/Effect-TS/effect/pull/7724), [#7728](https://github.com/Effect-TS/effect/pull/7728), [#7788](https://github.com/Effect-TS/effect/pull/7788), [#7866](https://github.com/Effect-TS/effect/pull/7866), [#7874](https://github.com/Effect-TS/effect/pull/7874), [#7937](https://github.com/Effect-TS/effect/pull/7937), [#7941](https://github.com/Effect-TS/effect/pull/7941), [#7947](https://github.com/Effect-TS/effect/pull/7947), [#7969](https://github.com/Effect-TS/effect/pull/7969), [#7973](https://github.com/Effect-TS/effect/pull/7973), and [#8043](https://github.com/Effect-TS/effect/pull/8043). Their histories show test deletions before merge. This measures what landed; it does not mean nobody ran tests.

## What happened after merge

Six merged PRs have a later change directly traceable to code, tests, or documentation they introduced. The sixth came from following the Bun report in the supplied screenshots. These follow-ups have different purposes, so they should not be combined into a "regression rate."

| Original PR                                                                     | Later PR                                                            | What the later change does                                                                                                                                                           | Evidence of the relationship                                                                                                                                                                                              |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#7603](https://github.com/Effect-TS/effect/pull/7603), PubSub                  | [#7607](https://github.com/Effect-TS/effect/pull/7607), September 2 | Fixes `pollUpTo` confusing a published `MutableList.Empty` value with an empty subscription. Strengthens unsubscribe/resubscribe coverage.                                           | The PR explicitly says "Follow-up to #7603" and replaces the newly introduced sentinel check. It merged 11 minutes and 42 seconds after #7603.                                                                            |
| [#7661](https://github.com/Effect-TS/effect/pull/7661), JSON Schema references  | [#7823](https://github.com/Effect-TS/effect/pull/7823), September 3 | Giulio centralizes URI-fragment parsing/formatting in `JsonPointer`, reuses it in `JsonSchema`, and rejects malformed local callback references.                                     | The diff replaces #7661's local formatting and alias-rewrite code, including its malformed-token fallback.                                                                                                                |
| [#7780](https://github.com/Effect-TS/effect/pull/7780), Optic indices           | [#7855](https://github.com/Effect-TS/effect/pull/7855), September 3 | Giulio replaces the inline index validator with `Array.isCanonicalArrayIndex` and applies the shared rule to SchemaGetter bracket paths.                                             | The diff replaces the exact validation expression added by #7780. This is shared implementation work, not proof the original Optic fix failed.                                                                            |
| [#7748](https://github.com/Effect-TS/effect/pull/7748), tool-result encoding    | [#8106](https://github.com/Effect-TS/effect/pull/8106), September 7 | Tim applies success/failure branch selection to Response codecs and shares a complete failure schema with Toolkit. Denied/interrupted executions and `AiError` must also round-trip. | The diff replaces #7748's separate failure/AiError encoder choice. Response serialization is a further boundary, not evidence that #7748 introduced the original Response bug.                                            |
| [#7768](https://github.com/Effect-TS/effect/pull/7768), generated form requests | [#7845](https://github.com/Effect-TS/effect/pull/7845), September 3 | Sebastian replaces the generated-client test compiler with Rolldown while expanding Bun CI coverage and moving runners to Namespace.                                                 | The backchannel reports the Bun failure and links this repair. Commit `d119b0a38a` replaces the Node/Babel test helper introduced by #7768. The later passing report tested a revision that already contained the repair. |
| [#7987](https://github.com/Effect-TS/effect/pull/7987), multipart guards        | [#8105](https://github.com/Effect-TS/effect/pull/8105), September 7 | Repairs JSDoc section formatting so the full documentation check passes.                                                                                                             | Git blame attributes the affected `isPart` paragraph to #7987. The same follow-up also fixes a ChildProcess paragraph from other work.                                                                                    |

There is also related later work that should be described on its own terms:

- [#7913](https://github.com/Effect-TS/effect/pull/7913) fixes nested HttpRouter prefix ordering. Kit's [#7689](https://github.com/Effect-TS/effect/pull/7689) fixed trailing-slash metadata and explicitly left nested ordering unchanged.
- [#8067](https://github.com/Effect-TS/effect/pull/8067) adds Rpc's missing sixth requirements parameter in AtomRpc's query type. The omission already existed before Kit's middleware-error fix, [#7963](https://github.com/Effect-TS/effect/pull/7963).
- [#7954](https://github.com/Effect-TS/effect/pull/7954) adds per-call SSE decoding options to HttpApiClient and AtomHttpApi. It is a feature extension alongside [#7965](https://github.com/Effect-TS/effect/pull/7965), not a repair to that PR's stream-result types.
- [#8079](https://github.com/Effect-TS/effect/pull/8079) remains open. It references the Markdown/MDX doctest fix while updating MCP examples and asking how to mark fences for execution.
- [#7770](https://github.com/Effect-TS/effect/pull/7770)'s multipart regression reused #7768's generated-client test helper. #7845 also updates that caller to await the new Rolldown compilation. The [backchannel analysis](backchannel.md#1038-am-through-114-pm-image-5) traces the helper repair and the tested revisions.

The per-PR appendix records these distinctions. A later edit to the same file, by itself, does not establish a causal follow-up.

## The 12 closed, unmerged PRs

### Two explicitly replaced implementations

| Kit PR                                                                                                     | Closure                                                                                                                     | Replacement and outcome                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#7877, transformed template-literal arbitrary generation](https://github.com/Effect-TS/effect/pull/7877)  | Giulio closed it September 6, ["in favor of" #8094](https://github.com/Effect-TS/effect/pull/7877#issuecomment-5561012990). | [#8094](https://github.com/Effect-TS/effect/pull/8094) merged September 6. It separates template validation from codec parsing, rejects transformed parts in `TemplateLiteral`, and retains transformations and service requirements in `TemplateLiteralParser`. This changes the contract instead of adopting Kit's encoding-based arbitrary fix.          |
| [#7879, index-signature arbitrary generation and shrinking](https://github.com/Effect-TS/effect/pull/7879) | Giulio closed it September 6, ["in favor of" #8095](https://github.com/Effect-TS/effect/pull/7879#issuecomment-5562196784). | [#8095](https://github.com/Effect-TS/effect/pull/8095) merged September 7. It validates index constraints and specializes scalar generation for matching constraints, addressing productive generation as well as invalid samples and shrinks. Kit's proposal explicitly allowed size-zero discard exhaustion rather than constructing those intersections. |

### Ten closures without a recorded explanation

Tim closed each of these. Both the PR and its linked issue were checked. The public record does not establish whether the reason was policy, performance, scope, duplicate work, or disagreement with the bug report.

| PR                                                     | Proposed correction                                                          | Closed UTC            | Review work visible before closure                                                                                                                                         |
| ------------------------------------------------------ | ---------------------------------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#7597](https://github.com/Effect-TS/effect/pull/7597) | Register requests before synchronous resolver delays execute an empty batch. | September 2, 02:42:41 | One Kit-authored commit. Linked [issue #7589](https://github.com/Effect-TS/effect/issues/7589) has no explanatory comment.                                                 |
| [#7786](https://github.com/Effect-TS/effect/pull/7786) | Treat corresponding NaNs as equal in floating-point typed arrays.            | September 3, 04:37:55 | Tim revised the implementation to reuse element equality. [Issue #7785](https://github.com/Effect-TS/effect/issues/7785).                                                  |
| [#7792](https://github.com/Effect-TS/effect/pull/7792) | Preserve inherited methods supplied to Layer.mock.                           | September 3, 04:31:36 | Tim added a reproduction and trimmed mock coverage. [Issue #7791](https://github.com/Effect-TS/effect/issues/7791).                                                        |
| [#7794](https://github.com/Effect-TS/effect/pull/7794) | Avoid an invented then method that leaves native Promise resolution pending. | September 3, 04:13:13 | Tim narrowed the mocked-thenable regression. [Issue #7793](https://github.com/Effect-TS/effect/issues/7793).                                                               |
| [#7891](https://github.com/Effect-TS/effect/pull/7891) | Prevent delimiter collisions between entity teardown keys.                   | September 3, 22:49:52 | Tim removed teardown-journal debug output. [Issue #7890](https://github.com/Effect-TS/effect/issues/7890).                                                                 |
| [#7896](https://github.com/Effect-TS/effect/pull/7896) | Resolve AI-docgen links relative to the output document.                     | September 3, 20:24:44 | Retained Tim-authored reproduction/fix commits also normalize parent link paths. [Issue #7895](https://github.com/Effect-TS/effect/issues/7895).                           |
| [#7917](https://github.com/Effect-TS/effect/pull/7917) | Continue scope cleanup after a finalizer callback throws.                    | September 3, 22:54:35 | Retained Tim-authored implementation and strengthened defect tests. [Issue #7916](https://github.com/Effect-TS/effect/issues/7916).                                        |
| [#7926](https://github.com/Effect-TS/effect/pull/7926) | Make literal trim types cover native ECMAScript whitespace.                  | September 3, 22:39:51 | Tim reduced whitespace regression coverage. [Issue #7925](https://github.com/Effect-TS/effect/issues/7925).                                                                |
| [#7949](https://github.com/Effect-TS/effect/pull/7949) | Release SQLite-WASM memory-stream cursors on early exit.                     | September 4, 02:22:10 | Tim narrowed the cursor-lock regression. [Issue #7948](https://github.com/Effect-TS/effect/issues/7948).                                                                   |
| [#8003](https://github.com/Effect-TS/effect/pull/8003) | Stop forwarding internal continuation arguments into public unary callbacks. | September 5, 02:33:46 | Tim reduced the matrix, fixed further callback adapters and removed an unused continuation before closing. [Issue #8002](https://github.com/Effect-TS/effect/issues/8002). |

Nine of these ten have retained maintainer-authored commits. Closing a PR came after review work in those cases.

## What the numbers support for the article

The story starts with a Queue bug and Tim's "I shall take your tokens." It ends with 207 submitted PRs, 195 merges, maintainer-authored commits retained in 185 merged branches, and Tim's "But the findings were good." The backchannel gives us the account of the people doing the work, alongside the runtime failures, declaration bugs, parser errors, resource leaks, and tooling defects in GitHub.

The 94.2% merge rate measures PR outcomes. It cannot be presented as "94.2% of Astra's patches were correct as submitted." Several accepted PRs needed more work; some changed APIs; two unmerged proposals led to other implementations. The backchannel identifies Astra with the audit. The repository records Kit as the submitter and does not provide an agent-by-agent history of each original patch.

For a first draft, the RcMap timer, the removal of runDone, the PubSub follow-up, the Bun investigation, the two replaced Arbitrary PRs, and the test reductions provide enough detail to make the numbers understandable.

The remaining questions are how Kit configured the audit, how Tim's review agents worked, and why the ten unexplained PRs were closed. Sebastian asks Kit about a multi-pass setup in the screenshots, but the answer is not visible. The backchannel supplies the origin, the stopping point, and Tim's assessment of the review workload.

## Sources and method

1. Queried all PRs in `Effect-TS/effect` authored by `kitlangton` and created in the exact two-week window, across all states. The result was 207, below the 1,000-result query limit. The calendar-date query beginning August 24 produced the same cohort.
2. Fetched every PR's description, dates, merge metadata, changed files, retained commits, issue comments, reviews, inline review threads, and timeline cross-references/force pushes. None of those connections required an additional page.
3. Read descriptions and commit histories for all 207. Read the linked issues for all 12 unmerged PRs to look for closure explanations. Routine changeset and bundle-size bot comments were excluded from the narrative.
4. Inspected 373 commits on `main` since August 24 and queried 461 recently updated repository PRs across all authors. Cross-references and source-file overlap identified later changes for closer review. Checked the relevant diffs and used blame where the relationship depended on who introduced a line.
5. Compared candidate follow-ups with the original change. The later non-cohort commits touched source files from 62 merged Kit PRs; most overlap was unrelated work. The appendix uses "No specific later follow-up identified" for the bounded search result, not as a guarantee that no later edit exists.
6. Verified the eleven no-test-change cases against their actual merge commits, since PR descriptions can still mention fixtures removed during review. Test results quoted in descriptions remain their authors' reports; this research did not rerun Effect's test suites.
7. Read the twelve supplied backchannel screenshots. Followed their #7768/#7845 Bun exchange through the actual merge and branch diffs, including test files outside the original source-file overlap search. Verified that #7845's merge is an ancestor of the revision in the shared passing-test report. Added the resulting test-helper follow-up to #7768 and the shared-helper note to #7770.

Main history was checked through [`5a802043984727b0c5a291af39d1b9bbfa8d7b8b`](https://github.com/Effect-TS/effect/commit/5a802043984727b0c5a291af39d1b9bbfa8d7b8b), the merge of #8095 at September 7, 06:10:49 UTC.

Reproduce the cohort with GitHub CLI:

```sh
gh pr list --repo Effect-TS/effect --author kitlangton --state all \
  --search 'created:>=2026-08-24T09:14:53Z created:<=2026-09-07T09:14:53Z' \
  --limit 1000 \
  --json number,title,state,createdAt,mergedAt,closedAt,url,mergeCommit
```

PR states and descriptions can change after this snapshot. The CSV retains the researched state and commit identifiers.
