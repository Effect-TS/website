# rulebook

The starter project for the Effect course in which you build rulebook, a small self-hosted automation engine: rules that react to events or poll a URL, run an action, and record every run.

## Prerequisites

Have these ready before you start; the setup time in the course assumes them.

- Node.js 22.16 or newer
- pnpm, installed directly or through `corepack enable`
- git
- a browser
- for the trace viewer, one of: macOS, Linux with glibc 2.39 or newer (Ubuntu 24.04+, Debian 13+, Fedora 40+), or Docker

Windows through WSL2 is untested.

## Get started

```sh
npx degit Effect-TS/website/courses/rulebook rulebook
cd rulebook
pnpm install
pnpm run doctor --viewer    # leave it running
```

`pnpm run doctor --viewer` downloads otel-desktop-viewer on first use, prints one line per requirement, and exits non-zero when something is missing, saying what to install. Once everything passes it starts the viewer and keeps running until you press Ctrl-C. Type `run`: a bare `pnpm doctor` is pnpm's own diagnostics command.

`pnpm run doctor` without the flag only checks. In a later session, `pnpm viewer` starts the viewer again.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm run doctor` | Check Node, pnpm, git and the viewer |
| `pnpm run doctor --viewer` | Download the viewer if needed, check, then start the viewer |
| `pnpm viewer` | Start otel-desktop-viewer v0.6.0: UI on http://localhost:8000, OTLP over HTTP on 4318 |
| `pnpm receiver` | Start the local HTTP receiver on http://localhost:4600 (`--scenario mixed` for lesson 21) |
| `pnpm dev:server` | Run your server from `src/server/main.ts`, restarting on change (lesson 14 on) |
| `pnpm cli <command>` | Run your CLI from `src/cli/main.ts` (lesson 15 on) |
| `pnpm checkpoint <n> [...args]` | Run the reference solution for lesson `n` (11 to 24) |
| `pnpm lesson <n> [--solution]` | Run a Part 1 lesson file (1 to 10) in the local track |
| `pnpm test` | Run the tests |
| `pnpm check` | Typecheck |
| `pnpm fmt` | Format the code |

## What is here

- `src/`: your application. You write it during the course.
- `tools/`: the doctor, the viewer launcher, the receiver and the runners. You never edit these.
- `fixtures/`: rule files and sample events used by the lessons.
- `migrations/`: the SQL schema for lesson 17.
- `lessons/part1/`, `checkpoints/`, `exercises/`: lesson files, reference solutions and exercises.

## The receiver

`pnpm receiver` stands in for the services your rules talk to:

| Endpoint | Answer |
| --- | --- |
| `/ok` | 200 |
| `/slow?ms=2000` | 200 after the delay |
| `/fail?status=500` | the requested status (400 to 599) |
| `/flaky` | 500 and 200 in turn, starting with 500 |
| `GET /status` | `{"status":"ok"}`, `{"status":"degraded"}`, or a 500 |
| `POST /status/mode` | body `{"mode":"ok"}`, `{"mode":"degraded"}` or `{"mode":"error"}` switches `/status` |

```sh
curl -X POST localhost:4600/status/mode -H 'content-type: application/json' -d '{"mode":"degraded"}'
```
