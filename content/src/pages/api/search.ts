import type { APIRoute } from "astro";
import Mixedbread from "@mixedbread/sdk";

export const prerender = false;

const mxbai = new Mixedbread({
  apiKey: import.meta.env.MXBAI_API_KEY,
});

export const GET: APIRoute = async ({ request, url }) => {
  // Validate environment variables
  if (!import.meta.env.MXBAI_API_KEY || !import.meta.env.MXBAI_VECTOR_STORE_ID) {
    return new Response(JSON.stringify({ error: "Environment setup failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Get search query
  const query = url.searchParams.get("query");
  if (!query) {
    return new Response(JSON.stringify({ error: "Query parameter is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Search vector store
    const response = await mxbai.vectorStores.search({
      query,
      vector_store_identifiers: [import.meta.env.MXBAI_VECTOR_STORE_ID],
      top_k: 10,
      search_options: {
        return_metadata: true,
      },
    });

    // Transform results to match expected format
    const results = response.data.map((item, index) => ({
      id: `result-${index}`,
      title: item.metadata?.title || "Untitled",
      content: item.metadata?.description || item.text || "",
      url: item.metadata?.url || "#",
      score: item.score || 0,
    }));

    return new Response(JSON.stringify(results), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Search error:", error);
    return new Response(JSON.stringify({ error: "Search failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
