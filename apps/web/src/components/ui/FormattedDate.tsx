const format = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
})

export function FormattedDate({
  date,
  className,
}: {
  date: Date
  className?: string
}) {
  return (
    <time dateTime={date.toISOString()} className={className}>
      {format.format(date)}
    </time>
  )
}
