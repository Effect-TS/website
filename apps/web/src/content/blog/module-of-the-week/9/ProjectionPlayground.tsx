import { useState } from "react"
import "./ProjectionPlayground.css"

type Ev =
  | {
      readonly id: number
      readonly tag: "IdeaLogged"
      readonly slug: string
      readonly pitch: string
    }
  | {
      readonly id: number
      readonly tag: "NerdSniped"
      readonly slug: string
      readonly pitch: string
      readonly domains: number
    }

const SCRIPT: ReadonlyArray<Ev> = [
  { id: 1, tag: "IdeaLogged", slug: "readme-typo", pitch: "just-a-typo" },
  { id: 2, tag: "IdeaLogged", slug: "regex-engine", pitch: "zero-dep NFA" },
  {
    id: 3,
    tag: "NerdSniped",
    slug: "readme-typo",
    pitch: "custom AST",
    domains: 3,
  },
  {
    id: 4,
    tag: "NerdSniped",
    slug: "css-compiler",
    pitch: "own syntax",
    domains: 2,
  },
]

type VaultState = Record<string, { pitch: string; domains: number }>

function project(events: ReadonlyArray<Ev>): {
  vault: VaultState
  lastApplied: boolean
} {
  const vault: VaultState = {}
  let lastApplied = false

  for (const ev of events) {
    if (ev.tag === "IdeaLogged") {
      vault[ev.slug] = { pitch: ev.pitch, domains: 0 }
      lastApplied = true
    } else if (vault[ev.slug]) {
      vault[ev.slug] = { pitch: ev.pitch, domains: ev.domains }
      lastApplied = true
    } else {
      lastApplied = false
    }
  }

  return { vault, lastApplied }
}

export function ProjectionPlayground() {
  const [pos, setPos] = useState(0)
  const slice = SCRIPT.slice(0, pos)
  const current = pos > 0 ? SCRIPT[pos - 1]! : null
  const { vault, lastApplied } = project(slice)
  const entries = Object.entries(vault)

  return (
    <figure
      className="pp"
      aria-label="Interactive event projection scrubber: drag the slider or press Step to replay events from the log and watch the projected Vault map update."
    >
      <div className="pp-body">
        <div className="pp-scrub-grid">
          <div className="pp-col">
            <div className="pp-kicker">
              EVENT LOG ({pos} / {SCRIPT.length})
            </div>
            <div className="pp-list">
              {SCRIPT.map((ev, i) => {
                const seen = i < pos
                const active = i === pos - 1
                return (
                  <button
                    key={ev.id}
                    type="button"
                    className={`pp-list-item is-${ev.tag === "IdeaLogged" ? "d1" : "d2"} ${seen ? "is-seen" : ""} ${active ? "is-active" : ""}`}
                    onClick={() => setPos(i + 1)}
                  >
                    <span className="pp-tag">{ev.tag}</span>
                    <span className="pp-slug">{ev.slug}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="pp-col">
            <div className="pp-kicker">PROJECTED VAULT</div>
            <div className="pp-map is-tall">
              {entries.length === 0 ? (
                <div className="pp-empty">empty map</div>
              ) : (
                entries.map(([slug, data]) => (
                  <div
                    key={slug}
                    className={`pp-row ${current?.slug === slug && lastApplied ? "is-hit" : ""}`}
                  >
                    <span className="pp-key">{slug}</span>
                    <span className="pp-val">{data.pitch}</span>
                    <span className="pp-meta">{data.domains}d</span>
                  </div>
                ))
              )}
              {current && !lastApplied && (
                <div className="pp-miss-note">
                  ✕ {current.slug} not in map (ignored)
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="pp-bar">
        <div className="pp-scrubber">
          <span className="pp-scrub-lbl">Replay</span>
          <input
            type="range"
            min={0}
            max={SCRIPT.length}
            step={1}
            value={pos}
            aria-label="Replay event log position"
            onChange={(e) => setPos(Number(e.target.value))}
          />
          <span className="pp-scrub-val">
            {pos}/{SCRIPT.length}
          </span>
        </div>

        <div className="pp-actions">
          <button
            type="button"
            className="pp-btn is-primary"
            disabled={pos >= SCRIPT.length}
            onClick={() => setPos((p) => Math.min(SCRIPT.length, p + 1))}
          >
            Step
          </button>
          <button
            type="button"
            className="pp-btn"
            disabled={pos === 0}
            onClick={() => setPos(0)}
          >
            Reset
          </button>
        </div>
      </div>
    </figure>
  )
}
