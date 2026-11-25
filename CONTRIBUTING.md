# Contributing to Effect Website

## Preview Deployments

Same-repo pull requests from collaborators with `write`, `maintain`, or `admin` access get automatic previews from `.github/workflows/preview.yml`.

For fork PRs (or PRs from authors without write access) targeting `main`, `.github/workflows/requested-preview.yml` pauses at the `fork` GitHub environment until a required reviewer clicks **Review deployments** and approves that run's commit.

### How approval-gated previews work

1. **Fail-closed gate:** Before entering the `fork` environment, the workflow verifies that `fork` exists and has required reviewers configured. If protection is missing, no approval job runs and nothing deploys.
2. **Per-commit approval:** Each push creates a workflow run pinned to that push's head SHA and supersedes any older waiting approval for the PR. Pushing new commits requires a new approval.
3. **Isolated build and publish:** After approval, the workflow creates a `Requested Preview` GitHub Deployment for the approved SHA, builds the commit without secrets and with a read-only cache, validates the artifact, and publishes from trusted `main` code.
4. **Status and cleanup:** Reports progress, the preview URL (via **View deployment** and a PR comment), or failure links on the PR. Closing the PR destroys the preview Worker and D1 database and marks its deployments inactive.

### Limitations

Requested previews run contributor code without production credentials:

- **Search and playground share links** return errors (they require production credentials).
- **PostHog analytics and search overlay stores** are disabled.
- **Older PR branches** must merge `main` first so `apps/web/scripts/build-preview.ts` exists on the branch.
- **Review the diff before approving:** approving a deployment runs contributor code on Effect's `workers.dev` subdomain without making it trusted.
