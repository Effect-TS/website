import type { RedirectConfig } from "astro"

// Effect v4 removed the `unstable/` import-path prefix; redirect the old API
// reference URLs to their new locations. Generated from the Effect module move.
export const apiUnstableRedirectList: Record<string, RedirectConfig> = {
  "/docs/v4/api/effect/unstable/ai/AiError": {
    status: 308,
    destination: "/docs/v4/api/effect/ai/AiError",
  },
  "/docs/v4/api/effect/unstable/ai/AnthropicStructuredOutput": {
    status: 308,
    destination: "/docs/v4/api/effect/ai/AnthropicStructuredOutput",
  },
  "/docs/v4/api/effect/unstable/ai/Chat": {
    status: 308,
    destination: "/docs/v4/api/effect/ai/Chat",
  },
  "/docs/v4/api/effect/unstable/ai/Decision": {
    status: 308,
    destination: "/docs/v4/api/effect/ai/Decision",
  },
  "/docs/v4/api/effect/unstable/ai/DecisionModel": {
    status: 308,
    destination: "/docs/v4/api/effect/ai/DecisionModel",
  },
  "/docs/v4/api/effect/unstable/ai/EmbeddingModel": {
    status: 308,
    destination: "/docs/v4/api/effect/ai/EmbeddingModel",
  },
  "/docs/v4/api/effect/unstable/ai/IdGenerator": {
    status: 308,
    destination: "/docs/v4/api/effect/ai/IdGenerator",
  },
  "/docs/v4/api/effect/unstable/ai/LanguageModel": {
    status: 308,
    destination: "/docs/v4/api/effect/ai/LanguageModel",
  },
  "/docs/v4/api/effect/unstable/ai/McpProtocol": {
    status: 308,
    destination: "/docs/v4/api/effect/ai/McpProtocol",
  },
  "/docs/v4/api/effect/unstable/ai/McpSchema": {
    status: 308,
    destination: "/docs/v4/api/effect/ai/McpSchema",
  },
  "/docs/v4/api/effect/unstable/ai/McpServer": {
    status: 308,
    destination: "/docs/v4/api/effect/ai/McpServer",
  },
  "/docs/v4/api/effect/unstable/ai/Model": {
    status: 308,
    destination: "/docs/v4/api/effect/ai/Model",
  },
  "/docs/v4/api/effect/unstable/ai/OpenAiStructuredOutput": {
    status: 308,
    destination: "/docs/v4/api/effect/ai/OpenAiStructuredOutput",
  },
  "/docs/v4/api/effect/unstable/ai/Prompt": {
    status: 308,
    destination: "/docs/v4/api/effect/ai/Prompt",
  },
  "/docs/v4/api/effect/unstable/ai/Response": {
    status: 308,
    destination: "/docs/v4/api/effect/ai/Response",
  },
  "/docs/v4/api/effect/unstable/ai/ResponseIdTracker": {
    status: 308,
    destination: "/docs/v4/api/effect/ai/ResponseIdTracker",
  },
  "/docs/v4/api/effect/unstable/ai/Telemetry": {
    status: 308,
    destination: "/docs/v4/api/effect/ai/Telemetry",
  },
  "/docs/v4/api/effect/unstable/ai/Tokenizer": {
    status: 308,
    destination: "/docs/v4/api/effect/ai/Tokenizer",
  },
  "/docs/v4/api/effect/unstable/ai/Tool": {
    status: 308,
    destination: "/docs/v4/api/effect/ai/Tool",
  },
  "/docs/v4/api/effect/unstable/ai/Toolkit": {
    status: 308,
    destination: "/docs/v4/api/effect/ai/Toolkit",
  },
  "/docs/v4/api/effect/unstable/arbitrary/Arbitrary": {
    status: 308,
    destination: "/docs/v4/api/effect/Arbitrary",
  },
  "/docs/v4/api/effect/unstable/cli/Argument": {
    status: 308,
    destination: "/docs/v4/api/effect/cli/Argument",
  },
  "/docs/v4/api/effect/unstable/cli/CliConfig": {
    status: 308,
    destination: "/docs/v4/api/effect/cli/CliConfig",
  },
  "/docs/v4/api/effect/unstable/cli/CliError": {
    status: 308,
    destination: "/docs/v4/api/effect/cli/CliError",
  },
  "/docs/v4/api/effect/unstable/cli/CliOutput": {
    status: 308,
    destination: "/docs/v4/api/effect/cli/CliOutput",
  },
  "/docs/v4/api/effect/unstable/cli/Command": {
    status: 308,
    destination: "/docs/v4/api/effect/cli/Command",
  },
  "/docs/v4/api/effect/unstable/cli/Completions": {
    status: 308,
    destination: "/docs/v4/api/effect/cli/Completions",
  },
  "/docs/v4/api/effect/unstable/cli/Flag": {
    status: 308,
    destination: "/docs/v4/api/effect/cli/Flag",
  },
  "/docs/v4/api/effect/unstable/cli/GlobalFlag": {
    status: 308,
    destination: "/docs/v4/api/effect/cli/GlobalFlag",
  },
  "/docs/v4/api/effect/unstable/cli/HelpDoc": {
    status: 308,
    destination: "/docs/v4/api/effect/cli/HelpDoc",
  },
  "/docs/v4/api/effect/unstable/cli/Param": {
    status: 308,
    destination: "/docs/v4/api/effect/cli/Param",
  },
  "/docs/v4/api/effect/unstable/cli/Primitive": {
    status: 308,
    destination: "/docs/v4/api/effect/cli/Primitive",
  },
  "/docs/v4/api/effect/unstable/cli/Prompt": {
    status: 308,
    destination: "/docs/v4/api/effect/cli/Prompt",
  },
  "/docs/v4/api/effect/unstable/cluster/ClusterCron": {
    status: 308,
    destination: "/docs/v4/api/effect/cluster/ClusterCron",
  },
  "/docs/v4/api/effect/unstable/cluster/ClusterError": {
    status: 308,
    destination: "/docs/v4/api/effect/cluster/ClusterError",
  },
  "/docs/v4/api/effect/unstable/cluster/ClusterMetrics": {
    status: 308,
    destination: "/docs/v4/api/effect/cluster/ClusterMetrics",
  },
  "/docs/v4/api/effect/unstable/cluster/ClusterSchema": {
    status: 308,
    destination: "/docs/v4/api/effect/cluster/ClusterSchema",
  },
  "/docs/v4/api/effect/unstable/cluster/ClusterWorkflowEngine": {
    status: 308,
    destination: "/docs/v4/api/effect/cluster/ClusterWorkflowEngine",
  },
  "/docs/v4/api/effect/unstable/cluster/DeliverAt": {
    status: 308,
    destination: "/docs/v4/api/effect/cluster/DeliverAt",
  },
  "/docs/v4/api/effect/unstable/cluster/Entity": {
    status: 308,
    destination: "/docs/v4/api/effect/cluster/Entity",
  },
  "/docs/v4/api/effect/unstable/cluster/EntityAddress": {
    status: 308,
    destination: "/docs/v4/api/effect/cluster/EntityAddress",
  },
  "/docs/v4/api/effect/unstable/cluster/EntityId": {
    status: 308,
    destination: "/docs/v4/api/effect/cluster/EntityId",
  },
  "/docs/v4/api/effect/unstable/cluster/EntityProxy": {
    status: 308,
    destination: "/docs/v4/api/effect/cluster/EntityProxy",
  },
  "/docs/v4/api/effect/unstable/cluster/EntityProxyServer": {
    status: 308,
    destination: "/docs/v4/api/effect/cluster/EntityProxyServer",
  },
  "/docs/v4/api/effect/unstable/cluster/EntityResource": {
    status: 308,
    destination: "/docs/v4/api/effect/cluster/EntityResource",
  },
  "/docs/v4/api/effect/unstable/cluster/EntityType": {
    status: 308,
    destination: "/docs/v4/api/effect/cluster/EntityType",
  },
  "/docs/v4/api/effect/unstable/cluster/Envelope": {
    status: 308,
    destination: "/docs/v4/api/effect/cluster/Envelope",
  },
  "/docs/v4/api/effect/unstable/cluster/HttpRunner": {
    status: 308,
    destination: "/docs/v4/api/effect/cluster/HttpRunner",
  },
  "/docs/v4/api/effect/unstable/cluster/K8sHttpClient": {
    status: 308,
    destination: "/docs/v4/api/effect/cluster/K8sHttpClient",
  },
  "/docs/v4/api/effect/unstable/cluster/K8sTypes": {
    status: 308,
    destination: "/docs/v4/api/effect/cluster/K8sTypes",
  },
  "/docs/v4/api/effect/unstable/cluster/MachineId": {
    status: 308,
    destination: "/docs/v4/api/effect/cluster/MachineId",
  },
  "/docs/v4/api/effect/unstable/cluster/Message": {
    status: 308,
    destination: "/docs/v4/api/effect/cluster/Message",
  },
  "/docs/v4/api/effect/unstable/cluster/MessageStorage": {
    status: 308,
    destination: "/docs/v4/api/effect/cluster/MessageStorage",
  },
  "/docs/v4/api/effect/unstable/cluster/Reply": {
    status: 308,
    destination: "/docs/v4/api/effect/cluster/Reply",
  },
  "/docs/v4/api/effect/unstable/cluster/Runner": {
    status: 308,
    destination: "/docs/v4/api/effect/cluster/Runner",
  },
  "/docs/v4/api/effect/unstable/cluster/RunnerAddress": {
    status: 308,
    destination: "/docs/v4/api/effect/cluster/RunnerAddress",
  },
  "/docs/v4/api/effect/unstable/cluster/RunnerHealth": {
    status: 308,
    destination: "/docs/v4/api/effect/cluster/RunnerHealth",
  },
  "/docs/v4/api/effect/unstable/cluster/RunnerServer": {
    status: 308,
    destination: "/docs/v4/api/effect/cluster/RunnerServer",
  },
  "/docs/v4/api/effect/unstable/cluster/RunnerStorage": {
    status: 308,
    destination: "/docs/v4/api/effect/cluster/RunnerStorage",
  },
  "/docs/v4/api/effect/unstable/cluster/Runners": {
    status: 308,
    destination: "/docs/v4/api/effect/cluster/Runners",
  },
  "/docs/v4/api/effect/unstable/cluster/ShardId": {
    status: 308,
    destination: "/docs/v4/api/effect/cluster/ShardId",
  },
  "/docs/v4/api/effect/unstable/cluster/Sharding": {
    status: 308,
    destination: "/docs/v4/api/effect/cluster/Sharding",
  },
  "/docs/v4/api/effect/unstable/cluster/ShardingConfig": {
    status: 308,
    destination: "/docs/v4/api/effect/cluster/ShardingConfig",
  },
  "/docs/v4/api/effect/unstable/cluster/ShardingRegistrationEvent": {
    status: 308,
    destination: "/docs/v4/api/effect/cluster/ShardingRegistrationEvent",
  },
  "/docs/v4/api/effect/unstable/cluster/SingleRunner": {
    status: 308,
    destination: "/docs/v4/api/effect/cluster/SingleRunner",
  },
  "/docs/v4/api/effect/unstable/cluster/Singleton": {
    status: 308,
    destination: "/docs/v4/api/effect/cluster/Singleton",
  },
  "/docs/v4/api/effect/unstable/cluster/SingletonAddress": {
    status: 308,
    destination: "/docs/v4/api/effect/cluster/SingletonAddress",
  },
  "/docs/v4/api/effect/unstable/cluster/Snowflake": {
    status: 308,
    destination: "/docs/v4/api/effect/cluster/Snowflake",
  },
  "/docs/v4/api/effect/unstable/cluster/SocketRunner": {
    status: 308,
    destination: "/docs/v4/api/effect/cluster/SocketRunner",
  },
  "/docs/v4/api/effect/unstable/cluster/SqlMessageStorage": {
    status: 308,
    destination: "/docs/v4/api/effect/cluster/SqlMessageStorage",
  },
  "/docs/v4/api/effect/unstable/cluster/SqlRunnerStorage": {
    status: 308,
    destination: "/docs/v4/api/effect/cluster/SqlRunnerStorage",
  },
  "/docs/v4/api/effect/unstable/cluster/TestRunner": {
    status: 308,
    destination: "/docs/v4/api/effect/cluster/TestRunner",
  },
  "/docs/v4/api/effect/unstable/devtools/DevTools": {
    status: 308,
    destination: "/docs/v4/api/effect/devtools/DevTools",
  },
  "/docs/v4/api/effect/unstable/devtools/DevToolsClient": {
    status: 308,
    destination: "/docs/v4/api/effect/devtools/DevToolsClient",
  },
  "/docs/v4/api/effect/unstable/devtools/DevToolsSchema": {
    status: 308,
    destination: "/docs/v4/api/effect/devtools/DevToolsSchema",
  },
  "/docs/v4/api/effect/unstable/devtools/DevToolsServer": {
    status: 308,
    destination: "/docs/v4/api/effect/devtools/DevToolsServer",
  },
  "/docs/v4/api/effect/unstable/encoding/Ini": {
    status: 308,
    destination: "/docs/v4/api/effect/encoding/Ini",
  },
  "/docs/v4/api/effect/unstable/encoding/Ndjson": {
    status: 308,
    destination: "/docs/v4/api/effect/encoding/Ndjson",
  },
  "/docs/v4/api/effect/unstable/encoding/SchemaBinary": {
    status: 308,
    destination: "/docs/v4/api/effect/encoding/SchemaBinary",
  },
  "/docs/v4/api/effect/unstable/encoding/Sse": {
    status: 308,
    destination: "/docs/v4/api/effect/encoding/Sse",
  },
  "/docs/v4/api/effect/unstable/encoding/Toml": {
    status: 308,
    destination: "/docs/v4/api/effect/encoding/Toml",
  },
  "/docs/v4/api/effect/unstable/encoding/Yaml": {
    status: 308,
    destination: "/docs/v4/api/effect/encoding/Yaml",
  },
  "/docs/v4/api/effect/unstable/eventlog/Event": {
    status: 308,
    destination: "/docs/v4/api/effect/eventlog/Event",
  },
  "/docs/v4/api/effect/unstable/eventlog/EventGroup": {
    status: 308,
    destination: "/docs/v4/api/effect/eventlog/EventGroup",
  },
  "/docs/v4/api/effect/unstable/eventlog/EventJournal": {
    status: 308,
    destination: "/docs/v4/api/effect/eventlog/EventJournal",
  },
  "/docs/v4/api/effect/unstable/eventlog/EventLog": {
    status: 308,
    destination: "/docs/v4/api/effect/eventlog/EventLog",
  },
  "/docs/v4/api/effect/unstable/eventlog/EventLogEncryption": {
    status: 308,
    destination: "/docs/v4/api/effect/eventlog/EventLogEncryption",
  },
  "/docs/v4/api/effect/unstable/eventlog/EventLogMessage": {
    status: 308,
    destination: "/docs/v4/api/effect/eventlog/EventLogMessage",
  },
  "/docs/v4/api/effect/unstable/eventlog/EventLogRemote": {
    status: 308,
    destination: "/docs/v4/api/effect/eventlog/EventLogRemote",
  },
  "/docs/v4/api/effect/unstable/eventlog/EventLogServer": {
    status: 308,
    destination: "/docs/v4/api/effect/eventlog/EventLogServer",
  },
  "/docs/v4/api/effect/unstable/eventlog/EventLogServerEncrypted": {
    status: 308,
    destination: "/docs/v4/api/effect/eventlog/EventLogServerEncrypted",
  },
  "/docs/v4/api/effect/unstable/eventlog/EventLogServerUnencrypted": {
    status: 308,
    destination: "/docs/v4/api/effect/eventlog/EventLogServerUnencrypted",
  },
  "/docs/v4/api/effect/unstable/eventlog/EventLogSessionAuth": {
    status: 308,
    destination: "/docs/v4/api/effect/eventlog/EventLogSessionAuth",
  },
  "/docs/v4/api/effect/unstable/eventlog/SqlEventJournal": {
    status: 308,
    destination: "/docs/v4/api/effect/eventlog/SqlEventJournal",
  },
  "/docs/v4/api/effect/unstable/eventlog/SqlEventLogServerEncrypted": {
    status: 308,
    destination: "/docs/v4/api/effect/eventlog/SqlEventLogServerEncrypted",
  },
  "/docs/v4/api/effect/unstable/eventlog/SqlEventLogServerUnencrypted": {
    status: 308,
    destination: "/docs/v4/api/effect/eventlog/SqlEventLogServerUnencrypted",
  },
  "/docs/v4/api/effect/unstable/http/Cookies": {
    status: 308,
    destination: "/docs/v4/api/effect/http/Cookies",
  },
  "/docs/v4/api/effect/unstable/http/Etag": {
    status: 308,
    destination: "/docs/v4/api/effect/http/Etag",
  },
  "/docs/v4/api/effect/unstable/http/FetchHttpClient": {
    status: 308,
    destination: "/docs/v4/api/effect/http/FetchHttpClient",
  },
  "/docs/v4/api/effect/unstable/http/FindMyWay": {
    status: 308,
    destination: "/docs/v4/api/effect/http/FindMyWay",
  },
  "/docs/v4/api/effect/unstable/http/Headers": {
    status: 308,
    destination: "/docs/v4/api/effect/http/Headers",
  },
  "/docs/v4/api/effect/unstable/http/HttpBody": {
    status: 308,
    destination: "/docs/v4/api/effect/http/HttpBody",
  },
  "/docs/v4/api/effect/unstable/http/HttpClient": {
    status: 308,
    destination: "/docs/v4/api/effect/http/HttpClient",
  },
  "/docs/v4/api/effect/unstable/http/HttpClientError": {
    status: 308,
    destination: "/docs/v4/api/effect/http/HttpClientError",
  },
  "/docs/v4/api/effect/unstable/http/HttpClientRequest": {
    status: 308,
    destination: "/docs/v4/api/effect/http/HttpClientRequest",
  },
  "/docs/v4/api/effect/unstable/http/HttpClientResponse": {
    status: 308,
    destination: "/docs/v4/api/effect/http/HttpClientResponse",
  },
  "/docs/v4/api/effect/unstable/http/HttpEffect": {
    status: 308,
    destination: "/docs/v4/api/effect/http/HttpEffect",
  },
  "/docs/v4/api/effect/unstable/http/HttpIncomingMessage": {
    status: 308,
    destination: "/docs/v4/api/effect/http/HttpIncomingMessage",
  },
  "/docs/v4/api/effect/unstable/http/HttpMethod": {
    status: 308,
    destination: "/docs/v4/api/effect/http/HttpMethod",
  },
  "/docs/v4/api/effect/unstable/http/HttpMiddleware": {
    status: 308,
    destination: "/docs/v4/api/effect/http/HttpMiddleware",
  },
  "/docs/v4/api/effect/unstable/http/HttpPlatform": {
    status: 308,
    destination: "/docs/v4/api/effect/http/HttpPlatform",
  },
  "/docs/v4/api/effect/unstable/http/HttpRouter": {
    status: 308,
    destination: "/docs/v4/api/effect/http/HttpRouter",
  },
  "/docs/v4/api/effect/unstable/http/HttpServer": {
    status: 308,
    destination: "/docs/v4/api/effect/http/HttpServer",
  },
  "/docs/v4/api/effect/unstable/http/HttpServerError": {
    status: 308,
    destination: "/docs/v4/api/effect/http/HttpServerError",
  },
  "/docs/v4/api/effect/unstable/http/HttpServerRequest": {
    status: 308,
    destination: "/docs/v4/api/effect/http/HttpServerRequest",
  },
  "/docs/v4/api/effect/unstable/http/HttpServerRespondable": {
    status: 308,
    destination: "/docs/v4/api/effect/http/HttpServerRespondable",
  },
  "/docs/v4/api/effect/unstable/http/HttpServerResponse": {
    status: 308,
    destination: "/docs/v4/api/effect/http/HttpServerResponse",
  },
  "/docs/v4/api/effect/unstable/http/HttpStaticServer": {
    status: 308,
    destination: "/docs/v4/api/effect/http/HttpStaticServer",
  },
  "/docs/v4/api/effect/unstable/http/HttpStatus": {
    status: 308,
    destination: "/docs/v4/api/effect/http/HttpStatus",
  },
  "/docs/v4/api/effect/unstable/http/HttpTraceContext": {
    status: 308,
    destination: "/docs/v4/api/effect/http/HttpTraceContext",
  },
  "/docs/v4/api/effect/unstable/http/Mime": {
    status: 308,
    destination: "/docs/v4/api/effect/http/Mime",
  },
  "/docs/v4/api/effect/unstable/http/Multipart": {
    status: 308,
    destination: "/docs/v4/api/effect/http/Multipart",
  },
  "/docs/v4/api/effect/unstable/http/MultipartParser": {
    status: 308,
    destination: "/docs/v4/api/effect/http/MultipartParser",
  },
  "/docs/v4/api/effect/unstable/http/MultipartParser/HeadersParser": {
    status: 308,
    destination: "/docs/v4/api/effect/http/MultipartParser/HeadersParser",
  },
  "/docs/v4/api/effect/unstable/http/MultipartParser/Search": {
    status: 308,
    destination: "/docs/v4/api/effect/http/MultipartParser/Search",
  },
  "/docs/v4/api/effect/unstable/http/Template": {
    status: 308,
    destination: "/docs/v4/api/effect/http/Template",
  },
  "/docs/v4/api/effect/unstable/http/Url": {
    status: 308,
    destination: "/docs/v4/api/effect/http/Url",
  },
  "/docs/v4/api/effect/unstable/http/UrlParams": {
    status: 308,
    destination: "/docs/v4/api/effect/http/UrlParams",
  },
  "/docs/v4/api/effect/unstable/httpapi/HttpApi": {
    status: 308,
    destination: "/docs/v4/api/effect/http-api/HttpApi",
  },
  "/docs/v4/api/effect/unstable/httpapi/HttpApiBuilder": {
    status: 308,
    destination: "/docs/v4/api/effect/http-api/HttpApiBuilder",
  },
  "/docs/v4/api/effect/unstable/httpapi/HttpApiClient": {
    status: 308,
    destination: "/docs/v4/api/effect/http-api/HttpApiClient",
  },
  "/docs/v4/api/effect/unstable/httpapi/HttpApiEndpoint": {
    status: 308,
    destination: "/docs/v4/api/effect/http-api/HttpApiEndpoint",
  },
  "/docs/v4/api/effect/unstable/httpapi/HttpApiError": {
    status: 308,
    destination: "/docs/v4/api/effect/http-api/HttpApiError",
  },
  "/docs/v4/api/effect/unstable/httpapi/HttpApiGroup": {
    status: 308,
    destination: "/docs/v4/api/effect/http-api/HttpApiGroup",
  },
  "/docs/v4/api/effect/unstable/httpapi/HttpApiMiddleware": {
    status: 308,
    destination: "/docs/v4/api/effect/http-api/HttpApiMiddleware",
  },
  "/docs/v4/api/effect/unstable/httpapi/HttpApiScalar": {
    status: 308,
    destination: "/docs/v4/api/effect/http-api/HttpApiScalar",
  },
  "/docs/v4/api/effect/unstable/httpapi/HttpApiSchema": {
    status: 308,
    destination: "/docs/v4/api/effect/http-api/HttpApiSchema",
  },
  "/docs/v4/api/effect/unstable/httpapi/HttpApiSecurity": {
    status: 308,
    destination: "/docs/v4/api/effect/http-api/HttpApiSecurity",
  },
  "/docs/v4/api/effect/unstable/httpapi/HttpApiSwagger": {
    status: 308,
    destination: "/docs/v4/api/effect/http-api/HttpApiSwagger",
  },
  "/docs/v4/api/effect/unstable/httpapi/HttpApiTest": {
    status: 308,
    destination: "/docs/v4/api/effect/http-api/HttpApiTest",
  },
  "/docs/v4/api/effect/unstable/httpapi/OpenApi": {
    status: 308,
    destination: "/docs/v4/api/effect/http-api/OpenApi",
  },
  "/docs/v4/api/effect/unstable/net/IpInterface": {
    status: 308,
    destination: "/docs/v4/api/effect/net/IpInterface",
  },
  "/docs/v4/api/effect/unstable/net/IpNetwork": {
    status: 308,
    destination: "/docs/v4/api/effect/net/IpNetwork",
  },
  "/docs/v4/api/effect/unstable/net/NetAddress": {
    status: 308,
    destination: "/docs/v4/api/effect/net/NetAddress",
  },
  "/docs/v4/api/effect/unstable/observability/Otlp": {
    status: 308,
    destination: "/docs/v4/api/effect/observability/Otlp",
  },
  "/docs/v4/api/effect/unstable/observability/OtlpExporter": {
    status: 308,
    destination: "/docs/v4/api/effect/observability/OtlpExporter",
  },
  "/docs/v4/api/effect/unstable/observability/OtlpLogger": {
    status: 308,
    destination: "/docs/v4/api/effect/observability/OtlpLogger",
  },
  "/docs/v4/api/effect/unstable/observability/OtlpMetrics": {
    status: 308,
    destination: "/docs/v4/api/effect/observability/OtlpMetrics",
  },
  "/docs/v4/api/effect/unstable/observability/OtlpResource": {
    status: 308,
    destination: "/docs/v4/api/effect/observability/OtlpResource",
  },
  "/docs/v4/api/effect/unstable/observability/OtlpSerialization": {
    status: 308,
    destination: "/docs/v4/api/effect/observability/OtlpSerialization",
  },
  "/docs/v4/api/effect/unstable/observability/OtlpTracer": {
    status: 308,
    destination: "/docs/v4/api/effect/observability/OtlpTracer",
  },
  "/docs/v4/api/effect/unstable/observability/PrometheusMetrics": {
    status: 308,
    destination: "/docs/v4/api/effect/observability/PrometheusMetrics",
  },
  "/docs/v4/api/effect/unstable/persistence/KeyValueStore": {
    status: 308,
    destination: "/docs/v4/api/effect/persistence/KeyValueStore",
  },
  "/docs/v4/api/effect/unstable/persistence/Persistable": {
    status: 308,
    destination: "/docs/v4/api/effect/persistence/Persistable",
  },
  "/docs/v4/api/effect/unstable/persistence/PersistedCache": {
    status: 308,
    destination: "/docs/v4/api/effect/persistence/PersistedCache",
  },
  "/docs/v4/api/effect/unstable/persistence/PersistedQueue": {
    status: 308,
    destination: "/docs/v4/api/effect/persistence/PersistedQueue",
  },
  "/docs/v4/api/effect/unstable/persistence/Persistence": {
    status: 308,
    destination: "/docs/v4/api/effect/persistence/Persistence",
  },
  "/docs/v4/api/effect/unstable/persistence/RateLimiter": {
    status: 308,
    destination: "/docs/v4/api/effect/persistence/RateLimiter",
  },
  "/docs/v4/api/effect/unstable/persistence/Redis": {
    status: 308,
    destination: "/docs/v4/api/effect/persistence/Redis",
  },
  "/docs/v4/api/effect/unstable/process/ChildProcess": {
    status: 308,
    destination: "/docs/v4/api/effect/process/ChildProcess",
  },
  "/docs/v4/api/effect/unstable/process/ChildProcessSpawner": {
    status: 308,
    destination: "/docs/v4/api/effect/process/ChildProcessSpawner",
  },
  "/docs/v4/api/effect/unstable/reactivity/AsyncResult": {
    status: 308,
    destination: "/docs/v4/api/effect/reactivity/AsyncResult",
  },
  "/docs/v4/api/effect/unstable/reactivity/Atom": {
    status: 308,
    destination: "/docs/v4/api/effect/reactivity/Atom",
  },
  "/docs/v4/api/effect/unstable/reactivity/AtomHttpApi": {
    status: 308,
    destination: "/docs/v4/api/effect/reactivity/AtomHttpApi",
  },
  "/docs/v4/api/effect/unstable/reactivity/AtomRef": {
    status: 308,
    destination: "/docs/v4/api/effect/reactivity/AtomRef",
  },
  "/docs/v4/api/effect/unstable/reactivity/AtomRegistry": {
    status: 308,
    destination: "/docs/v4/api/effect/reactivity/AtomRegistry",
  },
  "/docs/v4/api/effect/unstable/reactivity/AtomRpc": {
    status: 308,
    destination: "/docs/v4/api/effect/reactivity/AtomRpc",
  },
  "/docs/v4/api/effect/unstable/reactivity/Hydration": {
    status: 308,
    destination: "/docs/v4/api/effect/reactivity/Hydration",
  },
  "/docs/v4/api/effect/unstable/reactivity/Reactivity": {
    status: 308,
    destination: "/docs/v4/api/effect/reactivity/Reactivity",
  },
  "/docs/v4/api/effect/unstable/rpc/Rpc": {
    status: 308,
    destination: "/docs/v4/api/effect/rpc/Rpc",
  },
  "/docs/v4/api/effect/unstable/rpc/RpcClient": {
    status: 308,
    destination: "/docs/v4/api/effect/rpc/RpcClient",
  },
  "/docs/v4/api/effect/unstable/rpc/RpcClientError": {
    status: 308,
    destination: "/docs/v4/api/effect/rpc/RpcClientError",
  },
  "/docs/v4/api/effect/unstable/rpc/RpcGroup": {
    status: 308,
    destination: "/docs/v4/api/effect/rpc/RpcGroup",
  },
  "/docs/v4/api/effect/unstable/rpc/RpcMessage": {
    status: 308,
    destination: "/docs/v4/api/effect/rpc/RpcMessage",
  },
  "/docs/v4/api/effect/unstable/rpc/RpcMiddleware": {
    status: 308,
    destination: "/docs/v4/api/effect/rpc/RpcMiddleware",
  },
  "/docs/v4/api/effect/unstable/rpc/RpcSchema": {
    status: 308,
    destination: "/docs/v4/api/effect/rpc/RpcSchema",
  },
  "/docs/v4/api/effect/unstable/rpc/RpcSerialization": {
    status: 308,
    destination: "/docs/v4/api/effect/rpc/RpcSerialization",
  },
  "/docs/v4/api/effect/unstable/rpc/RpcServer": {
    status: 308,
    destination: "/docs/v4/api/effect/rpc/RpcServer",
  },
  "/docs/v4/api/effect/unstable/rpc/RpcTest": {
    status: 308,
    destination: "/docs/v4/api/effect/rpc/RpcTest",
  },
  "/docs/v4/api/effect/unstable/rpc/RpcWorker": {
    status: 308,
    destination: "/docs/v4/api/effect/rpc/RpcWorker",
  },
  "/docs/v4/api/effect/unstable/rpc/Utils": {
    status: 308,
    destination: "/docs/v4/api/effect/rpc/Utils",
  },
  "/docs/v4/api/effect/unstable/schema/Model": {
    status: 308,
    destination: "/docs/v4/api/effect/schema/Model",
  },
  "/docs/v4/api/effect/unstable/schema/SchemaAOTCompiler": {
    status: 308,
    destination: "/docs/v4/api/effect/schema/SchemaAOTCompiler",
  },
  "/docs/v4/api/effect/unstable/schema/SchemaAOTCompiler/Build": {
    status: 308,
    destination: "/docs/v4/api/effect/schema/SchemaAOTCompiler/Build",
  },
  "/docs/v4/api/effect/unstable/schema/SchemaCompiler": {
    status: 308,
    destination: "/docs/v4/api/effect/schema/SchemaCompiler",
  },
  "/docs/v4/api/effect/unstable/schema/SchemaCompiler/runtime": {
    status: 308,
    destination: "/docs/v4/api/effect/schema/SchemaCompiler/runtime",
  },
  "/docs/v4/api/effect/unstable/schema/SchemaJITCompiler": {
    status: 308,
    destination: "/docs/v4/api/effect/schema/SchemaJITCompiler",
  },
  "/docs/v4/api/effect/unstable/schema/SchemaJITCompiler/enable": {
    status: 308,
    destination: "/docs/v4/api/effect/schema/SchemaJITCompiler/enable",
  },
  "/docs/v4/api/effect/unstable/schema/VariantSchema": {
    status: 308,
    destination: "/docs/v4/api/effect/schema/VariantSchema",
  },
  "/docs/v4/api/effect/unstable/socket/Socket": {
    status: 308,
    destination: "/docs/v4/api/effect/socket/Socket",
  },
  "/docs/v4/api/effect/unstable/socket/SocketServer": {
    status: 308,
    destination: "/docs/v4/api/effect/socket/SocketServer",
  },
  "/docs/v4/api/effect/unstable/sql/Migrator": {
    status: 308,
    destination: "/docs/v4/api/effect/sql/Migrator",
  },
  "/docs/v4/api/effect/unstable/sql/SqlClient": {
    status: 308,
    destination: "/docs/v4/api/effect/sql/SqlClient",
  },
  "/docs/v4/api/effect/unstable/sql/SqlConnection": {
    status: 308,
    destination: "/docs/v4/api/effect/sql/SqlConnection",
  },
  "/docs/v4/api/effect/unstable/sql/SqlError": {
    status: 308,
    destination: "/docs/v4/api/effect/sql/SqlError",
  },
  "/docs/v4/api/effect/unstable/sql/SqlModel": {
    status: 308,
    destination: "/docs/v4/api/effect/sql/SqlModel",
  },
  "/docs/v4/api/effect/unstable/sql/SqlResolver": {
    status: 308,
    destination: "/docs/v4/api/effect/sql/SqlResolver",
  },
  "/docs/v4/api/effect/unstable/sql/SqlSchema": {
    status: 308,
    destination: "/docs/v4/api/effect/sql/SqlSchema",
  },
  "/docs/v4/api/effect/unstable/sql/SqlStream": {
    status: 308,
    destination: "/docs/v4/api/effect/sql/SqlStream",
  },
  "/docs/v4/api/effect/unstable/sql/Statement": {
    status: 308,
    destination: "/docs/v4/api/effect/sql/Statement",
  },
  "/docs/v4/api/effect/unstable/workers/Transferable": {
    status: 308,
    destination: "/docs/v4/api/effect/workers/Transferable",
  },
  "/docs/v4/api/effect/unstable/workers/Worker": {
    status: 308,
    destination: "/docs/v4/api/effect/workers/Worker",
  },
  "/docs/v4/api/effect/unstable/workers/WorkerError": {
    status: 308,
    destination: "/docs/v4/api/effect/workers/WorkerError",
  },
  "/docs/v4/api/effect/unstable/workers/WorkerRunner": {
    status: 308,
    destination: "/docs/v4/api/effect/workers/WorkerRunner",
  },
  "/docs/v4/api/effect/unstable/workflow/Activity": {
    status: 308,
    destination: "/docs/v4/api/effect/workflow/Activity",
  },
  "/docs/v4/api/effect/unstable/workflow/DurableClock": {
    status: 308,
    destination: "/docs/v4/api/effect/workflow/DurableClock",
  },
  "/docs/v4/api/effect/unstable/workflow/DurableDeferred": {
    status: 308,
    destination: "/docs/v4/api/effect/workflow/DurableDeferred",
  },
  "/docs/v4/api/effect/unstable/workflow/DurableQueue": {
    status: 308,
    destination: "/docs/v4/api/effect/workflow/DurableQueue",
  },
  "/docs/v4/api/effect/unstable/workflow/Workflow": {
    status: 308,
    destination: "/docs/v4/api/effect/workflow/Workflow",
  },
  "/docs/v4/api/effect/unstable/workflow/WorkflowEngine": {
    status: 308,
    destination: "/docs/v4/api/effect/workflow/WorkflowEngine",
  },
  "/docs/v4/api/effect/unstable/workflow/WorkflowProxy": {
    status: 308,
    destination: "/docs/v4/api/effect/workflow/WorkflowProxy",
  },
  "/docs/v4/api/effect/unstable/workflow/WorkflowProxyServer": {
    status: 308,
    destination: "/docs/v4/api/effect/workflow/WorkflowProxyServer",
  },
}
