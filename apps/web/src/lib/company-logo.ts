const companyLogoUrls = import.meta.glob<string>(
  "/src/assets/company-logos/**/*",
  {
    query: "?url",
    import: "default",
    eager: true,
  },
)

export function getCompanyLogoUrl(filename: string): string | undefined {
  return Object.entries(companyLogoUrls).find(([path]) =>
    path.endsWith(`/${filename}`),
  )?.[1]
}
