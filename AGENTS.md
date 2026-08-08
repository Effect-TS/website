# Project Guidelines

- The project uses `direnv` for its development environment.
- Always use `pnpm` for package management and project scripts.
- When running `pnpm` from Codex, run it outside the sandbox so it uses the repository's normal pnpm store. Do not let pnpm recreate `node_modules` from inside the sandbox.
- If pnpm reports `Recreating node_modules` or starts an automatic install before a script, interrupt it immediately. Run `pnpm install --frozen-lockfile` outside the sandbox, then retry the original command outside the sandbox.
