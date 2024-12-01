import { useCallback, useEffect, useMemo, useState, Fragment } from "react"
import { CheckIcon, CopyIcon, DownloadIcon, LoaderCircleIcon } from "lucide-react"
import { useRxSet, useRxValue, Result } from "@effect-rx/rx-react"
import * as Match from "effect/Match"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import { cn } from "@/lib/css/utils"
import { useWorkspaceHandle } from "../context/workspace"
import { shareRx } from "../rx/share"

export function ShareButton() {
  const handle = useWorkspaceHandle()
  const rx = useMemo(() => shareRx(handle), [handle])
  const share = useRxSet(rx)

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
        <Button className="absolute top-2 right-6 z-10 bg-[--sl-color-bg-nav] hover:bg-[--sl-color-gray-6] dark:hover:bg-[--sl-color-gray-5] border border-[--sl-color-text] text-[--sl-color-white] cursor-pointer">
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
  const rx = useMemo(() => shareRx(handle), [handle])
  const result = useRxValue(rx)

  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const timeout = setTimeout(() => {
      setCopied(false)
    }, 2000)
    return () => {
      clearTimeout(timeout)
    }
  }, [copied, setCopied])
  const handleCopyLink = useCallback(() => {
    if (Result.isSuccess(result)) {
      navigator.clipboard.writeText(result.value.url)
      setCopied(true)
    }
  }, [setCopied, result])

  const [downloaded, setDownloaded] = useState(false)
  useEffect(() => {
    if (!downloaded) return
    const timeout = setTimeout(() => {
      setDownloaded(false)
    }, 2000)
    return () => {
      clearTimeout(timeout)
    }
  }, [downloaded, setDownloaded])
  const handleDownloadLink = useCallback(() => {
    if (Result.isSuccess(result)) {
      var blobUrl = URL.createObjectURL(result.value.zipFile.content)

      var link = document.createElement("a")
      link.href = blobUrl
      link.download = result.value.zipFile.name
      link.innerText = "Click here to download the file"
      document.body.appendChild(link)
      link.click()
      setDownloaded(true)
    }
  }, [setDownloaded, result])

  return (
    <Fragment>
      <div className="flex flex-col space-y-2 text-center sm:text-left">
        <h3 className="text-lg text-[--sl-color-white] font-semibold">Share</h3>
        <p className="text-sm font-medium text-[--sl-color-text]">
          Use the link to share this playground with others.
        </p>
      </div>
      <div className="flex items-center space-x-2 pt-4">
        <div className="grid flex-1 gap-2">
          <Label htmlFor="link" className="sr-only">
            Link
          </Label>
          <Input
            id="link"
            placeholder="Loading..."
            value={Result.matchWithWaiting(result, {
              onWaiting: (_) => "",
              onError: Match.valueTags({
                FileNotFoundError: () => "The workspace could not be found.",
                CompressionError: () => "Could not compress the workspace.",
                ShortenError: (err) =>
                  err.reason === "TooLarge"
                    ? "The workspace is too large to share."
                    : "An unexpected error occurred."
              }),
              onDefect: (_) => "An unexpected error occurred.",
              onSuccess: ({ value }) => value.url
            })}
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
          onClick={handleCopyLink}
        >
          <span className="sr-only">Copy</span>
          {copied
            ? <CheckIcon size={16} />
            : result.waiting
              ? <LoaderCircleIcon className="animate-spin" size={16} />
              : <CopyIcon size={16} />
          }
        </Button>
      </div>

      <div className="flex items-center space-x-2 pt-4">
        <div className="grid flex-1 gap-2">
          <p className="text-sm font-medium text-[--sl-color-text]">
            Or download the files locally
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          className="px-3 bg-[--sl-color-bg] hover:bg-[--sl-color-gray-6] dark:hover:bg-[--sl-color-gray-5] ring-1 ring-ring cursor-pointer transition-colors"
          disabled={result.waiting || Result.isFailure(result)}
          onClick={handleDownloadLink}
        >
          <span className="sr-only">Download</span>
          {downloaded 
            ? <CheckIcon size={16} />
            : result.waiting
              ? <LoaderCircleIcon className="animate-spin" size={16} />
              : <DownloadIcon size={16} />
          }
        </Button>
      </div>
    </Fragment>
  )

}
