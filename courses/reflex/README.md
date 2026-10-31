# reflex

This is the starter project for the Learn Effect course. In the course you build reflex, a small automation engine. Its rules react to events or poll a URL, run an action, and record every run.

## Prerequisites

Have these ready before you start. The setup time in the course assumes you already have them.

- Node.js 22.16 or newer
- pnpm, installed directly or through `corepack enable`
- git
- a browser
- for the trace viewer, one of: macOS, Linux with glibc 2.39 or newer (Ubuntu 24.04+, Debian 13+, Fedora 40+), or Docker

Windows through WSL2 is untested.

## Get started

```sh
npx degit Effect-TS/website/courses/reflex reflex
cd reflex
pnpm install
pnpm run doctor --viewer    # leave it running
```

`pnpm run doctor --viewer` checks that your machine is ready. On first use it downloads otel-desktop-viewer, the trace viewer the course uses. It prints one line per requirement. If something is missing, it says what to install and exits with a non-zero code. Once everything passes, it starts the viewer and keeps running until you press Ctrl-C.

Make sure you type `run`. A bare `pnpm doctor` runs pnpm's own diagnostics command instead.

Without the flag, `pnpm run doctor` only checks. In a later session, `pnpm viewer` starts the viewer again.

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
| `pnpm lesson <n> [--solution]` | Run a Part 1 lesson file (1 to 10) in the local track |
| `pnpm test` | Run the tests |
| `pnpm check` | Typecheck |
| `pnpm test:course` | Test the Part 1 lesson files as shipped (course CI; fails once you edit them) |
| `pnpm transcript` | Regenerate `checkpoints/24/transcript.txt`, the session lesson 1 opens with (course maintainers; needs ports 3000 and 4600) |
| `pnpm fmt` | Format the code |

## What is here

- `src/`: your application. You write it during the course.
- `tools/`: the doctor, the viewer launcher, the receiver and the runners. You never edit these.
- `fixtures/`: rule files and sample events used by the lessons.
- `migrations/`: the SQL schema for lesson 17.
- `lessons/part1/`, `checkpoints/`, `exercises/`: lesson files, reference solutions and exercises.

## The receiver

Your rules talk to outside services. During the course, `pnpm receiver` stands in for them. It answers these endpoints:

| Endpoint | Answer |
| --- | --- |
| `/ok` | 200 |
| `/slow?ms=2000` | 200 after the delay |
| `/fail?status=500` | the requested status (400 to 599) |
| `/flaky` | 500 and 200 in turn, starting with 500 |
| `GET /status` | `{"status":"ok"}`, `{"status":"degraded"}`, or a 500 |
| `POST /status/mode` | a body of `{"mode":"ok"}`, `{"mode":"degraded"}` or `{"mode":"error"}` switches what `/status` answers |

For example, to make `/status` report `degraded`:

```sh
curl -X POST localhost:4600/status/mode -H 'content-type: application/json' -d '{"mode":"degraded"}'
```
