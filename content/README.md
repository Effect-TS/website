# Effect Website - Content

## Testing Search in Development

The documents under `src/content/docs/docs` are only indexed into the Mixedbread vector store used to power search on merge to main.

To test search in development, add a `.env` file with the following keys:

```env
export MXBAI_VECTOR_STORE_ID="<mixedbread-vector-store-id>"
export MXBAI_API_KEY="<mixedbread-api-key>"
```

These values can be obtained from the Mixedbread dashboard.
