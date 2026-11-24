import { useState } from "react"
import "./ConflictPlayground.css"

type Rule = "skip" | "overwrite"

const STEPS = ["Offline", "Sync", "Handle"] as const

export function ConflictPlayground() {
  const [step, setStep] = useState(1)
  const [rule, setRule] = useState<Rule>("skip")

  const phoneFinal = rule === "skip" ? "new-parser" : "just-a-typo"
  const phoneOk = rule === "skip"

  return (
    <figure
      className="cp"
      aria-label="Step-through SVG flow showing how checking conflicts keeps Laptop and Phone on the same vault state after syncing conflicting offline writes"
    >
      <div className="cp-body">
        <div className="cp-top">
          <ol className="cp-pills" aria-label="Steps">
            {STEPS.map((lbl, i) => (
              <li key={lbl}>
                <button
                  type="button"
                  className={`cp-pill ${step > i + 1 ? "is-done" : ""}`}
                  aria-current={step === i + 1 ? "step" : undefined}
                  aria-label={`Go to step ${i + 1}: ${lbl}`}
                  onClick={() => setStep(i + 1)}
                >
                  <span className="cp-pill-num">{i + 1}</span>
                  <span>{lbl}</span>
                </button>
              </li>
            ))}
          </ol>

          <div className="cp-seg" role="radiogroup" aria-label="Handler rule">
            <button
              type="button"
              role="radio"
              aria-checked={rule === "skip"}
              onClick={() => setRule("skip")}
            >
              Check conflicts
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={rule === "overwrite"}
              onClick={() => setRule("overwrite")}
            >
              Always apply
            </button>
          </div>
        </div>

        <div className="cp-svg-wrap">
          <svg
            viewBox="0 0 640 184"
            className="cp-svg"
            role="img"
            aria-label="Laptop writes just-a-typo at 09:14:09 and Phone writes new-parser at 09:14:41. On sync, only Phone sees a conflict. Checking conflicts skips the older write so both vaults end on new-parser."
          >
            <defs>
              <marker
                id="cp-arr-d1"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" className="cp-fill-d1" />
              </marker>
              <marker
                id="cp-arr-d2"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" className="cp-fill-d2" />
              </marker>
            </defs>

            {/* Device lane labels */}
            <text x="16" y="54" className="cp-svg-lbl is-d1">
              Laptop
            </text>
            <text x="16" y="142" className="cp-svg-lbl is-d2">
              Phone
            </text>

            {/* Step 1: Local offline writes */}
            <rect
              x="84"
              y="30"
              width="118"
              height="38"
              rx="6"
              className="cp-svg-box is-d1"
            />
            <text x="143" y="46" textAnchor="middle" className="cp-svg-sub">
              09:14:09
            </text>
            <text
              x="143"
              y="61"
              textAnchor="middle"
              className="cp-svg-val is-d1"
            >
              just-a-typo
            </text>

            <rect
              x="84"
              y="118"
              width="118"
              height="38"
              rx="6"
              className="cp-svg-box is-d2"
            />
            <text x="143" y="134" textAnchor="middle" className="cp-svg-sub">
              09:14:41
            </text>
            <text
              x="143"
              y="149"
              textAnchor="middle"
              className="cp-svg-val is-d2"
            >
              new-parser
            </text>

            {/* Step 2: Sync & conflict check */}
            <g className={`cp-svg-g ${step >= 2 ? "is-vis" : ""}`}>
              <path
                d="M 202 137 C 245 137, 245 49, 286 49"
                className="cp-svg-edge is-d2"
                markerEnd="url(#cp-arr-d2)"
              />
              <path
                d="M 202 49 C 245 49, 245 137, 286 137"
                className="cp-svg-edge is-d1"
                markerEnd="url(#cp-arr-d1)"
              />

              <rect
                x="292"
                y="30"
                width="154"
                height="38"
                rx="6"
                className="cp-svg-box"
              />
              <text x="369" y="46" textAnchor="middle" className="cp-svg-sub">
                conflicts: []
              </text>
              <text
                x="369"
                y="61"
                textAnchor="middle"
                className="cp-svg-val is-ok"
              >
                apply new-parser
              </text>

              <rect
                x="292"
                y="118"
                width="154"
                height="38"
                rx="6"
                className={`cp-svg-box ${phoneOk ? "is-ok-box" : "is-bad-box"}`}
              />
              <text x="369" y="134" textAnchor="middle" className="cp-svg-sub">
                conflicts: [new-parser]
              </text>
              <text
                x="369"
                y="149"
                textAnchor="middle"
                className={`cp-svg-val ${phoneOk ? "is-ok" : "is-bad"}`}
              >
                {phoneOk ? "skip just-a-typo" : "apply just-a-typo"}
              </text>
            </g>

            {/* Step 3: Resulting vaults */}
            <g className={`cp-svg-g ${step >= 3 ? "is-vis" : ""}`}>
              <line x1="446" y1="49" x2="486" y2="49" className="cp-svg-stem" />
              <line
                x1="446"
                y1="137"
                x2="486"
                y2="137"
                className="cp-svg-stem"
              />

              <rect
                x="490"
                y="30"
                width="132"
                height="38"
                rx="6"
                className="cp-svg-box is-ok-box"
              />
              <text x="556" y="46" textAnchor="middle" className="cp-svg-sub">
                VAULT
              </text>
              <text
                x="556"
                y="61"
                textAnchor="middle"
                className="cp-svg-val is-ok"
              >
                new-parser
              </text>

              <rect
                x="490"
                y="118"
                width="132"
                height="38"
                rx="6"
                className={`cp-svg-box ${phoneOk ? "is-ok-box" : "is-bad-box"}`}
              />
              <text x="556" y="134" textAnchor="middle" className="cp-svg-sub">
                VAULT
              </text>
              <text
                x="556"
                y="149"
                textAnchor="middle"
                className={`cp-svg-val ${phoneOk ? "is-ok" : "is-bad"}`}
              >
                {phoneFinal}
              </text>
            </g>
          </svg>
        </div>

        <div className="cp-actions">
          <button
            type="button"
            className="cp-btn is-primary"
            disabled={step >= 3}
            onClick={() => setStep((s) => Math.min(3, s + 1))}
          >
            Step
          </button>
          <button
            type="button"
            className="cp-btn"
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
