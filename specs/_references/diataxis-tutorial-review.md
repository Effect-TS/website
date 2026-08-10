# Diátaxis review of the v4 tutorials

## Scope

This review covers the seven current pages under
`apps/web/src/content/docs/v4/tutorials` and the shared static fixture
`apps/web/public/tutorials/order-processing/providers.ts`. It evaluates the
pages as tutorials, not the correctness of their Effect APIs. The tutorials
were not modified.

The only external source used is the official Diátaxis site.

## Diátaxis criteria

Diátaxis defines a tutorial as a guided, practical, learning-oriented
experience: the learner does something meaningful toward an achievable goal in
order to acquire skill and knowledge
([Tutorials](https://diataxis.fr/tutorials/#tutorials)). The author is
responsible for making that experience meaningful, successful, logical and
usefully complete
([Obligations of the teacher](https://diataxis.fr/tutorials/#obligations-of-the-teacher)).

This review applies the following official principles:

| Criterion                 | Diátaxis requirement                                                                                                                                                                                                                                                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Visible destination       | Show from the start what “we will” accomplish and encounter, without promising “you will learn” ([Show the learner where they’ll be going](https://diataxis.fr/tutorials/#show-the-learner-where-theyll-be-going)).                                                                                                                                                |
| Early, frequent results   | Each step should produce a small, meaningful and comprehensible visible result ([Deliver visible results early and often](https://diataxis.fr/tutorials/#deliver-visible-results-early-and-often)).                                                                                                                                                                |
| Narrative of the expected | State what should happen, show representative or exact output and flag likely surprises or failures ([Maintain a narrative of the expected](https://diataxis.fr/tutorials/#maintain-a-narrative-of-the-expected)).                                                                                                                                                 |
| Observation               | Prompt the learner to notice the connection between an action and its effect ([Point out what the learner should notice](https://diataxis.fr/tutorials/#point-out-what-the-learner-should-notice)).                                                                                                                                                                |
| Small, concrete steps     | Lead from this problem, to this action, to this result; let abstractions emerge from concrete encounters ([Focus on the concrete](https://diataxis.fr/tutorials/#and-focus-on-the-concrete)).                                                                                                                                                                      |
| Continuity                | Purpose, action, thought and result should form a coherent “feeling of doing” ([Target the feeling of doing](https://diataxis.fr/tutorials/#target-the-feeling-of-doing)).                                                                                                                                                                                         |
| Repeatability             | Let learners repeat successful steps and results wherever possible ([Encourage and permit repetition](https://diataxis.fr/tutorials/#encourage-and-permit-repetition)).                                                                                                                                                                                            |
| Minimal explanation       | Give only the explanation needed at the moment of action and link elsewhere for deeper treatment ([Ruthlessly minimise explanation](https://diataxis.fr/tutorials/#ruthlessly-minimise-explanation)).                                                                                                                                                              |
| One route                 | Ignore options, alternatives and diversions; guide the learner along one line to success ([Ignore options and alternatives](https://diataxis.fr/tutorials/#ignore-options-and-alternatives)).                                                                                                                                                                      |
| Reliability and setup     | Manufacture a safe, restartable encounter in which the unexpected is eliminated and every promised result can occur ([Tutorial versus how-to](https://diataxis.fr/tutorials-how-to/#understanding-the-distinction), [Aspire to perfect reliability](https://diataxis.fr/tutorials/#aspire-to-perfect-reliability)).                                                |
| Tutorial, not how-to      | A tutorial provides a managed learning experience; a how-to directs an already-competent user’s real work. Advanced subject matter can still be a tutorial ([Understanding the distinction](https://diataxis.fr/tutorials-how-to/#understanding-the-distinction), [The basic and the advanced](https://diataxis.fr/tutorials-how-to/#the-basic-and-the-advanced)). |

Diátaxis also recommends “we”, unambiguous sequential imperatives, explicit
expected output, prompts such as “notice” and “let’s check”, and a closing
description of what the learner accomplished
([The language of tutorials](https://diataxis.fr/tutorials/#the-language-of-tutorials)).

## General assessment

The revision is substantially closer to Diátaxis than a live-provider design.
The collection now has one concrete backend domain, controlled inputs, local
HTTP endpoints and observable outcomes. Most numbered stages ask the learner to
run a command, show the expected response or log and immediately identify the
behavior to notice. The pages are predominantly study-oriented rather than
production recipes.

The main remaining structural problem has moved to the beginning of each page.
Six tutorials ask the learner to copy a complete server or program before the
first numbered action or visible result. The learner observes and perturbs an
already-finished implementation rather than building the target competence
through small steps. The later checkpoints are often good tutorial exercises,
but the initial code dump weakens early success, continuity and useful
completeness.

### Strong common patterns

- Every page states a concrete backend destination near the start. The
  concurrency, Layer and tracing pages also provide a compact diagram.
- The order-processing scenario is specific and meaningful. It reduces context
  switching across the collection.
- Controlled tokens, postal codes, delays and local files make failure,
  cancellation, timeout, retry and replacement observable without abusing a
  public service.
- Most actions have representative output followed by a short cause/effect
  observation.
- The prose generally uses direct instructions and “we”, and every page ends
  with **What you built**.
- Explanations are usually short and adjacent to the behavior they interpret.
- Repeating `curl` requests is cheap, and server restart gives most exercises a
  practical recovery path.

### Common deviations

#### 1. Success comes after a large setup, not early

The retry, concurrency, cleanup, JSON, Layer and tracing pages present most or
all of the solution before the learner runs anything. This makes “Setup” the
largest conceptual step and delays the first confidence-building result.

The fixture appropriately hides provider mechanics, but the server code still
introduces routing, Schema, errors, services, Layers and runtime assembly before
the page focuses on its one topic. Copying this code is an action, but it is not
a sequence of concrete encounters through which the learner sees the target
mechanism take shape.

**Editorial implication:** provide a minimal runnable starter as a download, or
build only the topic-specific part cumulatively. If a starter is used, describe
it explicitly as given infrastructure and keep the visible code in the lesson
limited to what the learner will change and observe.

#### 2. Setup is controlled but not fully reproducible

The pages do not establish an isolated directory, initialize `package.json` or
`tsconfig.json`, state the required Node version, or pin `effect` and
`@effect/platform-node`. Yet they run `.ts` files directly with Node and import
unstable modules. Port `3000` is assumed to be free; the tracing tutorial also
assumes `4318` is free. Most pages do not say how to stop or reset the server.

The same filename, `server.ts`, is used by several independent tutorials
without saying whether each page needs a new directory. A learner following the
collection in one directory could overwrite the previous exercise.

**Editorial implication:** define a pinned starter environment for the
collection, assign one working directory per tutorial and include explicit
start, stop and reset instructions. This is part of the author’s responsibility
for success, not incidental installation detail.

#### 3. Some sections explain code without producing an observation

The concurrency section about independent branches, the JSON section about
`toCodecJson`, and the tracing section about exporter isolation mainly point at
finished code and explain it. The Layer type-check section asks for a useful
edit but does not provide a concrete check command or expected diagnostic.

**Editorial implication:** either turn each essential idea into one observable
action/result loop or move the explanatory discussion to the relevant concept
page and link to it.

#### 4. Conclusions sometimes exceed the exercised evidence

Several pages claim behavior for defects, caller interruption, child
interruption or replaceable exporters that the learner does not actually test.
These claims may be correct, but Diátaxis favors an encounter over an assertion.

**Editorial implication:** demonstrate essential claims with a small controlled
checkpoint; otherwise narrow **What you built** and link to explanation or
reference.

## Does `providers.ts` solve the provider problem?

Largely, yes. It is a good tutorial fixture.

It removes runtime network dependency, supplies named deterministic triggers
(`tok_flaky`, `tok_declined`, `tok_slow`, `SLOW`, `INVALID`, `OUTAGE`), makes
timing and failures repeatable enough to observe, and keeps provider
implementation details out of the main lesson. Because tutorial code imports a
small service contract and Layer rather than embedding a fake HTTP system, the
fixture generally does not shift focus away from retry, concurrency, cleanup,
Layers or tracing.

It does not solve every reliability issue:

- `PaymentProviderFixture` keeps attempt counts in a `Ref`. It deletes a count
  after success, but not after decline or interruption. Repeating the same
  declined request can log “attempt 2” even though the new request was not
  retried. The behavior remains correct, but the pedagogical signal becomes
  ambiguous.
- The cleanup tutorial’s in-memory inventory intentionally retains stock after
  success. Its exact “8 left / 6 left / 8 available” narrative depends on a
  fresh server and the prescribed order. Repeating the success step eventually
  changes the output and then fails for lack of stock.
- The learner still has to download and place the fixture correctly, and the
  tutorial does not offer an exact download command or import-error
  troubleshooting cue.

The fixture therefore fixes the previous public-provider problem without
becoming the subject of the tutorials, but its state-reset semantics and the
surrounding project setup still need work for Diátaxis-level repeatability.

## Findings by page

### `retry-only-failures-that-can-recover.mdx`

**What works**

- The destination is immediate and precise: build `POST /orders` so temporary
  provider failures retry and payment declines fail immediately.
- The three inputs form a logical sequence: recoverable outage, permanent
  business decision, then per-attempt timeout.
- HTTP responses and authorization-attempt logs make the policy observable.
  The decline genuinely shows one attempt during the first run.
- The static payment fixture makes all three outcomes local and controlled.

**Findings**

- The complete retry implementation appears in Setup, so the learner never
  constructs or changes the policy. The numbered lesson is primarily a guided
  demonstration of finished code.
- The explanation of `exponential`, `jittered` and `upTo` arrives together after
  the first result; only the retry count is actually visible. Exponential delay
  and jitter are not observed.
- Repeating the declined token with the same customer id advances the fixture’s
  retained attempt counter, weakening the “only one attempt appears” narrative.
- Defect and request-interruption behavior is stated at the end but not
  exercised.

**Editorial direction:** make the starter endpoint run once without retry, then
have the learner add the error filter, bound and timeout in three executable
edits. Reset the fixture counter per request or log a request-local attempt.

### `structured-concurrency-built-in.mdx`

**What works**

- The destination and ASCII diagram clearly show bounded line work, concurrent
  shipping, ordered results and one deadline.
- The controlled line delays produce a strong first observation: completion
  order differs from response order while only two jobs start at once.
- Changing concurrency from `2` to `1`, restarting and sending the same request
  is a valuable repeat-and-compare exercise.
- `SLOW` provides a deterministic timeout path.

**Findings**

- The entire implementation precedes the first action.
- Section 2 does not make shipping overlap visible. The fixture does not log
  shipping start/finish, and the section only rereads `Effect.all`. The learner
  must accept the explanation instead of observing the two branches overlap.
- The `concurrency: 1` checkpoint gives no exact or representative log order,
  then asks the learner to restore the code manually.
- Caller-disconnect propagation is stated but not tested.

**Editorial direction:** start from the sequential endpoint, add the line limit,
then add a logged shipping branch and finally the deadline. Each change can
produce one distinct log pattern without increasing provider complexity.

### `tie-resources-to-operation-lifetimes.mdx`

**What works**

- The destination is concrete, and the two concepts needed to follow it, Scope
  and Exit, are defined briefly.
- Success, typed failure and real caller cancellation are all exercised. The
  exact logs show acquisition, reverse-order release and the absence of a
  payment finalizer when payment acquisition fails.
- The fixture keeps payment behavior deterministic and the cancellation delay
  gives the learner a reliable window to disconnect.
- This page has the strongest match between its title and the behavior the
  learner actually observes.

**Findings**

- A dense complete implementation appears before the first outcome.
- Repeatability is stateful: successful runs keep reservations, so the stock
  numbers and eventually the HTTP result change when the step is repeated.
- The conclusion includes defect handling, but no defect checkpoint exists.
- The learner sees finalizers run but never adds one; this limits acquisition of
  the core `acquireRelease` skill.

**Editorial direction:** provide a minimal inventory/payment harness, have the
learner add each acquisition and finalizer, and expose a fixture reset or restart
before every prescribed output. Demonstrate a defect only if it remains part of
the promised outcome.

### `derive-json-codecs-for-domain-models.mdx`

**What works**

- The page immediately names one local HTTP round trip and one shared Schema as
  its destination.
- The endpoint is fully local and deterministic; the one changing timestamp is
  explicitly identified.
- Response JSON, handler logs and an invalid `OrderId` provide three concrete
  observations: wire compatibility, runtime reconstruction and validation.
- The runtime-type log is especially effective evidence that decoding rebuilt
  domain values.

**Findings**

- The learner begins by copying the finished custom transformation and both
  complete models. The first numbered action sends data; it does not build the
  codec whose use the tutorial is meant to teach.
- Section 3 is mainly explanation of two existing lines. It introduces options
  (string, object or another JSON value; owned versus external contract) rather
  than maintaining one path.
- The custom `OrderId` transformation is the most complex Schema operation in
  the page, but it is not decomposed into a smaller action/result sequence.

**Editorial direction:** begin with one built-in rich field and have the learner
derive and run its JSON codec. Add the custom `OrderId` representation as the
next concrete change, then place both in the HTTP boundary. Move alternative
wire-shape discussion to Schema explanation.

### `keep-dependencies-explicit-without-manual-wiring.mdx`

**What works**

- The opening diagram and sentence make the exact replacement seam visible.
- Primary and backup payment fixtures produce a stable, one-field difference
  while route and business logic stay unchanged.
- Removing `PaymentLive`, restoring it and swapping it is a coherent sequence
  around one service graph.
- Here the shared fixture is particularly effective: it is the interchangeable
  adapter, not unrelated test scaffolding.

**Findings**

- The four-service graph is handed to the learner complete. The learner does not
  build a requirement or Layer before manipulating the final graph.
- The TypeScript-check stage supplies neither a command nor the expected error.
  Setup also does not establish a `tsconfig.json`, so the promised observation
  is not reliable outside an already-configured project.
- Much of the server, Schema and error code is incidental to the Layer lesson.

**Editorial direction:** use a downloadable starter for HTTP/business noise,
then make the visible exercise add one missing service, run an exact type-check
command, complete the graph and replace the Layer.

### `instrument-applications-for-opentelemetry-without-the-plumbing.mdx`

**What works**

- The page shows the intended waterfall as an ASCII diagram before setup.
- Controlled delays and the flaky token create deterministic overlap and retry
  spans. No live business provider can change the trace shape.
- Instructions tell the learner exactly where to click and list three bar
  relationships to notice. This closely follows Diátaxis’s observation
  guidance.
- The empty-viewer → first waterfall → retry waterfall progression is repeatable
  and meaningful.

**Findings**

- The fully instrumented server is copied before the learner opens the viewer;
  no step lets the learner add a span and observe the resulting difference.
- Aspire remains an external moving part. Although its CLI is pinned, the page
  assumes free ports, successful download, the documented UI layout and three
  terminals. It gives no troubleshooting, shutdown or reset instructions.
- A graphical destination would be clearer as an actual screenshot; the ASCII
  diagram establishes hierarchy but not the Aspire UI the learner must navigate.
- Section 4 explains exporter isolation without asking the learner to replace or
  inspect an exporter. Span closure after defect/interruption is also asserted,
  not observed.

**Editorial direction:** start with an uninstrumented local endpoint, add the
root span, then child and retry-attempt spans one at a time. Include a pinned UI
image plus start/health/stop checks for the dashboard. Leave exporter replacement
as linked explanation or a separate how-to.

### `keep-ai-generated-code-under-control.mdx`

**What works**

- The page states a bounded backend task and names the role of diagnostics in
  review.
- `orders.json`, the captured bad patch, the four-rule table, corrected service
  and final endpoint provide concrete artifacts.
- Running diagnostics before and after correction can create a meaningful
  evidence loop. The captured patch is a useful deterministic teaching asset.

**Findings**

- The required path begins with an unspecified “normal AI coding agent”. Model,
  version, repository context and output are uncontrolled, so the next action
  branches immediately.
- The page explicitly offers multiple routes: use the agent’s clean patch, fix
  different problems first, or reproduce the captured four mistakes. This
  contradicts the single managed path expected of a tutorial.
- The learner must decide whether the AI’s design is acceptable, feed back
  diagnostics and request smaller diffs. That transfers responsibility to a
  learner who may not yet have the competence the lesson is meant to develop.
- The prompt says “this Effect backend”, but Setup creates no starter backend.
  `oxlint .` may report unrelated files, and the exact four diagnostics depend
  on an existing `tsconfig.json` and tool configuration that the page does not
  provide.
- The static provider fixture does not apply to this page, so it does not solve
  these sources of nondeterminism.

**Editorial direction:** make the captured AI patch the one required starting
point and let the learner use diagnostics to repair it through deterministic
steps. A real-agent exercise can follow as an optional lab or a how-to guide,
but it cannot promise the same managed learning experience across agents.

## Tutorial versus how-to conclusion

The order fixture and controlled inputs make six pages recognizably
tutorial-oriented: they manufacture conditions for study and ask the learner to
observe Effect behavior. Their task-shaped titles do not make them how-to guides
by themselves; Diátaxis distinguishes by user need, not difficulty or grammar.

However, these six pages currently function more as guided demonstrations than
lessons in constructing the advertised behavior, because the implementation is
provided before the exercise begins. They can become strong tutorials by
turning the topic-specific code into cumulative actions and relegating generic
backend infrastructure to a starter.

`keep-ai-generated-code-under-control.mdx` remains the exception. Its primary
path is inherently branched and dependent on uncontrolled agent behavior. The
captured patch contains the seed of a reliable tutorial, but the current
real-agent workflow is closer to a how-to or facilitated lab.

## Priority order

1. Provide a pinned, isolated starter environment and one directory per page.
2. Move generic backend code into a starter; let learners construct the
   topic-specific Effect behavior in small runnable changes.
3. Reset fixture state so every documented result can be repeated.
4. Turn explanatory sections into observable checkpoints or link them out.
5. Narrow conclusions to behaviors actually exercised.
6. Make the captured AI patch the canonical path and separate the uncontrolled
   real-agent workflow.

The highest-leverage improvement is not to remove the fixture. It is to keep the
fixture as given infrastructure while making the learner build and observe the
small piece of Effect code each tutorial is actually about.
