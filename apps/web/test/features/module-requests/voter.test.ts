import { assert, test } from "vite-plus/test"
import {
  NIL_VOTER,
  clearedVoterCookie,
  identify,
  issueVoter,
  verifyVoter,
  voterCookie,
} from "../../../src/features/module-requests/voter.ts"

const secret = "test-secret"

const requestWith = (cookie?: string) =>
  new Request("https://effect.website/api/module-requests", {
    headers: cookie === undefined ? {} : { cookie },
  })

test("a voter it issued is recognised from its cookie value", async () => {
  const { voter, token } = await issueVoter(secret)
  assert.equal(await verifyVoter(secret, token), voter)
  assert.notEqual(voter, NIL_VOTER)
})

test("issues a different voter each time", async () => {
  const [a, b] = await Promise.all([issueVoter(secret), issueVoter(secret)])
  assert.notEqual(a.voter, b.voter)
})

test("blocks a changed id, a changed signature, another secret, and junk", async () => {
  const { voter, token } = await issueVoter(secret)
  const [, signature] = token.split(".")
  const other = "99999999-9999-4999-8999-999999999999"
  assert.isUndefined(await verifyVoter(secret, `${other}.${signature}`))
  assert.isUndefined(
    await verifyVoter(secret, `${voter}.${signature?.slice(0, -2)}AA`),
  )
  assert.isUndefined(await verifyVoter("another-secret", token))
  assert.isUndefined(await verifyVoter(secret, voter))
  assert.isUndefined(await verifyVoter(secret, `${voter}.`))
  assert.isUndefined(await verifyVoter(secret, `${voter}.${signature}.extra`))
  assert.isUndefined(await verifyVoter(secret, `not-a-uuid.${signature}`))
  assert.isUndefined(await verifyVoter(secret, ""))
})

test("identifies a request by its cookie", async () => {
  const { voter, token } = await issueVoter(secret)
  assert.deepEqual(await identify(requestWith(), secret), {
    voter: undefined,
    tampered: false,
  })
  assert.deepEqual(
    await identify(requestWith(`theme=dark; motw_voter=${token}`), secret),
    {
      voter,
      tampered: false,
    },
  )
  assert.deepEqual(
    await identify(requestWith(`motw_voter=${voter}.forged`), secret),
    {
      voter: undefined,
      tampered: true,
    },
  )
})

test("the cookie cannot be read by scripts or sent to other sites", () => {
  const cookie = voterCookie("value", true)
  assert.include(cookie, "HttpOnly")
  assert.include(cookie, "SameSite=Lax")
  assert.include(cookie, "Secure")
  assert.include(cookie, "Path=/api/module-requests")
  assert.notInclude(voterCookie("value", false), "Secure")
  assert.include(clearedVoterCookie(true), "Max-Age=0")
})
