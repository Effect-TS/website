import React, { useCallback, useMemo, useState } from "react"
import { useWorkspaceHandle } from "@/components/editor/context/workspace"
import { shareRx } from "@/components/editor/rx/share"
import { Icon } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import { useRxSetPromise, useRxValue } from "@effect-rx/rx-react"
import * as Cause from "effect/Cause"

export declare namespace ShareButton {
  export interface Props {}
}

export const ShareButton: React.FC<ShareButton.Props> = () => {
  const handle = useWorkspaceHandle()
  const rx = useMemo(() => shareRx(handle), [handle])
  const state = useRxValue(rx.state)
  const share = useRxSetPromise(rx.share)
  const [copied, setCopied] = useState(false)
  const [link, setLink] = useState("")

  const handleGenerateLink = useCallback(() => {
    share().then((exit) => {
      if (exit._tag === "Success") {
        setLink(exit.value)
      } else {
        throw Cause.prettyErrors(exit.cause)[0]
      }
    })
  }, [share])

  const handleCopyLink = useCallback(() => {
    const item = new ClipboardItem({
      "text/plain": new Blob([link], { type: "text/plain" })
    })
    navigator.clipboard.write([item])
    setCopied(true)
  }, [link])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="secondary" onClick={handleGenerateLink}>
          Share
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[520px]">
        <div className="flex flex-col space-y-2 text-center sm:text-left">
          <h3 className="text-lg font-semibold">Share Playground</h3>
          <p className="text-sm font-medium text-muted-foreground">
            Use this link to share this playground with others.
          </p>
        </div>
        <div className="flex items-center space-x-2 pt-4">
          <div className="grid flex-1 gap-2">
            <Label htmlFor="link" className="sr-only">
              Link
            </Label>
            <Input id="link" defaultValue={link} readOnly className="h-9" />
          </div>
          <Button
            size="sm"
            className="px-3"
            disabled={state !== "idle"}
            onClick={handleCopyLink}
          >
            <span className="sr-only">Copy</span>
            {copied ? (
              <Icon name="check" className="h-4 w-4" />
            ) : (
              <Icon name="clipboard" className="h-4 w-4" />
            )}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

ShareButton.displayName = "ShareButton"
