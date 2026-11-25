// Loaded via `require` from a trusted `main` checkout in publish/cleanup jobs,
// never from pull request code.

// Repeated in the checkout-free approval-gate job.
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

  const deploymentIds = async (prNumber) => {
    const deployments = await github.paginate(
      github.rest.repos.listDeployments,
      { ...context.repo, environment: ENVIRONMENT, per_page: 100 },
    )
    return deployments
      .filter((deployment) => payloadOf(deployment)?.pull_request === prNumber)
      .map((deployment) => deployment.id)
  }

  const deactivate = async (
    ids,
    description,
    isStale = (state) => state !== "inactive",
  ) => {
    for (const id of ids) {
      const { data: statuses } = await github.rest.repos.listDeploymentStatuses(
        { ...context.repo, deployment_id: id, per_page: 1 },
      )
      if (isStale(statuses[0]?.state)) {
        await setStatus(id, "inactive", description)
      }
    }
  }

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

  const reportPublish = async ({
    prNumber,
    headSha,
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
        `Preview deployed for ${shortSha}`,
        previewUrl,
      )
      // Deactivate only replaced successful previews; leave newer builds in progress.
      const others = (await deploymentIds(prNumber)).filter(
        (id) => id !== deploymentId,
      )
      await deactivate(
        others,
        `Replaced by preview for ${shortSha}`,
        (state) => state === "success",
      )
      return upsertComment(prNumber, [
        "## Requested Cloudflare Preview",
        "",
        `**URL:** ${previewUrl}`,
        "",
        `Built from commit ${commit}.`,
        "",
        "> [!NOTE]",
        "> New commits pushed to this PR require a new deployment approval. Search and playground share links are disabled in requested previews.",
      ])
    }

    const built = buildResult === "success"
    const phase = built ? "publish" : "build"
    const mergeHint = built
      ? ""
      : " If this PR was branched before requested previews were added, merge `main` into the branch and approve the new deployment."
    await setStatus(
      deploymentId,
      "failure",
      `Preview ${phase} failed for ${shortSha}`,
    )
    await upsertComment(prNumber, [
      "## Requested Cloudflare Preview Failed",
      "",
      `Could not ${phase} commit ${commit}.`,
      "",
      `See the [workflow run](${runUrl}) for details.${mergeHint}`,
    ])
    if (!built) core.setFailed(`Preview build failed for ${headSha}.`)
  }

  return { deploymentIds, deactivate, reportPublish }
}
