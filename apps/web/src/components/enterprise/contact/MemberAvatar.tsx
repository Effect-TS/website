import type { ContactMember } from "./atoms"

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)

export function MemberAvatar({
  member,
  className,
}: {
  member: ContactMember
  className: string
}) {
  return member.avatar ? (
    <img
      src={member.avatar}
      alt=""
      className={`${className} shrink-0 rounded-md object-cover`}
    />
  ) : (
    <span
      aria-hidden="true"
      className={`${className} flex shrink-0 items-center justify-center rounded-md bg-muted font-mono text-xs text-muted-foreground`}
    >
      {initials(member.name)}
    </span>
  )
}

export function localTime(timezone: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
    timeZoneName: "short",
  }).format(new Date())
}
