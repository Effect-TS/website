import { useState } from "react"
import "./SyncPlayground.css"

type Entry = {
  readonly id: string
  readonly label: string
  readonly cipher: string
  readonly from: "laptop" | "phone"
}

const E1: Entry = {
  id: "0193a1",
  label: "readme-typo",
  cipher: "🔒 8a4f..e2",
  from: "laptop",
}
const E2: Entry = {
  id: "0193a4",
  label: "regex-engine",
  cipher: "🔒 c12e..09",
  from: "phone",
}
const E3: Entry = {
  id: "0193a8",
  label: "NerdSniped",
  cipher: "🔒 3b9d..7a",
  from: "laptop",
}

const STEPS = ["Local", "Relay", "Synced"] as const

export function SyncPlayground() {
  const [encrypted, setEncrypted] = useState(true)
  const [step, setStep] = useState(1)

  return (
    <figure
      className="sp"
      aria-label="Step-through diagram comparing layerEncrypted and layerUnencrypted sync between Laptop, Server, and Phone"
    >
      <div className="sp-body">
        <div className="sp-top">
          <ol className="sp-pills" aria-label="Steps">
            {STEPS.map((lbl, i) => (
              <li key={lbl}>
                <button
                  type="button"
                  className={`sp-pill ${step > i + 1 ? "is-done" : ""}`}
                  aria-current={step === i + 1 ? "step" : undefined}
                  aria-label={`Go to step ${i + 1}: ${lbl}`}
                  onClick={() => setStep(i + 1)}
                >
                  <span className="sp-pill-num">{i + 1}</span>
                  <span className="sp-pill-label">{lbl}</span>
                </button>
              </li>
            ))}
          </ol>

          <div
            className="sp-seg"
            role="radiogroup"
            aria-label="Transport encryption"
          >
            <button
              type="button"
              role="radio"
              aria-checked={encrypted}
              onClick={() => setEncrypted(true)}
            >
              Encrypted
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={!encrypted}
              onClick={() => setEncrypted(false)}
            >
              Unencrypted
            </button>
          </div>
        </div>

        <div className="sp-wire-grid">
          <div className="sp-col-box is-d1">
            <div className="sp-kicker">LAPTOP (DECRYPTED)</div>
            <div className="sp-stack">
              <div className="sp-mini is-d1">0193a1 · readme-typo</div>
              {step >= 3 && (
                <div className="sp-mini is-d2 is-new">
                  0193a4 · regex-engine
                </div>
              )}
              <div className="sp-mini is-d1">0193a8 · NerdSniped</div>
            </div>
          </div>

          <div className={`sp-col-box is-srv ${step >= 2 ? "is-active" : ""}`}>
            <div className="sp-kicker">
              {encrypted ? "SERVER (OPAQUE BYTES)" : "SERVER (PLAINTEXT)"}
            </div>
            <div className="sp-stack">
              {step < 2 ? (
                <span className="sp-empty">offline</span>
              ) : (
                [E1, E2, E3].map((e) => (
                  <div
                    key={e.id}
                    className={`sp-mini is-new ${encrypted ? "is-enc" : "is-plain"}`}
                  >
                    {encrypted
                      ? `${e.id} · ${e.cipher}`
                      : `${e.id} · ${e.label}`}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="sp-col-box is-d2">
            <div className="sp-kicker">PHONE (DECRYPTED)</div>
            <div className="sp-stack">
              {step >= 3 && (
                <div className="sp-mini is-d1 is-new">0193a1 · readme-typo</div>
              )}
              <div className="sp-mini is-d2">0193a4 · regex-engine</div>
              {step >= 3 && (
                <div className="sp-mini is-d1 is-new">0193a8 · NerdSniped</div>
              )}
            </div>
          </div>
        </div>

        <div className="sp-actions">
          <button
            type="button"
            className="sp-btn is-primary"
            disabled={step >= 3}
            onClick={() => setStep((s) => Math.min(3, s + 1))}
          >
            Step
          </button>
          <button
            type="button"
            className="sp-btn"
            disabled={step === 1}
            onClick={() => setStep(1)}
          >
            Reset
          </button>
        </div>
      </div>
    </figure>
  )
}
