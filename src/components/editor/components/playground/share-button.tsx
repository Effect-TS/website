import React, { useCallback, useEffect, useState } from "react"
import { useShareRx } from "@/components/editor/context/workspace"
import { Icon } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import { Result, useRxSet, useRxValue } from "@effect-rx/rx-react"

export declare namespace ShareButton {
  export interface Props {}
}

export const ShareButton: React.FC<ShareButton.Props> = () => {
  const rx = useShareRx()
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
        <Button variant="secondary">Share</Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[400px]">
        <ModalContent />
      </PopoverContent>
    </Popover>
  )
}

ShareButton.displayName = "ShareButton"

function ModalContent() {
  const rx = useShareRx()
  const result = useRxValue(rx, (result) =>
    !result.waiting && Result.isSuccess(result)
      ? ({
          link: result.value,
          loading: false
        } as const)
      : ({
          link: "",
          loading: true
        } as const)
  )

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
    navigator.clipboard.writeText(result.link)
    setCopied(true)
  }, [setCopied, result.link])

  return (
    <>
      <div className="flex flex-col space-y-2 text-center sm:text-left">
        <h3 className="text-lg font-semibold">Share</h3>
        <p className="text-sm font-medium text-muted-foreground">
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
            value={result.link}
            readOnly
            className="h-9"
          />
        </div>
        <Button
          size="sm"
          variant="secondary"
          className="px-3"
          disabled={result.loading}
          onClick={handleCopyLink}
        >
          <span className="sr-only">Copy</span>
          {copied ? (
            <Icon name="check" className="h-4 w-4" />
          ) : (
            <Icon
              name={result.loading ? "loading" : "clipboard"}
              className={`h-4 w-4 ${result.loading ? "animate-spin" : ""}`}
            />
          )}
        </Button>
      </div>
    </>
  )
}
