import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "../password.ts";

describe("Password Hashing & Verification (Argon2id)", () => {
  it("hashes password with Argon2id and never stores plain text", async () => {
    const rawPassword = "SuperSecretPassword123!";
    const hash = await hashPassword(rawPassword);

    assert.notEqual(hash, rawPassword);
    assert.ok(hash.startsWith("$argon2id$"), "Hash should start with $argon2id$ format identifier");
    assert.ok(hash.length > 50, "Hash should be sufficiently long");
  });

  it("produces unique hashes for identical passwords due to random salting", async () => {
    const password = "SamePasswordUsedTwice";
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    assert.notEqual(hash1, hash2, "Argon2 should generate unique salts on each hash invocation");
  });

  it("verifies matching password successfully", async () => {
    const password = "CorrectUserPassword456";
    const hash = await hashPassword(password);

    const isMatch = await verifyPassword(password, hash);
    assert.equal(isMatch, true);
  });

  it("rejects non-matching password", async () => {
    const password = "CorrectUserPassword456";
    const hash = await hashPassword(password);

    const isMatch = await verifyPassword("WrongPassword789", hash);
    assert.equal(isMatch, false);
  });

  it("safely handles corrupted or malformed hashes without crashing", async () => {
    const isMatch = await verifyPassword("AnyPassword", "not-a-valid-argon2-hash");
    assert.equal(isMatch, false);
  });
});

