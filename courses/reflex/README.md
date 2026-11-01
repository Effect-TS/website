# reflex

Build reflex, a small automation engine, as you work through the Learn Effect course. Rules respond to events or poll a URL, check a condition, and run an action when it matches. A run history records what happened.

This starter provides the tooling and fixtures. You write the application in `src/`, with reference solutions available at each checkpoint.

## Prerequisites

Install these before starting. The course's setup estimate assumes they are already available.

- Node.js 22.16 or newer
- pnpm, installed directly or through `corepack enable`
- git
- a browser
- for the trace viewer, one of: macOS, Linux with glibc 2.39 or newer (Ubuntu 24.04+, Debian 13+, Fedora 40+), or Docker

Windows through WSL2 is untested.

## Get started

1. Copy the starter and enter it:

   ```sh
   npx degit Effect-TS/website/courses/reflex reflex
   cd reflex
   ```

2. Install the dependencies:

   ```sh
   pnpm install
   ```

3. Check your machine and start the trace viewer. Leave this terminal running:

   ```sh
   pnpm run doctor --viewer
   ```

   This command checks your tools and downloads otel-desktop-viewer on first use, if your machine supports its binary. It can use Docker instead on other supported systems. When all checks pass, it prints `All set.` and starts the viewer. Leave it running until you finish using the viewer, then press Ctrl-C to stop it.

   If a check is marked `✗`, follow the installation hint on that line and run the command again.

Keep `run` in `pnpm run doctor`: without it, `pnpm doctor` invokes pnpm's built-in diagnostics instead of the starter's script.

In later sessions, use `pnpm viewer` to start the viewer without repeating the checks. To check your tools without starting the viewer, use `pnpm run doctor`.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm run doctor` | Check Node, pnpm, git and the viewer |
| `pnpm run doctor --viewer` | Download the viewer if needed, check, then start the viewer |
| `pnpm viewer` | Start otel-desktop-viewer v0.6.0: UI on http://localhost:8000, OTLP over HTTP on 4318 |
| `pnpm receiver` | Start the local HTTP receiver on http://localhost:4600 (`--scenario mixed` for lessons 21, 22 and 24) |
| `pnpm dev:server` | Run your server from `src/server/main.ts`, restarting on change (lesson 14 on) |
| `pnpm cli <command>` | Run your CLI from `src/cli/main.ts` (lesson 15 on) |
| `pnpm checkpoint <n> [...args]` | Run the reference solution for lesson `n` (11 to 24) |
| `pnpm lesson <n> [--solution]` | Run a Part 1 lesson file (2 to 10) in the local track |
| `pnpm test` | Run the tests |
| `pnpm check` | Typecheck |
| `pnpm test:course` | Test the Part 1 lesson files as shipped (course CI; fails once you edit them) |
| `pnpm transcript` | Regenerate `checkpoints/24/transcript.txt`, the terminal session the course shows (course maintainers; needs ports 3000 and 4600) |
| `pnpm fmt` | Format the code |

## Directory layout

- `src/`: your application. You write it during the course.
- `tools/`: the doctor, viewer launcher, receiver and runners. The course does not require changes to these files.
- `fixtures/`: rule files and sample events used by the lessons.
- `migrations/`: the SQL schema for lesson 17.
- `lessons/part1/`, `checkpoints/`, `exercises/`: lesson files, reference solutions and exercises.

## The receiver

Use `pnpm receiver` to test rules that call outside services. It starts a local HTTP server on http://localhost:4600 with endpoints for successful responses, errors, and delays:

| Endpoint | Response |
| --- | --- |
| `/ok` | 200 |
| `/slow?ms=2000` | 200 after the delay |
| `/fail?status=500` | the requested status (400 to 599) |
| `/flaky` | 500 and 200 in turn, starting with 500 |
| `GET /status` | `{"status":"ok"}`, `{"status":"degraded"}`, or a 500 |
| `POST /status/mode` | A body of `{"mode":"ok"}`, `{"mode":"degraded"}` or `{"mode":"error"}` changes the response from `/status` |

To make `/status` report `degraded`:

```sh
curl -X POST localhost:4600/status/mode -H 'content-type: application/json' -d '{"mode":"degraded"}'
```
