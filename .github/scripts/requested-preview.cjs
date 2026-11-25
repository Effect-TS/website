// GitHub API calls shared by the publish and cleanup jobs of
// .github/workflows/requested-preview.yml. Those jobs load it with `require`
// from a checkout of `main`, never from pull request code.

// The authorize job creates the deployments this reads. It runs without a
// checkout, so it repeats this name and the payload shape.
const ENVIRONMENT = "Requested Preview"
const COMMENT_MARKER = "<!-- effect-website-requested-preview -->"

module.exports = ({ github, context, core }) => {
  const repoUrl = `${context.serverUrl}/${context.repo.owner}/${context.repo.repo}`
  const runUrl = `${repoUrl}/actions/runs/${context.runId}`

  const setStatus = (deploymentId, state, description, environmentUrl) =>
    github.rest.repos.createDeploymentStatus({
      ...context.repo,
      deployment_id: deploymentId,
      state,
      environment: ENVIRONMENT,
      environment_url: environmentUrl,
      log_url: runUrl,
      description,
      auto_inactive: false,
    })

  const payloadOf = (deployment) => {
    const raw = deployment.payload
    if (typeof raw !== "string") return raw
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  // Ids of the requested preview deployments made for one pull request.
  const deploymentIds = async (prNumber) => {
    const deployments = await github.paginate(
      github.rest.repos.listDeployments,
      { ...context.repo, environment: ENVIRONMENT, per_page: 100 },
    )
    return deployments
      .filter((deployment) => payloadOf(deployment)?.pull_request === prNumber)
      .map((deployment) => deployment.id)
  }

  const deactivate = async (ids, description) => {
    for (const id of ids) {
      const { data: statuses } = await github.rest.repos.listDeploymentStatuses(
        { ...context.repo, deployment_id: id, per_page: 1 },
      )
      if (statuses[0]?.state === "inactive") continue
      await setStatus(id, "inactive", description)
    }
  }

  // One comment per pull request, rewritten on every request.
  const upsertComment = async (prNumber, lines) => {
    const body = [COMMENT_MARKER, ...lines].join("\n")
    const comments = await github.paginate(github.rest.issues.listComments, {
      ...context.repo,
      issue_number: prNumber,
      per_page: 100,
    })
    const existing = comments.find(
      (comment) =>
        comment.user?.login === "github-actions[bot]" &&
        comment.body?.startsWith(COMMENT_MARKER),
    )
    if (existing) {
      await github.rest.issues.updateComment({
        ...context.repo,
        comment_id: existing.id,
        body,
      })
    } else {
      await github.rest.issues.createComment({
        ...context.repo,
        issue_number: prNumber,
        body,
      })
    }
  }

  // The last step of the publish job. `buildResult` is the build job's result,
  // `prOpen` is "true" or "false" once the build succeeded, and `previewUrl`
  // is set once the deploy succeeded.
  const reportPublish = async ({
    prNumber,
    headSha,
    requester,
    deploymentId,
    buildResult,
    prOpen,
    previewUrl,
  }) => {
    const shortSha = headSha.slice(0, 7)
    const commit = `[\`${shortSha}\`](${repoUrl}/commit/${headSha})`

    if (buildResult === "cancelled") {
      return setStatus(
        deploymentId,
        "inactive",
        `Preview build for ${shortSha} was superseded`,
      )
    }
    if (buildResult === "success" && prOpen === "false") {
      return setStatus(
        deploymentId,
        "inactive",
        "PR was closed before preview could be published",
      )
    }
    if (previewUrl) {
      await setStatus(
        deploymentId,
        "success",
        `Preview deployed for ${shortSha} (requested by @${requester})`,
        previewUrl,
      )
      const earlier = (await deploymentIds(prNumber)).filter(
        (id) => id !== deploymentId,
      )
      await deactivate(earlier, `Replaced by preview for ${shortSha}`)
      return upsertComment(prNumber, [
        "## Requested Cloudflare Preview",
        "",
        `**URL:** ${previewUrl}`,
        "",
        `Built from commit ${commit} (requested by @${requester}).`,
        "",
        "> [!NOTE]",
        "> New commits pushed to this PR do not update this preview automatically. Comment `/preview` again to deploy a newer commit. Search and playground share links are disabled in requested previews.",
      ])
    }

    const built = buildResult === "success"
    const phase = built ? "publish" : "build"
    const mergeHint = built
      ? ""
      : " If this PR was branched before requested previews were added, merge `main` into the branch and comment `/preview` again."
    await setStatus(
      deploymentId,
      "failure",
      `Preview ${phase} failed for ${shortSha}`,
    )
    await upsertComment(prNumber, [
      "## Requested Cloudflare Preview Failed",
      "",
      `Could not ${phase} commit ${commit} requested by @${requester}.`,
      "",
      `See the [workflow run](${runUrl}) for details.${mergeHint}`,
    ])
    if (!built) core.setFailed(`Preview build failed for ${headSha}.`)
  }

  return { deploymentIds, deactivate, reportPublish }
}
