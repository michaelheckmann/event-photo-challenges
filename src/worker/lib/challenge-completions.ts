const userChallengeKey = (userId: string, challengeId: string) =>
  `u:${userId}:${challengeId}`;
const challengeUserKey = (challengeId: string, userId: string) =>
  `c:${challengeId}:${userId}`;

export async function recordCompletion(
  kv: KVNamespace,
  userId: string,
  challengeId: string,
  photoKey: string,
): Promise<void> {
  await Promise.all([
    kv.put(userChallengeKey(userId, challengeId), photoKey),
    kv.put(challengeUserKey(challengeId, userId), photoKey),
  ]);
}

export async function removeCompletion(
  kv: KVNamespace,
  userId: string,
  challengeId: string,
): Promise<void> {
  await Promise.all([
    kv.delete(userChallengeKey(userId, challengeId)),
    kv.delete(challengeUserKey(challengeId, userId)),
  ]);
}

export async function hasUserCompletedChallenge(
  kv: KVNamespace,
  userId: string,
  challengeId: string,
): Promise<boolean> {
  const photoKey =
    (await kv.get(userChallengeKey(userId, challengeId))) ??
    (await kv.get(challengeUserKey(challengeId, userId)));

  return photoKey !== null;
}
