import { useState } from "react"
import "./EventRowPlayground.css"

type Mode = "row" | "whole"

const STEPS = ["Offline", "Sync", "Filter", "Vaults"] as const

export function EventRowPlayground() {
  const [step, setStep] = useState(1)
  const [mode, setMode] = useState<Mode>("row")

  const keepDomains = mode === "row"

  return (
    <figure
      className="erp"
      aria-label="Step-through SVG diagram showing Laptop and Phone offline patches merging field by field in EventRow so both vaults receive each other's winning fields"
    >
      <div className="erp-body">
        <div className="erp-top">
          <ol className="erp-pills" aria-label="Steps">
            {STEPS.map((lbl, i) => (
              <li key={lbl}>
                <button
                  type="button"
                  className={`erp-pill ${step > i + 1 ? "is-done" : ""}`}
                  aria-current={step === i + 1 ? "step" : undefined}
                  aria-label={`Go to step ${i + 1}: ${lbl}`}
                  onClick={() => setStep(i + 1)}
                >
                  <span className="erp-pill-num">{i + 1}</span>
                  <span>{lbl}</span>
                </button>
              </li>
            ))}
          </ol>

          <div
            className="erp-seg"
            role="radiogroup"
            aria-label="Conflict strategy"
          >
            <button
              type="button"
              role="radio"
              aria-checked={mode === "row"}
              onClick={() => setMode("row")}
            >
              EventRow
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={mode === "whole"}
              onClick={() => setMode("whole")}
            >
              Whole event
            </button>
          </div>
        </div>

        <div className="erp-svg-wrap">
          <svg
            viewBox="0 0 660 220"
            className="erp-svg"
            role="img"
            aria-label="Laptop edits pitch and domains at 09:14:09; Phone edits pitch at 09:14:41. EventRow applies Phone's new-parser to Laptop and Laptop's domains: 4 to Phone so both vaults match."
          >
            <defs>
              <marker
                id="erp-arr-d1"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" className="erp-fill-d1" />
              </marker>
              <marker
                id="erp-arr-d2"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" className="erp-fill-d2" />
              </marker>
              <marker
                id="erp-arr-ok"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" className="erp-fill-ok" />
              </marker>
            </defs>

            {/* Column titles */}
            <text x="94" y="16" textAnchor="middle" className="erp-svg-col">
              OFFLINE
            </text>
            <text x="322" y="16" textAnchor="middle" className="erp-svg-col">
              {keepDomains ? "EVENTROW" : "WHOLE EVENT"}
            </text>
            <text x="556" y="16" textAnchor="middle" className="erp-svg-col">
              VAULTS
            </text>

            {/* Step 1: Laptop & Phone offline patches */}
            <rect
              x="12"
              y="28"
              width="164"
              height="90"
              rx="6"
              className="erp-svg-box is-d1"
            />
            <text x="24" y="46" className="erp-svg-who is-d1">
              Laptop
            </text>
            <text x="164" y="46" textAnchor="end" className="erp-svg-sub">
              09:14:09
            </text>
            <rect
              x="22"
              y="55"
              width="144"
              height="23"
              rx="4"
              className="erp-svg-pill is-d1"
            />
            <text
              x="94"
              y="70"
              textAnchor="middle"
              className="erp-svg-val is-d1"
            >
              pitch: just-a-typo
            </text>
            <rect
              x="22"
              y="85"
              width="144"
              height="23"
              rx="4"
              className="erp-svg-pill is-d1"
            />
            <text
              x="94"
              y="100"
              textAnchor="middle"
              className="erp-svg-val is-d1"
            >
              domains: 4
            </text>

            <rect
              x="12"
              y="138"
              width="164"
              height="62"
              rx="6"
              className="erp-svg-box is-d2"
            />
            <text x="24" y="156" className="erp-svg-who is-d2">
              Phone
            </text>
            <text x="164" y="156" textAnchor="end" className="erp-svg-sub">
              09:14:41
            </text>
            <rect
              x="22"
              y="166"
              width="144"
              height="23"
              rx="4"
              className="erp-svg-pill is-d2"
            />
            <text
              x="94"
              y="181"
              textAnchor="middle"
              className="erp-svg-val is-d2"
            >
              pitch: new-parser
            </text>

            {/* Step 2: Wires into per-field gates */}
            <g className={`erp-svg-g ${step >= 2 ? "is-vis" : ""}`}>
              <path
                d="M 176 66 C 210 66, 210 56, 248 56"
                className={`erp-svg-wire ${step >= 3 ? "is-bad-wire" : "is-d1"}`}
                markerEnd={step >= 3 ? undefined : "url(#erp-arr-d1)"}
              />
              <path
                d="M 176 96 C 216 96, 216 158, 248 158"
                className={`erp-svg-wire ${step >= 3 && !keepDomains ? "is-bad-wire" : "is-d1"}`}
                markerEnd={
                  step >= 3 && !keepDomains ? undefined : "url(#erp-arr-d1)"
                }
              />
              <path
                d="M 176 177 C 222 177, 212 78, 248 78"
                className="erp-svg-wire is-d2"
                markerEnd="url(#erp-arr-d2)"
              />
            </g>

            {/* Step 3: Compact per-field filter gates */}
            <g className={`erp-svg-g ${step >= 3 ? "is-vis" : ""}`}>
              <circle cx="238" cy="56" r="7" className="erp-svg-x-bg" />
              <text x="238" y="60" textAnchor="middle" className="erp-svg-x">
                ✕
              </text>

              <rect
                x="254"
                y="42"
                width="136"
                height="50"
                rx="6"
                className="erp-svg-box is-d2"
              />
              <text x="322" y="60" textAnchor="middle" className="erp-svg-sub">
                pitch
              </text>
              <text
                x="322"
                y="79"
                textAnchor="middle"
                className="erp-svg-val is-d2"
              >
                new-parser
              </text>

              {!keepDomains && (
                <>
                  <circle cx="238" cy="158" r="7" className="erp-svg-x-bg" />
                  <text
                    x="238"
                    y="162"
                    textAnchor="middle"
                    className="erp-svg-x"
                  >
                    ✕
                  </text>
                </>
              )}

              <rect
                x="254"
                y="133"
                width="136"
                height="50"
                rx="6"
                className={`erp-svg-box ${keepDomains ? "is-ok-box" : "is-bad-box"}`}
              />
              <text x="322" y="151" textAnchor="middle" className="erp-svg-sub">
                domains
              </text>
              <text
                x="322"
                y="170"
                textAnchor="middle"
                className={`erp-svg-val ${keepDomains ? "is-ok" : "is-bad"}`}
              >
                {keepDomains ? "✓ 4" : "✕ dropped"}
              </text>
            </g>

            {/* Step 4: Output wires branching to Laptop & Phone vaults */}
            <g className={`erp-svg-g ${step >= 4 ? "is-vis" : ""}`}>
              {/* pitch -> Laptop vault (updated!) and Phone vault */}
              <path
                d="M 390 67 L 458 67"
                className="erp-svg-wire is-d2"
                markerEnd="url(#erp-arr-d2)"
              />
              <path
                d="M 390 67 C 424 67, 424 161, 458 161"
                className="erp-svg-wire is-d2"
                markerEnd="url(#erp-arr-d2)"
              />

              {/* domains -> Phone vault (updated under EventRow, blocked under Whole event) */}
              <path
                d="M 390 158 C 422 158, 422 93, 458 93"
                className="erp-svg-wire is-ok-wire"
                markerEnd="url(#erp-arr-ok)"
              />
              <path
                d="M 390 158 C 424 158, 424 187, 458 187"
                className={`erp-svg-wire ${keepDomains ? "is-ok-wire" : "is-bad-wire"}`}
                markerEnd={keepDomains ? "url(#erp-arr-ok)" : undefined}
              />

              {/* Laptop Vault card */}
              <rect
                x="464"
                y="28"
                width="184"
                height="84"
                rx="6"
                className="erp-svg-box is-ok-box"
              />
              <text x="476" y="46" className="erp-svg-who is-d1">
                Laptop
              </text>
              <text x="636" y="46" textAnchor="end" className="erp-svg-sub">
                vault
              </text>
              <line
                x1="476"
                y1="53"
                x2="636"
                y2="53"
                className="erp-svg-divider"
              />
              <text x="476" y="72" className="erp-svg-sub">
                pitch
              </text>
              <text
                x="636"
                y="72"
                textAnchor="end"
                className="erp-svg-val is-d2"
              >
                new-parser
              </text>
              <text x="476" y="96" className="erp-svg-sub">
                domains
              </text>
              <text
                x="636"
                y="96"
                textAnchor="end"
                className="erp-svg-val is-ok"
              >
                4
              </text>

              {/* Phone Vault card */}
              <rect
                x="464"
                y="122"
                width="184"
                height="84"
                rx="6"
                className={`erp-svg-box ${keepDomains ? "is-ok-box" : "is-bad-box"}`}
              />
              <text x="476" y="140" className="erp-svg-who is-d2">
                Phone
              </text>
              <text x="636" y="140" textAnchor="end" className="erp-svg-sub">
                vault
              </text>
              <line
                x1="476"
                y1="147"
                x2="636"
                y2="147"
                className="erp-svg-divider"
              />
              <text x="476" y="166" className="erp-svg-sub">
                pitch
              </text>
              <text
                x="636"
                y="166"
                textAnchor="end"
                className="erp-svg-val is-d2"
              >
                new-parser
              </text>
              <text x="476" y="190" className="erp-svg-sub">
                domains
              </text>
              <text
                x="636"
                y="190"
                textAnchor="end"
                className={`erp-svg-val ${keepDomains ? "is-ok" : "is-bad"}`}
              >
                {keepDomains ? "4" : "0 (lost)"}
              </text>
            </g>
          </svg>
        </div>

        <div className="erp-actions">
          <button
            type="button"
            className="erp-btn is-primary"
            disabled={step >= 4}
            onClick={() => setStep((s) => Math.min(4, s + 1))}
          >
            Step
          </button>
          <button
            type="button"
            className="erp-btn"
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
