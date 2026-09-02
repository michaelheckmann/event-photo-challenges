import { describe, expect, it } from "vitest";
import {
  createDeletionToken,
  deletionTokenMatches,
  hashDeletionToken,
  readBearerToken,
} from "../src/worker/lib/deletion-tokens";

describe("photo deletion capabilities", () => {
  it("generates unique URL-safe tokens and stores verifiable hashes", async () => {
    const first = createDeletionToken();
    const second = createDeletionToken();
    const hash = await hashDeletionToken(first);

    expect(first).not.toBe(second);
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    await expect(deletionTokenMatches(first, hash)).resolves.toBe(true);
    await expect(deletionTokenMatches(second, hash)).resolves.toBe(false);
  });

  it("accepts only bearer authorization", () => {
    expect(readBearerToken("Bearer secret-token")).toBe("secret-token");
    expect(readBearerToken("Basic secret-token")).toBeUndefined();
    expect(readBearerToken(undefined)).toBeUndefined();
  });
});
