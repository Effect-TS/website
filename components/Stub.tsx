import { FC } from "react"
import { Callout } from "nextra-theme-docs"

export const Stub: FC = () => (
  <>
    <Callout emoji="🚨">
      This page is a stub. Help us expand it by contributing!
    </Callout>
    <p className="nx-mt-6 nx-leading-7 first:nx-mt-0">
      To contribute to the documentation, please join our Discord community
      at&nbsp;
      <a
        href="https://discord.com/channels/795981131316985866/848185224356691978"
        target="_blank"
        rel="noreferrer"
        className="nx-text-primary-600 nx-underline nx-decoration-from-font [text-underline-position:from-font]"
      >
        the Docs channel
        <span className="nx-sr-only"> (opens in a new tab)</span>
      </a>
      &nbsp;and let us know which part of the documentation you would like to
      contribute to. We appreciate your help in improving our library&apos;s
      documentation. Thank you!
    </p>
  </>
)
