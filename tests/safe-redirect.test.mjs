// Run with `npm test` (Node's built-in runner; Node 24 strips the TS types).
import { test } from "node:test";
import assert from "node:assert/strict";
import { safeNext } from "../lib/safe-redirect.ts";

test("allows internal paths", () => {
  for (const p of ["/profile", "/checkout", "/some/internal/path", "/payment/return?orderId=abc"]) {
    assert.equal(safeNext(p), p);
  }
});

test("rejects external and ambiguous targets", () => {
  for (const p of [
    "https://evil.example",
    "http://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/\t/evil.example",
    "javascript:alert(1)",
    "evil.example",
    "",
    null,
    undefined,
  ]) {
    assert.equal(safeNext(p), "/profile", `should reject ${JSON.stringify(p)}`);
  }
});
