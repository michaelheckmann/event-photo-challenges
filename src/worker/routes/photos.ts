import { Hono } from "hono";
import {
  DEFAULT_PHOTOS_PAGE_SIZE,
  MAX_PHOTO_UPLOAD_BYTES,
  MAX_PHOTOS_PAGE_SIZE,
  type PhotosPage,
  type UploadPhotoResponse,
} from "../../shared/photos";
import {
  getChallengeMaxSubmissions,
  isChallengeId,
  type ChallengeId,
} from "../../shared/challenges";
import {
  hasUserCompletedChallenge,
  recordCompletion,
  removeCompletion,
} from "../lib/challenge-completions";
import {
  createPhotoKey,
  isValidImageFile,
  toPhotoListItem,
  warmPhotoVariants,
} from "../lib/photo-storage";
import {
  getPhotoArchiveMetadata,
  markPhotoArchiveDirty,
  PHOTO_ARCHIVE_KEYS,
} from "../lib/photo-archive";
import {
  deleteCaptionedPhotoVariants,
  ensureCaptionedPhoto,
  generateCaptionedPhotoVariants,
  isCaptionLocale,
} from "../lib/captioned-photos";
import {
  createDeletionToken,
  deletionTokenMatches,
  hashDeletionToken,
  readBearerToken,
} from "../lib/deletion-tokens";

export const photosRoutes = new Hono<{ Bindings: Env }>();

const clampPageSize = (raw: string | undefined): number => {
  const value = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(value)) return DEFAULT_PHOTOS_PAGE_SIZE;
  return Math.min(MAX_PHOTOS_PAGE_SIZE, Math.max(1, value));
};

const readStringField = (data: FormData, field: string): string | undefined => {
  const value = data.get(field);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
};

