# Contributing to Effect Website

## Requesting a Preview Deployment

Pull requests opened from branches inside `Effect-TS/website` by repository collaborators with `write`, `maintain`, or `admin` access receive automatic previews from `.github/workflows/preview.yml`.

For pull requests from forks (or from authors without repository write access), any maintainer with current `write`, `maintain`, or `admin` permission on `Effect-TS/website` can request a preview by commenting on the open pull request (targeting `main`):

```text
/preview
```

### How `/preview` works

1. **Authorization and SHA pinning:** The workflow verifies that the comment is `/preview` on an open PR targeting `main` and that the commenter currently has `write`, `maintain`, or `admin` repository permission. Unauthorized requests are ignored without posting a comment.
2. **Exact commit deployment:** Once authorized, the workflow records the PR's current head SHA, creates a GitHub Deployment (`Requested Preview`) for that exact SHA, builds the commit in an unprivileged job without secrets and with a read-only Actions cache, and then publishes the validated build artifact from trusted `main` code.
3. **No inherited approval:** Pushing new commits to the PR does not redeploy or reuse approval. The preview stays on the approved SHA until a maintainer comments `/preview` again.
4. **Status reporting:** Progress, the preview URL (via **View deployment** and a PR comment naming the SHA and requester), or a failure link are reported on the pull request and its GitHub Deployment.
5. **Cleanup:** When the pull request is closed, the requested preview Worker, its preview D1 database, and its GitHub Deployment status are cleaned up automatically.

### Limitations of requested previews

Requested previews run contributor code on Cloudflare Workers without access to production credentials:

- **Search and playground share links are disabled** and will return errors, because they require credentials shared with production.
- **PostHog analytics are disabled**, and no Mixedbread search overlay store is built.
- **Branches predating this workflow** must merge `main` first so `apps/web/scripts/build-preview.ts` is present on the PR branch.
- **Review the diff before commenting `/preview`:** A `/preview` comment selects a commit to deploy on Effect's `workers.dev` subdomain; it does not make contributor code trusted.
