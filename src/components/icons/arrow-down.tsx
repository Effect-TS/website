import { FC } from "react"

export const ArrowDownIcon: FC<{ className: string }> = ({ className }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 8 16"
      className={`fill-current ${className}`}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4 0C4.41422 0 4.75 0.335786 4.75 0.75V13.3401L6.70041 11.2397C6.98226 10.9361 7.45681 10.9186 7.76034 11.2004C8.06387 11.4823 8.08145 11.9568 7.7996 12.2603L4.5496 15.7603C4.40769 15.9132 4.20855 16 4 16C3.79145 16 3.59232 15.9132 3.45041 15.7603L0.200408 12.2603C-0.081444 11.9568 -0.0638681 11.4823 0.239665 11.2004C0.543198 10.9186 1.01775 10.9361 1.2996 11.2397L3.25 13.3401V0.75C3.25 0.335786 3.58579 0 4 0Z"
      />
    </svg>
  )
}
