import { ThemeSwitcher } from "@/components/atoms/theme-switcher"
import { SolveButton } from "./SolveButton"
import { Workspace } from "@/workspaces/domain/workspace"
import { WorkspaceProvider } from "@/workspaces/WorkspaceProvider"

export function ToolbarItems({
  workspace
}: {
  readonly workspace: Workspace
}) {
  return (
    <WorkspaceProvider workspace={workspace}>
      <div className="flex items-center gap-4">
        <ThemeSwitcher />
        <SolveButton />
      </div>
    </WorkspaceProvider>
  )
}
