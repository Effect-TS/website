import { type ExpressiveCodePlugin, PluginTexts } from "@expressive-code/core"
import { h, select } from "@expressive-code/core/hast"
import jsModule from "./open-in-playground/js-module.min"

const pluginTexts = new PluginTexts({
  openInPlaygroundButtonTooltip: "Open in the Effect Playground"
})

export function pluginOpenInPlayground(): ExpressiveCodePlugin {
  return {
    name: "OpenInPlayground",
    jsModules: [jsModule],
    baseStyles: ({ cssVar }) => {
      const openInPlaygroundSvg = [
        `<svg xmlns='http://www.w3.org/2000/svg' xml:space='preserve' viewBox='0 0 996 1000' fill-rule='evenodd' stroke-linejoin='round' stroke-miterlimit='2' clip-rule='evenodd'>`,
        `<path d='M32.579 704.971c10.261-17.288 32.954-23.125 50.689-13.25l413.97 235.225 415.187-234.383c17.738-9.884 42.721-2.905 50.692 13.25 7.537 19.758 4.008 39.483-13.779 49.387l-431.055 240c-8.996 5.017-19.254 5.975-28.508 3.462a37.92 37.92 0 0 1-12.358-4.295L46.375 754.371c-17.805-9.917-24.08-32.025-13.796-49.4Zm961.875-410.403c.433 13.963-5.354 26.383-18.525 33.721l-129.975 72.362 118.058 66.482c13.321 7.5 20.409 21.667 19.301 35.813 1.029 14.579-4.551 27.692-18.017 35.287L519.029 789.517c-9.316 5.254-19.937 6.258-29.512 3.625a38.612 38.612 0 0 1-12.804-4.5L30.464 537.358c-13.322-7.5-20.406-21.687-19.294-35.837-1.031-14.575 4.543-27.667 18.009-35.263l119.356-67.204-128.679-71.65a39.349 39.349 0 0 1-9.922-7.834 29.94 29.94 0 0 1-3.296-3.723 27.727 27.727 0 0 1-2.682-4.349 67.524 67.524 0 0 1-1.025-2.881l-.685-1.748-.48-1.403a34.029 34.029 0 0 1-.61-2.136l-.302-1.295a37.361 37.361 0 0 1-.831-9.118c-.437-13.963 5.352-26.384 18.522-33.721L474.95 5.085A40.01 40.01 0 0 1 486.933.726a40.304 40.304 0 0 1 18.204.69 40.239 40.239 0 0 1 13.092 4.554l456.392 254.11c.683.378 1.346.777 1.996 1.198.612.389 1.212.788 1.795 1.198.538.389 1.067.788 1.58 1.198a37.917 37.917 0 0 1 4.558 4.251 30.996 30.996 0 0 1 2.962 3.281 27.747 27.747 0 0 1 3.009 4.78c.366.961.7 1.91 1.016 2.871a37.536 37.536 0 0 1 2.917 15.711ZM120.48 501.546l376.758 216.512 376.758-215.112-104.208-59.888L519.525 582.4c-9.533 5.308-20.387 6.333-30.187 3.667a40.25 40.25 0 0 1-13.092-4.555l-251.031-139.77-104.735 59.804Z'/>`,
        `</svg>`
      ].join("")
      const escapedOpenInPlaygroundSvg = openInPlaygroundSvg.replace(/</g, "%3C").replace(/>/g, "%3E")
      const openInPlayground = `url("data:image/svg+xml,${escapedOpenInPlaygroundSvg}")`
      return `
      /* Move the copy button over to make room for the Open in Playground button */
      .copy:has(+ .open-in-playground) {
        inset-inline-end: calc(${cssVar("borderWidth")} + ${cssVar("uiPaddingInline")} / 2 + 3rem);

        @media (hover: hover) {
          inset-inline-end: calc(${cssVar("borderWidth")} + ${cssVar("uiPaddingInline")} / 2 + 2.5rem);
        }
      }

      .open-in-playground {
        display: flex;
        gap: 0.25rem;
        flex-direction: row;
        position: absolute;
        inset-block-start: calc(${cssVar("borderWidth")} + var(--button-spacing));
        inset-inline-end: calc(${cssVar("borderWidth")} + ${cssVar("uiPaddingInline")} / 2);

        /* RTL support: code snippets are always LTR, so the inline copy button
           must match this to avoid overlapping the start of lines */
        direction: ltr;
        unicode-bidi: isolate;

        /* Hide the button when JavaScript is disabled */
        @media (scripting: none) {
          display: none;
        }

        /* If a mouse is available, adjust position for size */
        @media (hover: hover) {
          inset-inline-end: calc(${cssVar("borderWidth")} + ${cssVar("uiPaddingInline")} / 2);
        }

        button {
          position: relative;
          align-self: flex-end;
          margin: 0;
          padding: 0;
          border: none;
          border-radius: 0.2rem;
          z-index: 1;
          cursor: pointer;

          transition-property: opacity, background, border-color;
          transition-duration: 0.2s;
          transition-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94);

          /* Mobile-first styles: Make the button visible and tappable */
          width: 2.5rem;
          height: 2.5rem;
          background: var(--code-background);
          opacity: 0.75;

          div {
            position: absolute;
            inset: 0;
            border-radius: inherit;

            background: ${cssVar("frames.inlineButtonBackground")};
            opacity: ${cssVar("frames.inlineButtonBackgroundIdleOpacity")};

            transition-property: inherit;
            transition-duration: inherit;
            transition-timing-function: inherit;
          }

          &::before {
            content: '';
            position: absolute;
            pointer-events: none;
            inset: 0;
            border-radius: inherit;
            border: ${cssVar('borderWidth')} solid ${cssVar('frames.inlineButtonBorder')};
            opacity: ${cssVar('frames.inlineButtonBorderOpacity')};
          }

          &::after {
            content: '';
            position: absolute;
            pointer-events: none;
            inset: 0;
            background-color: ${cssVar('frames.inlineButtonForeground')};
            -webkit-mask-image: ${openInPlayground};
            -webkit-mask-repeat: no-repeat;
            mask-image: ${openInPlayground};
            mask-repeat: no-repeat;
            margin: 0.475rem;
            line-height: 0;
          }

          /* On hover or focus, make the button fully opaque and set hover/focus 
             background opacity */
          &:hover, &:focus:focus-visible {
            opacity: 1;
            div {
              opacity: ${cssVar("frames.inlineButtonBackgroundHoverOrFocusOpacity")};
            }
          }

          /* On press, set active background opacity */
          &:active {
            opacity: 1;
            div {
              opacity: ${cssVar("frames.inlineButtonBackgroundActiveOpacity")};
            }
          }
        }
      }

      @media (hover: hover) {
        /* If a mouse is available, hide the button by default and make it smaller */
        .open-in-playground button {
          opacity: 0;
          width: 2rem;
          height: 2rem;
        }

        /* Reveal the non-hovered button in the following cases:
          - when the frame is hovered
          - when a sibling inside the frame is focused
          - when the button shows a visible feedback message
        */
        .frame:hover .open-in-playground button:not(:hover),
        .frame:focus-within :focus-visible ~ .open-in-playground button:not(:hover),
        .frame .open-in-playground .feedback.show ~ button:not(:hover) {
          opacity: 0.75;
        }
      }`
    },
    hooks: {
      postprocessRenderedBlock({ codeBlock, locale, renderData }) {
        const isTS = codeBlock.language === "ts"
        const hasTwoslash = /\btwoslash\b/.test(codeBlock.meta)
        const canOpenInPlayground = codeBlock.metaOptions.getBoolean("playground") ?? true
        // Only enable on `ts twoslash` code blocks for now, with the ability
        // to opt-out via the `playground=false` meta argument
        if (isTS && hasTwoslash && canOpenInPlayground) {
          const texts = pluginTexts.get(locale)

          const element = h("div", { className: "open-in-playground" }, [
            h(
              "button",
              {
                title: texts.openInPlaygroundButtonTooltip,
              },
              [h("div")]
            ),
          ])

          const figure = select("figure", renderData.blockAst)
          if (!figure) {
            throw new Error("Unable to find figure element for code frame")
          }
          figure.children.push(element)
          renderData.blockAst = figure
        }
      }
    }
  }
}
