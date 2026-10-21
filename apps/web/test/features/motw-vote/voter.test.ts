import { assert, describe, test } from "vite-plus/test"
import * as ConfigProvider from "effect/ConfigProvider"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import { VoterSigner } from "../../../src/features/motw-vote/voter.ts"

const signerWith = (secret: string) =>
  VoterSigner.layer.pipe(
    Layer.provide(
      ConfigProvider.layer(
        ConfigProvider.fromEnvRecord({ MOTW_VOTE_SECRET: secret }),
      ),
    ),
  )

const withSigner = <A>(
  secret: string,
  use: (signer: VoterSigner["Service"]) => Effect.Effect<A>,
) =>
  Effect.runPromise(
    Effect.flatMap(VoterSigner, use).pipe(Effect.provide(signerWith(secret))),
  )

describe("voter signer", () => {
  test("recognises a voter it issued", () =>
    withSigner("secret", (signer) =>
      Effect.gen(function* () {
        const { id, token } = yield* signer.issue
        assert.deepStrictEqual(signer.verify(token), Option.some(id))
      }),
    ))

  test("issues a different voter each time", () =>
    withSigner("secret", (signer) =>
      Effect.gen(function* () {
        const [a, b] = yield* Effect.all([signer.issue, signer.issue])
        assert.notEqual(a.id, b.id)
      }),
    ))

  test("rejects a changed id or signature, another secret, and junk", async () => {
    const { id, token } = await withSigner("secret", (signer) => signer.issue)
    const [, signature = ""] = token.split(".")
    const other = "99999999-9999-4999-8999-999999999999"
    const invalid = [
      `${other}.${signature}`,
      `${id}.${signature.slice(0, -2)}AA`,
      id,
      `${id}.`,
      `${id}.${signature}.extra`,
      `not-a-uuid.${signature}`,
      "",
    ]
    await withSigner("secret", (signer) =>
      Effect.sync(() => {
        for (const value of invalid)
          assert.isTrue(Option.isNone(signer.verify(value)))
      }),
    )
    await withSigner("another-secret", (signer) =>
      Effect.sync(() => assert.isTrue(Option.isNone(signer.verify(token)))),
    )
  })
})
