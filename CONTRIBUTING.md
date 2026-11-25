# Contributing to Effect Website

## Requesting a Preview Deployment

Same-repo pull requests from collaborators with `write`, `maintain`, or `admin` access get automatic previews from `.github/workflows/preview.yml`.

For fork PRs (or PRs from authors without write access), any maintainer with current `write`, `maintain`, or `admin` permission on `Effect-TS/website` can request a preview on an open PR targeting `main`:

```text
/preview
```

To pin the exact commit you reviewed against pushes landing while the job queues, include the full 40-character SHA:

```text
/preview <40-char-sha>
```

### How `/preview` works

1. **Authorization and SHA pinning:** Checks that the commenter has current `write`, `maintain`, or `admin` permission on an open PR targeting `main`. Bare `/preview` uses the PR head at authorization time; `/preview <40-char-sha>` requires an exact match (otherwise the bot replies with both SHAs and deploys nothing). Unauthorized requests are ignored silently. Workflow reruns do not reauthorize earlier comments—post a new `/preview` comment instead.
2. **Isolated build and publish:** Creates a `Requested Preview` GitHub Deployment for the approved SHA, builds the commit without secrets and with a read-only cache, validates the artifact, and publishes from trusted `main` code.
3. **No inherited approval:** Later pushes do not redeploy automatically; comment `/preview` again to deploy a newer commit.
4. **Status and cleanup:** Reports progress, the preview URL (via **View deployment** and a PR comment), or failure links on the PR. Closing the PR destroys the preview Worker and D1 database and marks its deployments inactive.

### Limitations

Requested previews run contributor code without production credentials:

- **Search and playground share links** return errors (they require production credentials).
- **PostHog analytics and search overlay stores** are disabled.
- **Older PR branches** must merge `main` first so `apps/web/scripts/build-preview.ts` exists on the branch.
- **Review the diff before commenting `/preview`:** requesting a preview deploys contributor code on Effect's `workers.dev` subdomain without making it trusted.
