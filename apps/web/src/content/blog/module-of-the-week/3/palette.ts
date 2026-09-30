// Colors for the people in this post's visuals, from the Okabe-Ito palette so
// they stay distinguishable with the common kinds of color blindness.
//
// `avatar` is dark enough for white initials in both themes. `light` and `dark`
// are for names and bars drawn straight onto the page background.
export const people = {
  Sebastian: { avatar: "#0072b2", light: "#0072b2", dark: "#56b4e9" },
  Mattia: { avatar: "#d55e00", light: "#d55e00", dark: "#e69f00" },
  Mike: { avatar: "#007a5e", light: "#007a5e", dark: "#3cc39b" },
  Tim: { avatar: "#a3527f", light: "#a3527f", dark: "#cc79a7" },
  Giulio: { avatar: "#8a6d00", light: "#8a6d00", dark: "#f0e442" },
} as const

export type Person = keyof typeof people

// Okabe-Ito yellow, for "something went wrong" tags.
export const warning = { background: "#f0e442", text: "#1f1f1f" }
