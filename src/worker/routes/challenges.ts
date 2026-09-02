import { Hono } from "hono";
import {
  CHALLENGE_IDS,
  getChallengeMaxSubmissions,
  type ChallengesStatsResponse,
} from "../../shared/challenges";
import type { PhotoListItem } from "../../shared/photos";
import { toPhotoListItem } from "../lib/photo-storage";

export const challengesRoutes = new Hono<{ Bindings: Env }>();
const CHALLENGES_PHOTOS_SCAN_PAGE_SIZE = 1_000;

const challengeIds = new Set<string>(CHALLENGE_IDS);

const listPhotoObjectsWithMetadata = async (
  bucket: R2Bucket,
): Promise<R2Object[]> => {
  const objects: R2Object[] = [];
  let cursor: string | undefined;

  do {
    const result = await bucket.list({
      cursor,
      include: ["customMetadata"],
      limit: CHALLENGES_PHOTOS_SCAN_PAGE_SIZE,
    } as R2ListOptions & { include: ["customMetadata"] });

    objects.push(...result.objects);
    cursor = result.truncated ? result.cursor : undefined;
  } while (cursor);

  return objects;
};

challengesRoutes.get("/challenges", async (c) => {
  const userId = c.req.query("userId")?.trim();
  if (!userId) return c.json({ message: "userId is required." }, 400);

  const countsByChallengeId = new Map<string, number>(
    CHALLENGE_IDS.map((id) => [id, 0]),
  );
  const photoByChallengeId = new Map<string, PhotoListItem>();

  const objects = await listPhotoObjectsWithMetadata(c.env.PHOTOS);
  for (const object of objects) {
    const { challengeId, uploadedByUserId } = object.customMetadata ?? {};
    if (!challengeId || !challengeIds.has(challengeId)) continue;

    countsByChallengeId.set(
      challengeId,
      (countsByChallengeId.get(challengeId) ?? 0) + 1,
    );

    if (uploadedByUserId === userId && !photoByChallengeId.has(challengeId)) {
      photoByChallengeId.set(
        challengeId,
        toPhotoListItem(
          c.req.url,
          c.env.CDN_BASE_URL,
          c.env.IMAGE_TRANSFORM_PROVIDER,
          object,
        ),
      );
    }
  }

  const body: ChallengesStatsResponse = {
    challenges: CHALLENGE_IDS.map((id) => {
      const completedByCount = countsByChallengeId.get(id) ?? 0;
      const maxSubmissions = getChallengeMaxSubmissions(id);

      return {
        id,
        completedByCount,
        isCompletedByUser: photoByChallengeId.has(id),
        isLocked:
          typeof maxSubmissions === "number" &&
          completedByCount >= maxSubmissions,
        maxSubmissions: maxSubmissions ?? null,
        photo: photoByChallengeId.get(id) ?? null,
      };
    }),
  };

  return c.json(body);
});
