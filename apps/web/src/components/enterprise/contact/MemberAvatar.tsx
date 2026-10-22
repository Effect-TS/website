import type { ContactMember } from "./atoms"

export function MemberAvatar({
  member,
  className,
}: {
  member: ContactMember
  className: string
}) {
  return (
    <img
      src={member.avatar}
      alt=""
      className={`${className} shrink-0 rounded-md object-cover`}
    />
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
