import { useEffect, useRef, useState } from "react"
import { Check, ChevronDown, Copy } from "lucide-react"
import BunLogo from "@/assets/logos/bun/Bun.svg?react"
import DenoLogo from "@/assets/logos/deno/Deno.svg?react"
import NpmLogo from "@/assets/icons/fa7-brands/npm.svg?react"
import PnpmLogo from "@/assets/logos/pnpm/Pnpm.svg?react"
import YarnLogo from "@/assets/logos/yarn/Yarn.svg?react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  DEFAULT_PACKAGE_MANAGER,
  getInstallCommand,
  PACKAGE_MANAGERS,
  type PackageManager,
} from "@/lib/install-command"

const icons = {
  bun: BunLogo,
  deno: DenoLogo,
  npm: NpmLogo,
  pnpm: PnpmLogo,
  yarn: YarnLogo,
}

function PackageManagerIcon({ value }: { value: PackageManager }) {
  const Icon = icons[value]
  return (
    <span
      className="flex shrink-0 items-center text-foreground"
      aria-hidden="true"
    >
      <Icon className={value === "npm" ? "size-auto h-6" : "size-auto h-5"} />
    </span>
  )
}

export default function InstallCommand() {
  const [packageManager, setPackageManager] = useState(DEFAULT_PACKAGE_MANAGER)
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle")
  const resetTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  )
  const command = getInstallCommand(packageManager)

  useEffect(() => () => clearTimeout(resetTimeout.current), [])

  async function copy() {
    try {
      await navigator.clipboard.writeText(command)
      setStatus("copied")
    } catch {
      setStatus("error")
    }
    clearTimeout(resetTimeout.current)
    resetTimeout.current = setTimeout(() => setStatus("idle"), 1500)
  }

  return (
    <div
      data-install-command
      className="@container relative rounded-md bg-card/40 p-1 ring-1 ring-inset ring-border-strong"
    >
      <div className="flex min-h-11 items-center gap-3 px-4 py-1 text-left font-mono text-sm text-foreground/80 transition-colors hover:bg-card/70 @max-[17rem]:flex-wrap @max-[17rem]:px-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Package manager: ${packageManager}`}
            className="group flex shrink-0 cursor-pointer items-center gap-1.5 rounded-sm border-r border-border py-0.5 pr-3 pl-1 text-xs transition-colors hover:text-foreground"
          >
            <PackageManagerIcon value={packageManager} />
            <span>{packageManager}</span>
            <ChevronDown
              className="size-4 text-subtle-foreground transition-transform group-data-popup-open:rotate-180"
              aria-hidden="true"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            aria-label="Package manager"
            className="w-36 rounded-md p-0 font-mono"
            sideOffset={8}
          >
            <DropdownMenuRadioGroup value={packageManager}>
              {PACKAGE_MANAGERS.map((pm) => (
                <DropdownMenuRadioItem
                  key={pm}
                  value={pm}
                  closeOnClick
                  className="cursor-pointer gap-2.5 rounded-none py-2 pl-3"
                  onClick={() => {
                    setPackageManager(pm)
                    clearTimeout(resetTimeout.current)
                    setStatus("idle")
                  }}
                >
                  <PackageManagerIcon value={pm} />
                  {pm}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          type="button"
          aria-label="Copy install command"
          className="flex min-h-9 min-w-0 flex-1 cursor-pointer items-center gap-3 self-stretch rounded-sm text-left @max-[17rem]:basis-full"
          onClick={copy}
        >
          <span
            data-role="command-text"
            className="min-w-0 flex-1 [overflow-wrap:anywhere]"
          >
            {command}
          </span>
          {status === "copied" ? (
            <Check
              size={16}
              className="shrink-0 text-foreground"
              aria-hidden="true"
            />
          ) : (
            <Copy
              size={16}
              className="shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
          )}
        </button>
      </div>
      <p role="status" className="sr-only">
        {status === "copied"
          ? "Copied install command"
          : status === "error"
            ? "Could not copy. Select and copy the command manually."
            : ""}
      </p>
    </div>
  )
}