const parseDate = (raw: string | undefined): string | undefined => {
  if (!raw) return undefined;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const getChallengeId = (object: R2Object): ChallengeId | undefined => {
  const challengeId = object.customMetadata?.challengeId;
  return challengeId && isChallengeId(challengeId) ? challengeId : undefined;
};

const toImageResponse = (
  object: R2ObjectBody,
  cacheControl: string,
): Response => {
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("cache-control", cacheControl);
  headers.set("etag", object.httpEtag);
  return new Response(object.body, { headers });
};

const countChallengeSubmissions = async (
  bucket: R2Bucket,
  challengeId: string,
): Promise<number> => {
  let count = 0;
  let cursor: string | undefined;

  do {
    const result = await bucket.list({
      cursor,
      include: ["customMetadata"],
      limit: 1_000,
    } as R2ListOptions & { include: ["customMetadata"] });

    for (const object of result.objects) {
      if (object.customMetadata?.challengeId === challengeId) count += 1;
    }

    cursor = result.truncated ? result.cursor : undefined;
  } while (cursor);

  return count;
};

photosRoutes.get("/photos", async (c) => {
  const limit = clampPageSize(c.req.query("limit"));
  const cursor = c.req.query("cursor")?.trim() || undefined;

  const result = await c.env.PHOTOS.list({
    cursor,
    include: ["customMetadata"],
    limit,
  } as R2ListOptions & { include: ["customMetadata"] });

  const body: PhotosPage = {
    photos: result.objects.map((obj) =>
      toPhotoListItem(
        c.req.url,
        c.env.CDN_BASE_URL,
        c.env.IMAGE_TRANSFORM_PROVIDER,
        obj,
      ),
    ),
    nextCursor: result.truncated ? (result.cursor ?? null) : null,
  };

  return c.json(body);
});

photosRoutes.get("/photo-archive", async (c) => {
  const metadata = await getPhotoArchiveMetadata(c.env, c.req.url);
  c.header("access-control-allow-origin", "*");
  c.header("cache-control", "no-store");
  return c.json(metadata);
});

const getPhotoArchiveResponse = async (
  bucket: R2Bucket,
  key: string,
): Promise<Response> => {
  const archive = await bucket.get(key);
  if (!archive) {
    return Response.json(
      { message: "The photo archive is still being prepared." },
      { status: 503 },
    );
  }

  const headers = new Headers();
  archive.writeHttpMetadata(headers);
  headers.set("access-control-allow-origin", "*");
  headers.set("etag", archive.httpEtag);
  return new Response(archive.body, { headers });
};

photosRoutes.get("/photo-archive/de.zip", (c) =>
  getPhotoArchiveResponse(c.env.PHOTO_DERIVATIVES, PHOTO_ARCHIVE_KEYS.de),
);

photosRoutes.get("/photo-archive/en.zip", (c) =>
  getPhotoArchiveResponse(c.env.PHOTO_DERIVATIVES, PHOTO_ARCHIVE_KEYS.en),
);

photosRoutes.get("/captioned-photos/:locale/:key", async (c) => {
  const locale = c.req.param("locale");
  if (!isCaptionLocale(locale)) return c.json({ message: "Unknown locale." }, 400);

  const key = c.req.param("key");
  const original = await c.env.PHOTOS.head(key);
  if (!original) return c.notFound();

  const challengeId = getChallengeId(original);
  if (!challengeId)
    return c.json({ message: "This is not a challenge photo." }, 400);

  const derivative = await ensureCaptionedPhoto(
    c.env,
    key,
    challengeId,
    locale,
  );
  return toImageResponse(derivative, "public, max-age=31536000, immutable");
});

photosRoutes.post("/photos", async (c) => {
  const data = await c.req.formData();
  const file = data.get("file") as File | string | null;
  const uploadedBy = readStringField(data, "uploadedBy");
  const uploadedByUserId = readStringField(data, "userId");
  const rawTakenAt = readStringField(data, "takenAt");
  const parsedTakenAt = parseDate(rawTakenAt);
  const takenAt = parsedTakenAt ?? new Date().toISOString();
  const rawChallengeId = readStringField(data, "challengeId");

  if (!(file instanceof File))
    return c.json({ message: "A photo file is required." }, 400);
  if (!uploadedBy) return c.json({ message: "uploadedBy is required." }, 400);
  if (uploadedBy.length > 100)
    return c.json({ message: "uploadedBy must be 100 characters or fewer." }, 400);
  if (uploadedByUserId && uploadedByUserId.length > 100)
    return c.json({ message: "userId must be 100 characters or fewer." }, 400);
  if (rawTakenAt && !parsedTakenAt)
    return c.json({ message: "takenAt must be a valid date." }, 400);
  if (file.size === 0)
    return c.json({ message: "The photo file is empty." }, 400);
  if (file.size > MAX_PHOTO_UPLOAD_BYTES)
    return c.json({ message: "The photo file is too large." }, 413);
  if (!(await isValidImageFile(file)))
    return c.json({ message: "Only image uploads are supported." }, 400);
  if (rawChallengeId && !isChallengeId(rawChallengeId))
    return c.json({ message: "Unknown challenge." }, 400);

  const challengeId = rawChallengeId as ChallengeId | undefined;

  if (challengeId && !uploadedByUserId)
    return c.json(
      { message: "userId is required for challenge uploads." },
      400,
    );

  if (challengeId && uploadedByUserId) {
    const alreadyCompleted = await hasUserCompletedChallenge(
      c.env.CHALLENGES,
      uploadedByUserId,
      challengeId,
    );
    if (alreadyCompleted)
      return c.json(
        { message: "You have already completed this challenge." },
        409,
      );
  }

  if (challengeId) {
    const maxSubmissions = getChallengeMaxSubmissions(challengeId);
    if (typeof maxSubmissions === "number") {
      const submissionCount = await countChallengeSubmissions(
        c.env.PHOTOS,
        challengeId,
      );

      if (submissionCount >= maxSubmissions) {
        return c.json(
          { message: "This challenge is locked because the limit was reached." },
          409,
        );
      }
    }
  }

  const deletionToken = createDeletionToken();
  const deletionTokenHash = await hashDeletionToken(deletionToken);
  const object = await c.env.PHOTOS.put(createPhotoKey(file), file.stream(), {
    customMetadata: {
      deletionTokenHash,
      uploadedBy,
      takenAt,
      ...(uploadedByUserId ? { uploadedByUserId } : {}),
      ...(challengeId ? { challengeId } : {}),
    },
    httpMetadata: {
      cacheControl: "public, max-age=31536000, immutable",
      contentType: file.type || "application/octet-stream",
    },
  });

  if (!object)
    return c.json({ message: "The photo could not be stored." }, 500);

  if (challengeId && uploadedByUserId) {
    await recordCompletion(
      c.env.CHALLENGES,
      uploadedByUserId,
      challengeId,
      object.key,
    );
  }

  const body: UploadPhotoResponse = {
    deletionToken,
    photo: toPhotoListItem(
      c.req.url,
      c.env.CDN_BASE_URL,
      c.env.IMAGE_TRANSFORM_PROVIDER,
      object,
    ),
  };

  const postUploadTasks: Promise<void>[] = [
    warmPhotoVariants(body.photo.urls),
    markPhotoArchiveDirty(c.env.PHOTO_DERIVATIVES),
  ];
  if (challengeId && isChallengeId(challengeId)) {
    postUploadTasks.push(
      generateCaptionedPhotoVariants(c.env, object.key, challengeId),
    );
  }
  c.executionCtx.waitUntil(
    Promise.allSettled(postUploadTasks).then((results) => {
      for (const result of results) {
        if (result.status === "rejected") {
          console.error("Post-upload photo processing failed", {
            key: object.key,
            reason:
              result.reason instanceof Error
                ? result.reason.message
                : String(result.reason),
          });
        }
      }
    }),
  );

  return c.json(body, 201);
});

photosRoutes.delete("/photos/:key{.+}", async (c) => {
  const key = c.req.param("key");
  const deletionToken = readBearerToken(c.req.header("authorization"));
  if (!deletionToken)
    return c.json({ message: "A deletion token is required." }, 401);

  const object = await c.env.PHOTOS.head(key);
  if (!object) return c.notFound();

  const { deletionTokenHash, uploadedByUserId: storedUserId } =
    object.customMetadata ?? {};
  if (
    !deletionTokenHash ||
    !(await deletionTokenMatches(deletionToken, deletionTokenHash))
  ) {
    return c.json(
      { message: "You are not allowed to delete this photo." },
      403,
    );
  }

  const { challengeId } = object.customMetadata ?? {};

  await Promise.all([
    c.env.PHOTOS.delete(key),
    deleteCaptionedPhotoVariants(c.env.PHOTO_DERIVATIVES, key),
  ]);

  if (challengeId && storedUserId) {
    await removeCompletion(c.env.CHALLENGES, storedUserId, challengeId);
  }

  c.executionCtx.waitUntil(markPhotoArchiveDirty(c.env.PHOTO_DERIVATIVES));

  return c.body(null, 204);
});

photosRoutes.get("/photo-objects/*", async (c) => {
  const rawKey = c.req.path.replace("/api/photo-objects/", "");
  const key = decodeURIComponent(rawKey);
  const isDownload = c.req.query("download") === "1";

  if (!key) return c.notFound();

  const object = await c.env.PHOTOS.get(key);
  if (!object) return c.notFound();

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  if (isDownload) {
    headers.set("content-disposition", `attachment; filename="${key}"`);
  }
  if (!headers.has("cache-control"))
    headers.set("cache-control", "public, max-age=3600");

  return new Response(object.body, { headers });
});
