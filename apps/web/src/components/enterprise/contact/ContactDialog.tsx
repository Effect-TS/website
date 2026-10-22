import { useAtomSet, useAtomValue } from "@effect/atom-react"
import { ArrowUpRight } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { activeContactAtom } from "./atoms"
import { localTime, MemberAvatar } from "./MemberAvatar"

export default function ContactDialog() {
  const member = useAtomValue(activeContactAtom)
  const setActive = useAtomSet(activeContactAtom)

  return (
    <Dialog
      open={member !== null}
      onOpenChange={(isOpen) => !isOpen && setActive(null)}
    >
      <DialogContent
        overlayClassName="z-200"
        className="z-250 h-[85vh] grid-rows-[auto_1fr] gap-0 overflow-hidden p-0 sm:max-w-3xl"
        aria-describedby={undefined}
      >
        {member && (
          <>
            <div className="flex items-center gap-3 border-b border-border py-3 pr-14 pl-4">
              <MemberAvatar member={member} className="size-10" />
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base font-semibold">
                  {member.name}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {member.title} · {localTime(member.timezone)} local time
                </DialogDescription>
              </div>
              <a
                href={member.scheduleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden items-center gap-1.5 text-sm text-muted-foreground no-underline hover:text-foreground hover:no-underline sm:inline-flex"
              >
                Open in new tab
                <ArrowUpRight size={14} aria-hidden="true" />
              </a>
            </div>
            <iframe
              key={member.id}
              src={member.scheduleUrl}
              title={`Book a call with ${member.name}`}
              className="size-full bg-white"
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
