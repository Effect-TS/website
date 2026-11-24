import { useEffect, useRef, useState } from "react"
import "./NerdSnipeTree.css"

const MAX_STEP = 6
const VIEW_W = 680
const STEP_X: ReadonlyArray<number> = [140, 224, 346, 362, 466, 486, 600]
const Y_LAPTOP = 64
const Y_PHONE = 136
const VAULT_Y = 184
const VAULT_H = 66
const CARD_Y = 198
const CARD_H = 38

function LaptopGlyph({ x, y }: { x: number; y: number }) {
  return (
    <g
      transform={`translate(${x}, ${y})`}
      fill="none"
      stroke="var(--nst-laptop)"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="0" y="0" width="14" height="9.5" rx="1.5" />
      <path d="M -2 12 L 16 12" />
    </g>
  )
}

function PhoneGlyph({ x, y }: { x: number; y: number }) {
  return (
    <g
      transform={`translate(${x}, ${y})`}
      fill="none"
      stroke="var(--nst-phone)"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="0" y="0" width="9" height="14" rx="2" />
      <line x1="3.5" y1="11.2" x2="5.5" y2="11.2" />
    </g>
  )
}

function VaultGlyph({ x, y }: { x: number; y: number }) {
  return (
    <g
      transform={`translate(${x}, ${y})`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="0" y="0" width="12" height="12" rx="2.5" />
      <circle cx="6" cy="6" r="2.2" />
    </g>
  )
}

export function NerdSnipeTree() {
  const [step, setStep] = useState(0)
  const [shaking, setShaking] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el || el.scrollWidth <= el.clientWidth) return
    const x = STEP_X[step] ?? 140
    const px = (x / VIEW_W) * el.scrollWidth
    const target = Math.max(
      0,
      Math.min(el.scrollWidth - el.clientWidth, px - el.clientWidth * 0.55),
    )
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches
    el.scrollTo({ left: target, behavior: reduced ? "auto" : "smooth" })
  }, [step])

  const goTo = (next: number) => {
    const clamped = Math.max(0, Math.min(MAX_STEP, next))
    setStep(clamped)
    if (clamped === MAX_STEP) {
      setShaking(true)
      setTimeout(() => setShaking(false), 420)
    } else {
      setShaking(false)
    }
  }

  const renderNode = (opts: {
    id: string
    targetStep: number
    device: "laptop" | "phone"
    x: number
    y: number
    label: string
    kind?: "idea" | "online"
    labelPos?: "top" | "right"
  }) => {
    const active = step >= opts.targetStep
    const isNext = step + 1 === opts.targetStep
    const isCurrent = step === opts.targetStep
    const isOnline = opts.kind === "online"
    const labelX = opts.labelPos === "right" ? 13 : 0
    const labelY = opts.labelPos === "right" ? 3.5 : -15
    const anchor = opts.labelPos === "right" ? "start" : "middle"

    if (!active) {
      return (
        <g
          key={opts.id}
          transform={`translate(${opts.x}, ${opts.y})`}
          role="button"
          tabIndex={0}
          aria-label={`Step ${opts.targetStep}: ${opts.device} ${opts.label}`}
          className={`nst-ghost is-${opts.device} ${isNext ? "is-next" : "is-future"} nst-hit`}
          onClick={() => goTo(opts.targetStep)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              goTo(opts.targetStep)
            }
          }}
        >
          {isNext && (
            <circle cx="0" cy="0" r="14" className="nst-ghost-pulse" />
          )}
          <circle
            cx="0"
            cy="0"
            r={isNext ? 8.5 : 6.5}
            className="nst-ghost-dot"
          />
          {isNext && !isOnline && (
            <text x="0" y="3.5" textAnchor="middle" className="nst-ghost-plus">
              +
            </text>
          )}
          <text
            x={labelX}
            y={labelY}
            textAnchor={anchor}
            className="nst-ghost-label"
          >
            {opts.label}
          </text>
        </g>
      )
    }

    const tone = isOnline ? "is-ok" : `is-${opts.device}`

    return (
      <g
        key={opts.id}
        transform={`translate(${opts.x}, ${opts.y})`}
        role="button"
        tabIndex={0}
        aria-label={`Step ${opts.targetStep}: ${opts.device} ${opts.label}`}
        className={`nst-node ${tone} nst-hit`}
        onClick={() => goTo(opts.targetStep)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            goTo(opts.targetStep)
          }
        }}
      >
        {isCurrent && <circle cx="0" cy="0" r="13" className="nst-tip-ring" />}
        <circle cx="0" cy="0" r={isOnline ? 6.5 : 8} className="nst-node-dot" />
        <text
          x={labelX}
          y={labelY}
          textAnchor={anchor}
          className={`nst-node-label ${tone}`}
        >
          {opts.label}
        </text>
      </g>
    )
  }

  return (
    <figure
      className={`nst ${step === MAX_STEP ? "is-closed" : ""}`}
      aria-label="Horizontal timeline: Laptop updates readme-typo to custom lexer in the Vault while online. Both devices enter offline zones and make competing edits (in Rust vs in Zig). Phone comes back online first, updates the Vault to in Zig, and Laptop misses the update while still offline. When Laptop comes back online with in Rust, both values collide in the Vault."
    >
      <div className="nst-scroll" ref={scrollRef}>
        <svg className="nst-svg" viewBox="0 0 680 268" role="img">
          {/* Device labels on the left */}
          <LaptopGlyph x={18} y={57} />
          <text x="40" y="68" className="nst-dev-title is-laptop">
            Laptop
          </text>

          <PhoneGlyph x={21} y={129} />
          <text x="40" y="140" className="nst-dev-title is-phone">
            Phone
          </text>

          {/* Shaded OFFLINE zones (Phone exits earlier than Laptop) */}
          <g className={`nst-zone ${step >= 2 ? "is-active" : ""}`}>
            <rect
              x="280"
              y="26"
              width="266"
              height="66"
              rx="6"
              className="nst-zone-box"
            />
            <text x="289" y="86" className="nst-zone-tag">
              OFFLINE
            </text>
          </g>

          <g className={`nst-zone ${step >= 2 ? "is-active" : ""}`}>
            <rect
              x="280"
              y="100"
              width="154"
              height="66"
              rx="6"
              className="nst-zone-box"
            />
            <text x="289" y="160" className="nst-zone-tag">
              OFFLINE
            </text>
          </g>

          {/* Bottom VAULT bar container background (drawn behind drop lines so drops reach the cards cleanly) */}
          <rect
            x="18"
            y={VAULT_Y}
            width="644"
            height={VAULT_H}
            rx="6"
            className="nst-vault-bg"
          />
          <g
            className="nst-vault-head"
            transform={`translate(28, ${VAULT_Y + 17})`}
          >
            <VaultGlyph x={0} y={0} />
            <text x="16" y="9.5" className="nst-vault-kicker">
              IDEA VAULT
            </text>
            <text x="0" y="26" className="nst-vault-entry">
              readme-typo
            </text>
          </g>

          {/* Horizontal device guide tracks (trimmed cleanly to first/last nodes so nothing crosses) */}
          <line
            x1="140"
            y1={Y_LAPTOP}
            x2="600"
            y2={Y_LAPTOP}
            className="nst-guide"
          />
          <line
            x1="224"
            y1={Y_PHONE}
            x2="486"
            y2={Y_PHONE}
            className="nst-guide"
          />

          {/* Vertical drop wires directly to the top edge of each Vault card */}
          {step >= 1 && (
            <>
              <path
                d={`M 140 ${Y_LAPTOP} L 224 ${Y_LAPTOP}`}
                className="nst-edge is-laptop is-draw"
                pathLength={1}
              />
              <path
                d={`M 224 ${Y_LAPTOP + 8} L 224 ${CARD_Y - 1}`}
                className="nst-drop is-laptop is-draw"
                pathLength={1}
              />
            </>
          )}

          {step >= 5 && (
            <path
              d={`M 486 ${Y_PHONE + 6.5} L 486 ${CARD_Y - 1}`}
              className="nst-drop is-phone is-draw"
              pathLength={1}
            />
          )}

          {step >= 6 && (
            <path
              d={`M 600 ${Y_LAPTOP + 6.5} L 600 ${VAULT_Y + 7}`}
              className="nst-drop is-laptop is-draw"
              pathLength={1}
            />
          )}

          {/* Active horizontal progress segments on Laptop & Phone */}
          {step >= 2 && (
            <path
              d={`M 224 ${Y_LAPTOP} L 346 ${Y_LAPTOP}`}
              className="nst-edge is-laptop is-draw"
              pathLength={1}
            />
          )}
          {step >= 3 && (
            <path
              d={`M 224 ${Y_PHONE} L 362 ${Y_PHONE}`}
              className="nst-edge is-phone is-draw"
              pathLength={1}
            />
          )}
          {step >= 4 && (
            <path
              d={`M 346 ${Y_LAPTOP} L 466 ${Y_LAPTOP}`}
              className="nst-edge is-laptop is-draw"
              pathLength={1}
            />
          )}
          {step >= 5 && (
            <path
              d={`M 362 ${Y_PHONE} L 486 ${Y_PHONE}`}
              className="nst-edge is-phone is-draw"
              pathLength={1}
            />
          )}
          {step >= 6 && (
            <path
              d={`M 466 ${Y_LAPTOP} L 600 ${Y_LAPTOP}`}
              className="nst-edge is-laptop is-draw"
              pathLength={1}
            />
          )}

          {/* Step 0: Starting chore on Laptop (drawn after edges so dot sits cleanly on top) */}
          <g
            transform={`translate(140, ${Y_LAPTOP})`}
            role="button"
            tabIndex={0}
            aria-label="Step 0: Laptop starts on fix typo"
            className="nst-node is-base nst-hit"
            onClick={() => goTo(0)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                goTo(0)
              }
            }}
          >
            <circle cx="0" cy="0" r="6.5" className="nst-root-dot" />
            <text x="0" y="-15" textAnchor="middle" className="nst-root-label">
              fix typo
            </text>
          </g>

          {/* Synced dot on Phone's track (drawn after edges so it sits cleanly on top of both blue & orange lines) */}
          {step >= 1 && (
            <circle
              cx="224"
              cy={Y_PHONE}
              r="4.5"
              className="nst-sync-tick is-laptop"
            />
          )}

          {/* Clickable timeline nodes (strictly left to right) */}
          {renderNode({
            id: "n1",
            targetStep: 1,
            device: "laptop",
            x: 224,
            y: Y_LAPTOP,
            label: "custom lexer",
          })}
          {renderNode({
            id: "n2",
            targetStep: 2,
            device: "laptop",
            x: 346,
            y: Y_LAPTOP,
            label: "custom AST",
          })}
          {renderNode({
            id: "n3",
            targetStep: 3,
            device: "phone",
            x: 362,
            y: Y_PHONE,
            label: "in Zig",
          })}
          {renderNode({
            id: "n4",
            targetStep: 4,
            device: "laptop",
            x: 466,
            y: Y_LAPTOP,
            label: "in Rust",
          })}
          {renderNode({
            id: "n5",
            targetStep: 5,
            device: "phone",
            x: 486,
            y: Y_PHONE,
            label: "online",
            kind: "online",
            labelPos: "right",
          })}
          {renderNode({
            id: "n6",
            targetStep: 6,
            device: "laptop",
            x: 600,
            y: Y_LAPTOP,
            label: "online",
            kind: "online",
          })}

          {/* Vault state cards & connectors */}
          <g className="nst-vault-bar">
            {/* Vault empty state at Step 0 */}
            {step === 0 && (
              <g
                transform={`translate(182, ${CARD_Y})`}
                className="nst-vcard is-empty"
              >
                <rect
                  x="0"
                  y="0"
                  width="94"
                  height={CARD_H}
                  rx="6"
                  className="nst-vcard-box"
                />
                <text
                  x="47"
                  y="23"
                  textAnchor="middle"
                  className="nst-vcard-text"
                >
                  empty
                </text>
              </g>
            )}

            {/* Vault state 1: custom lexer */}
            {step >= 1 && (
              <g
                transform={`translate(182, ${CARD_Y})`}
                role="button"
                tabIndex={0}
                aria-label="Step 1: custom lexer in Vault"
                className="nst-vcard is-laptop nst-hit nst-pop"
                onClick={() => goTo(1)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    goTo(1)
                  }
                }}
              >
                <rect
                  x="0"
                  y="0"
                  width="94"
                  height={CARD_H}
                  rx="6"
                  className="nst-vcard-box"
                />
                <text
                  x="47"
                  y="23"
                  textAnchor="middle"
                  className="nst-vcard-text"
                >
                  custom lexer
                </text>
              </g>
            )}

            {/* Unchanged continuation while both devices are offline */}
            {step >= 2 && (
              <line
                x1="277.5"
                y1={CARD_Y + CARD_H / 2}
                x2={step >= 5 ? 444.5 : 434}
                y2={CARD_Y + CARD_H / 2}
                className="nst-vlink is-dashed"
              />
            )}

            {/* Vault state 5: in Zig (Phone reconnects first) */}
            {step >= 5 && (
              <g
                transform={`translate(446, ${CARD_Y})`}
                role="button"
                tabIndex={0}
                aria-label="Step 5: in Zig in Vault"
                className="nst-vcard is-phone nst-hit nst-pop"
                onClick={() => goTo(5)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    goTo(5)
                  }
                }}
              >
                <rect
                  x="0"
                  y="0"
                  width="80"
                  height={CARD_H}
                  rx="6"
                  className="nst-vcard-box"
                />
                <text
                  x="40"
                  y="23"
                  textAnchor="middle"
                  className="nst-vcard-text"
                >
                  in Zig
                </text>
              </g>
            )}

            {/* Connector 5 -> 6 */}
            {step >= 6 && (
              <line
                x1="527.5"
                y1={CARD_Y + CARD_H / 2}
                x2="544.5"
                y2={CARD_Y + CARD_H / 2}
                className="nst-vlink is-stop"
              />
            )}

            {/* Vault state 6: split colliding card (in Rust vs in Zig) */}
            {step >= 6 && (
              <g
                transform={`translate(546, ${VAULT_Y + 8})`}
                className={`nst-vcard is-stop nst-pop ${shaking ? "is-shake" : ""}`}
              >
                <rect
                  x="0"
                  y="0"
                  width="106"
                  height="50"
                  rx="6"
                  className="nst-vcard-box"
                />
                <rect
                  x="4"
                  y="4"
                  width="98"
                  height="20"
                  rx="4"
                  className="nst-split is-laptop"
                />
                <text
                  x="53"
                  y="17.5"
                  textAnchor="middle"
                  className="nst-split-text is-laptop"
                >
                  in Rust
                </text>
                <rect
                  x="4"
                  y="26"
                  width="98"
                  height="20"
                  rx="4"
                  className="nst-split is-phone"
                />
                <text
                  x="53"
                  y="39.5"
                  textAnchor="middle"
                  className="nst-split-text is-phone"
                >
                  in Zig
                </text>
                <g transform="translate(103, 3)">
                  <circle cx="0" cy="0" r="7.5" className="nst-conflict-dot" />
                  <text
                    x="0"
                    y="3.2"
                    textAnchor="middle"
                    className="nst-conflict-x"
                  >
                    ✕
                  </text>
                </g>
              </g>
            )}
          </g>
        </svg>
      </div>

      <div className="nst-bar">
        <div className="nst-actions">
          <button
            type="button"
            className="nst-btn is-primary"
            disabled={step >= MAX_STEP}
            onClick={() => goTo(step + 1)}
          >
            Step
          </button>
          <button
            type="button"
            className="nst-btn"
            disabled={step === 0}
            onClick={() => goTo(0)}
          >
            Reset
          </button>
        </div>
      </div>
    </figure>
  )
}
