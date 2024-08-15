export const Transcript = ({ lines }: { lines: string[2][] }) => {
  return (
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
  )
}
