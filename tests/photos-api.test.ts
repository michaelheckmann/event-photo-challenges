import { describe, expect, it, vi } from "vitest";

vi.mock("@cf-wasm/resvg/workerd", () => ({
  Resvg: { async: vi.fn() },
}));

import { photosRoutes } from "../src/worker/routes/photos";
import { hashDeletionToken } from "../src/worker/lib/deletion-tokens";

const executionContext = {
  passThroughOnException: vi.fn(),
  props: {},
  waitUntil: vi.fn(),
} as unknown as ExecutionContext;

const createObject = (customMetadata: Record<string, string>) =>
  ({
    customMetadata,
    httpEtag: "etag",
    key: "photo.jpg",
    size: 10,
    uploaded: new Date("2026-01-01T00:00:00Z"),
  }) as unknown as R2Object;

describe("photo API", () => {
  it("returns a one-time deletion token without exposing internal participant metadata", async () => {
    const data = new FormData();
    data.set("file", new File([new Uint8Array([0xff, 0xd8, 0xff])], "photo.jpg", { type: "image/jpeg" }));
    data.set("uploadedBy", "Ada");
    data.set("userId", "internal-participant-id");

    const photosPut = vi.fn(
      async (key: string, _body: unknown, options: R2PutOptions) =>
        ({
          ...createObject(options.customMetadata ?? {}),
          key,
        }) as unknown as R2Object,
    );
    const env = {
      APP_BASE_URL: "http://localhost",
      CDN_BASE_URL: "",
      CHALLENGES: {},
      IMAGE_TRANSFORM_PROVIDER: "none",
      PHOTOS: { put: photosPut },
      PHOTO_DERIVATIVES: { put: vi.fn().mockResolvedValue({}) },
    } as unknown as Env;

    const response = await photosRoutes.request(
      "/photos",
      { body: data, method: "POST" },
      env,
      executionContext,
    );
    const body = (await response.json()) as {
      deletionToken: string;
      photo: { metadata: Record<string, string> };
    };

    expect(response.status).toBe(201);
    expect(body.deletionToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(body.photo.metadata).toEqual(
      expect.objectContaining({ uploadedBy: "Ada" }),
    );
    expect(body.photo.metadata).not.toHaveProperty("uploadedByUserId");
    expect(body.photo.metadata).not.toHaveProperty("deletionTokenHash");
  });

  it("rejects unknown challenge IDs before touching storage", async () => {
    const data = new FormData();
    data.set("file", new File([new Uint8Array([0xff, 0xd8, 0xff])], "photo.jpg", { type: "image/jpeg" }));
    data.set("uploadedBy", "Ada");
    data.set("userId", "participant");
    data.set("challengeId", "not-configured");

    const response = await photosRoutes.request(
      "/photos",
      { body: data, method: "POST" },
      {} as Env,
      executionContext,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ message: "Unknown challenge." });
  });

  it("rejects content that only claims to be an image", async () => {
    const data = new FormData();
    data.set("file", new File(["not an image"], "photo.jpg", { type: "image/jpeg" }));
    data.set("uploadedBy", "Ada");

    const response = await photosRoutes.request(
      "/photos",
      { body: data, method: "POST" },
      {} as Env,
      executionContext,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      message: "Only image uploads are supported.",
    });
  });

  it("enforces configured challenge submission limits", async () => {
    const data = new FormData();
    data.set("file", new File([new Uint8Array([0xff, 0xd8, 0xff])], "photo.jpg", { type: "image/jpeg" }));
    data.set("uploadedBy", "Ada");
    data.set("userId", "participant");
    data.set("challengeId", "youngest-guest");
    const existing = Array.from({ length: 3 }, (_, index) =>
      createObject({ challengeId: "youngest-guest", index: String(index) }),
    );
    const env = {
      CHALLENGES: { get: vi.fn().mockResolvedValue(null) },
      PHOTOS: {
        list: vi.fn().mockResolvedValue({ objects: existing, truncated: false }),
      },
    } as unknown as Env;

    const response = await photosRoutes.request(
      "/photos",
      { body: data, method: "POST" },
      env,
      executionContext,
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      message: "This challenge is locked because the limit was reached.",
    });
  });

  it("requires a deletion bearer token", async () => {
    const response = await photosRoutes.request(
      "/photos/photo.jpg",
      { method: "DELETE" },
      {} as Env,
      executionContext,
    );

    expect(response.status).toBe(401);
  });

  it("serves archives from stable locale routes", async () => {
    const get = vi.fn().mockResolvedValue({
      body: new ReadableStream(),
      httpEtag: "archive-etag",
      writeHttpMetadata: vi.fn(),
    });
    const response = await photosRoutes.request(
      "/photo-archive/en.zip",
      undefined,
      { PHOTO_DERIVATIVES: { get } } as unknown as Env,
      executionContext,
    );

    expect(response.status).toBe(200);
    expect(get).toHaveBeenCalledWith("archives/event-photos-en.zip");
  });

  it("reports an empty archive without leaving the client polling forever", async () => {
    const response = await photosRoutes.request(
      "/photo-archive",
      undefined,
      {
        PHOTOS: {
          list: vi.fn().mockResolvedValue({ objects: [], truncated: false }),
        },
        PHOTO_DERIVATIVES: {
          head: vi.fn().mockResolvedValue(null),
        },
      } as unknown as Env,
      executionContext,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      downloads: {
        de: { downloadBytes: null, downloadUrl: null },
        en: { downloadBytes: null, downloadUrl: null },
      },
      generatedAt: null,
      imageCount: 0,
      originalBytes: 0,
      status: "empty",
    });
  });

  it("deletes only when the capability matches", async () => {
    const deletionToken = "a-private-deletion-token";
    const photosDelete = vi.fn().mockResolvedValue(undefined);
    const derivativesDelete = vi.fn().mockResolvedValue(undefined);
    const derivativesPut = vi.fn().mockResolvedValue({});
    const env = {
      CHALLENGES: { delete: vi.fn() },
      PHOTOS: {
        delete: photosDelete,
        head: vi.fn().mockResolvedValue(
          createObject({
            deletionTokenHash: await hashDeletionToken(deletionToken),
          }),
        ),
      },
      PHOTO_DERIVATIVES: {
        delete: derivativesDelete,
        put: derivativesPut,
      },
    } as unknown as Env;

    const denied = await photosRoutes.request(
      "/photos/photo.jpg",
      { headers: { authorization: "Bearer wrong" }, method: "DELETE" },
      env,
      executionContext,
    );
    expect(denied.status).toBe(403);
    expect(photosDelete).not.toHaveBeenCalled();

    const deleted = await photosRoutes.request(
      "/photos/photo.jpg",
      { headers: { authorization: `Bearer ${deletionToken}` }, method: "DELETE" },
      env,
      executionContext,
    );
    expect(deleted.status).toBe(204);
    expect(photosDelete).toHaveBeenCalledWith("photo.jpg");
    expect(derivativesDelete).toHaveBeenCalled();
    expect(executionContext.waitUntil).toHaveBeenCalled();
  });
});
