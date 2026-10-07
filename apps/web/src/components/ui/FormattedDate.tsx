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
  date: string | Date
  className?: string
}) {
  const value = new Date(date)
  return (
    <time dateTime={value.toISOString().slice(0, 10)} className={className}>
      {format.format(value)}
    </time>
  )
}
