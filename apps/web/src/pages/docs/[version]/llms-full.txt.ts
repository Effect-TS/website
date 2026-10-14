import { scopeEndpoint, scopeStaticPaths } from "@/features/llms/http"

export const prerender = true

export const getStaticPaths = () => scopeStaticPaths("docs")

export const GET = scopeEndpoint("docs", "full")
