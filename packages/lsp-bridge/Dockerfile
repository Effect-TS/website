# syntax=docker/dockerfile:1

FROM node:24-slim AS builder

ARG EFFECT_VERSION=4.1.2
ARG TSGO_VERSION=0.73.2

WORKDIR /app

# Install hoisted runtime dependencies for the bridge server and /workspace/node_modules/effect.
RUN npm init -y >/dev/null 2>&1 \
  && npm install --no-save --omit=dev --no-audit --no-fund \
    "effect@${EFFECT_VERSION}" \
    "@effect/platform-node@${EFFECT_VERSION}"

# Install @effect/tsgo in a scratch directory and extract ONLY the native `tsrs`
# binary plus its sibling `lib.*.d.ts` files, stripping unused `tsc`/`typescript`,
# `oxlint`, `oxlint-tsgolint`, and older `tsrs` versions.
RUN mkdir -p /tmp/tsgo /opt/tsrs \
  && cd /tmp/tsgo \
  && npm init -y >/dev/null 2>&1 \
  && npm install --no-save --omit=dev --no-audit --no-fund "@effect/tsgo@${TSGO_VERSION}" \
  && node -e ' \
    const fs = require("node:fs"); \
    const path = require("node:path"); \
    const pkgDir = path.dirname(require.resolve(`@effect/tsgo-${process.platform}-${process.arch}/package.json`)); \
    const upstreamPath = path.join(pkgDir, "lib", "upstream.json"); \
    const upstream = JSON.parse(fs.readFileSync(upstreamPath, "utf8")); \
    const latest = upstream?.tags?.tsrs?.latest; \
    if (!latest) throw new Error("Missing tags.tsrs.latest in upstream.json"); \
    const srcDir = path.join(pkgDir, "artifacts", "tsrs", latest); \
    for (const entry of fs.readdirSync(srcDir)) { \
      if (entry === "tsrs" || /^lib\..*\.d\.ts$/.test(entry)) { \
        fs.cpSync(path.join(srcDir, entry), path.join("/opt/tsrs", entry)); \
      } \
    } \
    fs.chmodSync("/opt/tsrs/tsrs", 0o555); \
  ' \
  && rm -rf /tmp/tsgo

# Bake the static, read-only /workspace directory (0o555 dirs / 0o444 files)
# with hoisted node_modules/effect and the shared Scratchpad tsconfig.json.
COPY workspace.tsconfig.json /workspace/tsconfig.json
RUN mkdir -p /workspace/node_modules \
  && cp -a /app/node_modules/effect /workspace/node_modules/effect \
  && printf 'export {}\n' > /workspace/main.ts \
  && find /workspace -type d -exec chmod 0555 {} + \
  && find /workspace -type f -exec chmod 0444 {} +

FROM node:24-slim AS runtime

WORKDIR /app

COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /opt/tsrs /opt/tsrs
COPY --from=builder /workspace /workspace
COPY package.json /app/package.json
COPY src /app/src

# Enforce immutable permissions on /workspace in the final image layer.
RUN find /workspace -type d -exec chmod 0555 {} + \
  && find /workspace -type f -exec chmod 0444 {} + \
  && chmod 0555 /opt/tsrs /opt/tsrs/tsrs \
  && find /opt/tsrs -maxdepth 1 -name 'lib.*.d.ts' -exec chmod 0444 {} +

ENV NODE_ENV=production \
  HOST=0.0.0.0 \
  PORT=8787 \
  WORKSPACE_DIR=/workspace \
  TSRS_BIN=/opt/tsrs/tsrs \
  RAYON_NUM_THREADS=1 \
  GOMAXPROCS=1

EXPOSE 8787

USER node

CMD ["node", "/app/src/server.ts"]
