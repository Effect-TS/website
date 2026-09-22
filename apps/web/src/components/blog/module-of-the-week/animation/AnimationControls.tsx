import "./AnimationControls.css"

export function AnimationControls({
  playing,
  onRestart,
  onToggle,
  onNext,
}: {
  playing: boolean
  onRestart: () => void
  onToggle: () => void
  onNext?: () => void
}) {
  return (
    <div className="animation-controls">
      <button aria-label="Restart animation" onClick={onRestart}>
        ↻ Restart
      </button>
      <button className="animation-play" onClick={onToggle}>
        {playing ? "Ⅱ Pause" : "▷ Play"}
      </button>
      {onNext && <button onClick={onNext}>Next step →</button>}
    </div>
  )
}
