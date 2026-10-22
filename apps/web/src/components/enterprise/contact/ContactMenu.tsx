import { useAtomSet } from "@effect/atom-react"
import { CalendarDays, Mail } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  buttonLinkVariants,
  type ButtonLinkVariantProps,
} from "@/components/ui/button-link"
import { activeContactAtom } from "@/features/enterprise/atoms"
import type { ContactMember } from "@/features/enterprise/domain"
import { localTime, MemberAvatar } from "./MemberAvatar"

interface Props extends ButtonLinkVariantProps {
  readonly members: ReadonlyArray<ContactMember>
  readonly emailHref: string
  readonly label?: string
  readonly className?: string
}

export default function ContactMenu({
  members,
  emailHref,
  label = "Talk to the Effect team",
  variant,
  size,
  className,
}: Props) {
  const open = useAtomSet(activeContactAtom)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={buttonLinkVariants({ variant, size, className })}
      >
        <CalendarDays size={16} aria-hidden="true" />
        {label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80 p-1.5">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Book a call with</DropdownMenuLabel>
          {members.map((member) => (
            <DropdownMenuItem
              key={member.id}
              onClick={() => open(member)}
              className="gap-3 px-2 py-2"
            >
              <MemberAvatar member={member} className="size-9" />
              <span className="flex min-w-0 flex-col">
                <span className="font-medium text-foreground">
                  {member.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {localTime(member.timezone)}
                </span>
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={<a href={emailHref} />}
          className="gap-3 px-2 py-2"
        >
          <Mail size={16} aria-hidden="true" className="mx-2.5" />
          <span className="font-medium text-foreground">
            Send an email instead
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
