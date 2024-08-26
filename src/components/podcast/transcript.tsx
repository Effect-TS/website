export const Transcript = ({
  lines,
  showHeading
}: {
  lines: string[2][]
  showHeading?: boolean
}) => {
  return (
    <section className="prose max-w-lg prose-headings:font-display dark:prose-invert prose-headings:text-black dark:prose-headings:text-white">
      {showHeading && <h2 className="mt-12">Transcript</h2>}
      <ul className="not-prose mt-8 space-y-2">
        {lines.map(([timestamp, text], index) => (
          <li key={index} className="flex items-baseline gap-4">
            <div className="shrink-0 text-xs font-mono dark:text-zinc-500 select-none">
              {timestamp}
            </div>
            <div className="leading-snug">{text}</div>
          </li>
        ))}
      </ul>
    </section>
  )
}
