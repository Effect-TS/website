# Project Guidelines

- The project uses `direnv` for its development environment.
- Always use `pnpm` for package management and project scripts.
- When running `pnpm` from Codex, run it outside the sandbox so it uses the repository's normal pnpm store. Do not let pnpm recreate `node_modules` from inside the sandbox.
- If pnpm reports `Recreating node_modules` or starts an automatic install before a script, interrupt it immediately. Run `pnpm install --frozen-lockfile` outside the sandbox, then retry the original command outside the sandbox.
- Use `pnpm` for package management and `vp run` for project tasks.

## Incremental static builds

The site builds with Astro's experimental `incrementalBuild`, so a prerendered
page is only re-rendered when its `cacheKey` or its route's module dependency
hash changes. Things to know when touching a prerendered route:

- **`build.concurrency` must stay at 1.** Astro disables the cache above 1.
- **A new cross-entry read needs a new `cacheKey` fragment.** Under-keying is
  silent — the page keeps its stale HTML with no error. If a page starts
  rendering data about _other_ entries (a sibling's title, a sidebar, a
  referenced collection, a file read off disk), fold that into its key. See
  `apps/web/src/lib/cache-key.ts` and
  `apps/web/src/features/api-reference/cache-key.ts`.
- **`getStaticPaths` only sees imports.** Astro extracts it into its own chunk,
  so it cannot reference other frontmatter declarations — put shared helpers in
  an imported module.
- **`prerenderEnvironment: "node"`** (patched into
  `@alchemy.run/cloudflare-frameworks`) is a correctness precondition: an
  out-of-process workerd prerenderer cannot populate Astro's content and image
  collectors.

To force a full rebuild, delete the cache — `astro build --force` is
unreachable because alchemy invokes the build itself:

```bash
rm -rf apps/web/.astro-cache
```

In CI, run the Production Deployment workflow with `force_full_build: true`.

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Built-in Commands vs Scripts

`vp <name>` runs a built-in command. `vp run <name>` runs a `package.json` script or a `vite.config.ts` task. Scripts cannot overwrite built-ins, so `vp dev` and `vp run dev` may do different things. Check `package.json` and `vite.config.ts` first, and run `vp run <name>` when the project defines a script or task with that name.

## Tool Versions

Run `vp toolchain` to show versions and relationships in the active Vite+
release. Add a tool name to select part of the graph. For example, run
`vp toolchain vite`. Use `--global` to ignore the local `vite-plus` package. Use
`vp why <package>` to show the package-manager dependency graph.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->
