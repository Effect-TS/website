import { useAtomSet, useAtomValue, useAtom } from "@effect/atom-react"
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult"
import { CheckIcon, CopyIcon, DownloadIcon, Loader2Icon } from "lucide-react"
import { useRef } from "react"
import { Button } from "@/components/ui/Button"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { copyLinkAtom, downloadAtom, shareAtom } from "../atoms/share"
import { useWorkspaceHandle } from "../context/workspace"

export function ShareButton() {
  const handle = useWorkspaceHandle()
  const share = useAtomSet(shareAtom(handle))
  return (
    <Dialog
      onOpenChange={(open) => {
        if (open) share()
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Share
      </DialogTrigger>
      <ShareContent />
    </Dialog>
  )
}

function ShareContent() {
  const handle = useWorkspaceHandle()
  const result = useAtomValue(shareAtom(handle))
  const [copied, setCopied] = useAtom(copyLinkAtom)
  const [downloaded, download] = useAtom(downloadAtom)

  const url = AsyncResult.isSuccess(result) ? result.value.url : ""
  const isWaiting = result.waiting
  const isFailed = AsyncResult.isFailure(result)
  const input = useRef<HTMLInputElement>(null)

  return (
    <DialogContent initialFocus={input}>
      <div className="flex flex-col space-y-2">
        <DialogTitle>Share</DialogTitle>
        <DialogDescription>
          Use the link to share this playground with others.
        </DialogDescription>
      </div>
      <div className="flex items-center space-x-2 pt-4">
        <div className="min-w-0 flex-1">
          <input
            type="text"
            ref={input}
            aria-label="Playground link"
            readOnly
            placeholder="Loading..."
            value={isFailed ? "An error occurred." : url}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          aria-label="Copy playground link"
          disabled={isWaiting || isFailed}
          onClick={() => setCopied(handle)}
        >
          {AsyncResult.isSuccess(copied) ? (
            <CheckIcon size={16} />
          ) : isWaiting ? (
            <Loader2Icon className="animate-spin" size={16} />
          ) : (
            <CopyIcon size={16} />
          )}
        </Button>
      </div>
      <div className="flex items-center space-x-2 pt-4">
        <p className="flex-1 text-sm text-muted-foreground">
          Or download the files locally
        </p>
        <Button
          variant="outline"
          size="icon"
          aria-label="Download playground files"
          disabled={isWaiting || isFailed}
          onClick={() => download(handle)}
        >
          {AsyncResult.isSuccess(downloaded) ? (
            <CheckIcon size={16} />
          ) : isWaiting ? (
            <Loader2Icon className="animate-spin" size={16} />
          ) : (
            <DownloadIcon size={16} />
          )}
        </Button>
      </div>
      <p role="status" className="text-sm text-muted-foreground">
        {isWaiting
          ? "Creating playground link…"
          : isFailed
            ? "Unable to create a playground link."
            : AsyncResult.isSuccess(copied)
              ? "Playground link copied."
              : AsyncResult.isSuccess(downloaded)
                ? "Playground download started."
                : "Playground link ready."}
      </p>
    </DialogContent>
  )
}
