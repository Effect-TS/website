import { useCallback, Fragment } from "react"
import { CheckIcon, CopyIcon, DownloadIcon, LoaderCircleIcon } from "lucide-react"
import { useRxSet, useRxValue, Result, useRx } from "@effect-rx/rx-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/css/utils"
import { useWorkspaceHandle } from "../context/workspace"
import { copyLinkRx, downloadRx, shareRx } from "../rx/share"

export function ShareButton() {
  const handle = useWorkspaceHandle()
  const share = useRxSet(shareRx(handle))

  const onOpen = useCallback(
    (open: boolean) => {
      if (!open) return
      share()
    },
    [share]
  )

  return (
    <Popover onOpenChange={onOpen}>
      <PopoverTrigger asChild>
        <Button className="bg-[--sl-color-bg-nav] hover:bg-[--sl-color-gray-6] dark:hover:bg-[--sl-color-gray-5] border border-[--sl-color-text] text-[--sl-color-white] cursor-pointer">
          Share
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[400px] bg-[--sl-color-bg-nav] border-[--sl-color-text]">
        <ShareContent />
      </PopoverContent>
    </Popover>
  )
}

function ShareContent() {
  const handle = useWorkspaceHandle()
  const result = useRxValue(shareRx(handle))
  const [copied, setCopied] = useRx(copyLinkRx)
  const [downloaded, download] = useRx(downloadRx)

  return (
    <Fragment>
      <div className="flex flex-col space-y-2 text-center sm:text-left">
        <h3 className="text-lg text-[--sl-color-white] font-semibold">Share</h3>
        <p className="text-sm font-medium text-[--sl-color-text]">Use the link to share this playground with others.</p>
      </div>
      <div className="flex items-center space-x-2 pt-4">
        <div className="grid flex-1 gap-2">
          <Label htmlFor="link" className="sr-only">
            Link
          </Label>
          <Input
            id="link"
            placeholder="Loading..."
            value={Result.builder(result)
              .onWaiting(() => "")
              .onSuccess(({ url }) => url)
              .onErrorTag("FileNotFoundError", () => "The workspace could not be found.")
              .onErrorTag("CompressionError", () => "Could not compress the workspace.")
              .onErrorIf(
                (e) => e._tag === "ShortenError" && e.reason === "TooLarge",
                () => "The workspace is too large to share."
              )
              .onFailure(() => "An unexpected error occurred.")
              .render()}
            readOnly
            className={cn(
              "h-9 bg-[--sl-color-bg] rounded-sm",
              Result.isFailure(result) && "border-destructive focus-visible:ring-destructive"
            )}
          />
        </div>
        <Button
          size="sm"
          variant="secondary"
          className="px-3 bg-[--sl-color-bg] hover:bg-[--sl-color-gray-6] dark:hover:bg-[--sl-color-gray-5] ring-1 ring-ring cursor-pointer transition-colors"
          disabled={result.waiting || Result.isFailure(result)}
          onClick={() => setCopied(handle)}
        >
          <span className="sr-only">Copy</span>
          {Result.isSuccess(copied) ? (
            <CheckIcon size={16} />
          ) : result.waiting ? (
            <LoaderCircleIcon className="animate-spin" size={16} />
          ) : (
            <CopyIcon size={16} />
          )}
        </Button>
      </div>

      <div className="flex items-center space-x-2 pt-4">
        <div className="grid flex-1 gap-2">
          <p className="text-sm font-medium text-[--sl-color-text]">Or download the files locally</p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          className="px-3 bg-[--sl-color-bg] hover:bg-[--sl-color-gray-6] dark:hover:bg-[--sl-color-gray-5] ring-1 ring-ring cursor-pointer transition-colors"
          disabled={result.waiting || Result.isFailure(result)}
          onClick={() => download(handle)}
        >
          <span className="sr-only">Download</span>
          {Result.isSuccess(downloaded) ? (
            <CheckIcon size={16} />
          ) : result.waiting ? (
            <LoaderCircleIcon className="animate-spin" size={16} />
          ) : (
            <DownloadIcon size={16} />
          )}
        </Button>
      </div>
    </Fragment>
  )
}
