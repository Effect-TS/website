# Effect Website

The public web application, documentation site, and interactive TypeScript editing surfaces for Effect.

## Language

**Playground**:
The existing Monaco-based code editing and execution environment at `/play`, which the Scratchpad is set to replace.
_Avoid_: Editor, sandbox, scratchpad

**Scratchpad**:
The CodeMirror-based multi-file TypeScript editing and execution surface at `/scratchpad`, and the Playground's successor.
_Avoid_: Lite playground, mini playground, editor

**Workspace**:
The mutable tree of source files and directories backing an editing surface, separate from editor UI state like open tabs or cursor positions.
_Avoid_: Project, file tree, virtual disk

**Container**:
The in-browser Node.js runtime (a WebContainer) that installs a Workspace's dependencies and executes its code, mirroring the Workspace rather than owning it.
_Avoid_: Sandbox, VM, runtime

**Run**:
One execution of the Workspace's entry file inside the Container, started by the editing surface and replaced by the next Run.
_Avoid_: Build, job, session

**Share**:
A short link that restores a Workspace, in the format both the Playground and the Scratchpad read.
_Avoid_: Permalink, snippet, gist
