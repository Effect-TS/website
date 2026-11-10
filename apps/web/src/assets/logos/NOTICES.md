# Third-party logo notices

Provenance for the brand marks under `assets/logos/`, `assets/company-logos/`
and `assets/icons/fa7-brands/` that are rendered on the home page. The
public-facing version of this list, including the full licence texts below, is
`/credits` (`src/pages/credits.astro`); keep the two in sync when adding a mark.
Trademarks belong to their owners. A licence on an artwork file is not a
trademark permission; marks are shown to identify the companies they refer to.

| Asset                                                                                                          | Source                                                                                                           | Terms                                                                                                                          | Changes                                                                                                                                                                                    |
| -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `logos/yarn/Yarn.svg`                                                                                          | https://github.com/yarnpkg/assets/blob/master/yarn-kitten-circle.svg                                             | CC BY 4.0 (notice below)                                                                                                       | Unmodified artwork; a source comment was added at the top of the file                                                                                                                      |
| `company-logos/opencode-wordmark-light.svg`, `opencode-wordmark-dark.svg`                                      | https://github.com/anomalyco/opencode/tree/dev/services/site/public/brand/files (also https://opencode.ai/brand) | MIT (notice below); brand guidelines at https://opencode.ai/brand govern variant choice and forbid implying endorsement        | Unmodified                                                                                                                                                                                 |
| `logos/astro/astro-logo-dark.svg` ("Logo on light"), `astro-logo-light-gradient.svg` ("Gradient logo on dark") | https://github.com/withastro/astro.build/tree/main/public/assets/press (https://astro.build/press/)              | Astro press kit guidance: use each file on the background it is named for, do not modify or recolour, render at 24px or larger | Unmodified; rendered at 24px                                                                                                                                                               |
| `logos/cloudflare/cloudflare-logo-white.svg`                                                                   | https://www.cloudflare.com/press-kit/ (`CF_logo_horizontal_singlecolor_wht.svg`)                                 | Cloudflare brand guidelines, https://www.cloudflare.com/trademark/                                                             | CSS class styles rewritten as inline `fill` attributes; paths and colour unchanged                                                                                                         |
| `logos/cloudflare/cloudflare-logo-color.png`                                                                   | https://www.cloudflare.com/press-kit/ (`Logos.zip`, `CF-Logo 1.png`, 512×173)                                    | Cloudflare brand guidelines, https://www.cloudflare.com/trademark/                                                             | Unmodified                                                                                                                                                                                 |
| `company-logos/t3-dark.svg` (black, for light backgrounds), `t3-light.svg` (for dark backgrounds)              | https://github.com/t3-oss/create-t3-app/tree/main/www/public/images                                              | MIT (notice below)                                                                                                             | Unmodified                                                                                                                                                                                 |
| `logos/union-build/union-logo-black.svg`, `union-logo-white.svg`                                               | https://github.com/unionlabs/union/tree/main/site/public                                                         | Dual-licensed MIT / Apache-2.0; used under MIT (notice below)                                                                  | Unmodified                                                                                                                                                                                 |
| `logos/vercel/vercel-logotype-light.svg`, `vercel-logotype-dark.svg`                                           | https://vercel.com/brand (press kit `vercel-assets.zip`)                                                         | Vercel brand guidelines, https://vercel.com/brand                                                                              | Unmodified                                                                                                                                                                                 |
| `logos/spiko/Spiko.svg`                                                                                        | https://www.spiko.io/spiko-logo.svg                                                                              | Spiko                                                                                                                          | Unmodified; published with `currentColor` fills                                                                                                                                            |
| `company-logos/x-logo.svg`                                                                                     | https://about.x.com/en/who-we-are/brand-toolkit                                                                  | X brand toolkit (black and white marks)                                                                                        | Fill set to `currentColor` so the published black/white glyph follows the theme                                                                                                            |
| `icons/fa7-brands/*.svg` (including `x-twitter.svg` used in the testimonials)                                  | Font Awesome Free, Brands set, via https://github.com/iconify/icon-sets (`fa7-brands`)                           | CC BY 4.0 (notice below)                                                                                                       | Generated by `icons:generate`; unmodified paths                                                                                                                                            |
| `company-logos/masterclass-noM.svg`, `logos/masterclass/Masterclass.svg`                                       | Existing white wordmark artwork in this repository                                                               | MasterClass                                                                                                                    | Verified white artwork shown in dark mode only; no published light-background variant has been obtained, so light mode shows the company name as text                                      |
| `logos/total-typescript/TotalTypescript.png`                                                                   | https://www.totaltypescript.com/                                                                                 | Total TypeScript (Matt Pocock)                                                                                                 | Unmodified                                                                                                                                                                                 |
| `logos/bun/Bun.svg`, `logos/pnpm/Pnpm.svg`, `logos/deno/Deno.svg`                                              | Existing marks in this repository                                                                                | Respective projects                                                                                                            | A full-canvas `clipPath` (no visual effect) was removed from each so the inlined files share no ids; paths and colours unchanged. pnpm's neutral cells and deno's glyph use `currentColor` |

## Yarn kitten logo (CC BY 4.0)

Yarn logo by the Yarn contributors, from https://github.com/yarnpkg/assets,
licensed under the Creative Commons Attribution 4.0 International licence,
https://creativecommons.org/licenses/by/4.0/. The file
`logos/yarn/Yarn.svg` is `yarn-kitten-circle.svg` with the artwork unmodified.

## Font Awesome Free brand icons (CC BY 4.0)

Brand icons under `icons/fa7-brands/` are from Font Awesome Free by Dave Gandy
and Fonticons, Inc., https://fontawesome.com, licensed under the Creative
Commons Attribution 4.0 International licence,
https://creativecommons.org/licenses/by/4.0/. Paths unmodified.

## OpenCode wordmark (MIT)

```
MIT License

Copyright (c) 2025 opencode

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

OpenCode and the OpenCode logo are trademarks of Anomaly; the MIT licence does
not grant trademark rights. Usage follows https://opencode.ai/brand.

## T3 logo (MIT)

```
MIT License

Copyright (c) 2022 Shoubhit Dash

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Union logo (MIT, from the MIT / Apache-2.0 dual licence)

```
MIT License

Copyright (c) 2024 Union.fi Labs, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
