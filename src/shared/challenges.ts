import { eventConfig, type ChallengeId } from "./event-config";
import type { PhotoListItem } from "./photos";

export { type ChallengeId } from "./event-config";

export const CHALLENGE_IDS = eventConfig.challenges.map(
  (challenge) => challenge.id,
) as ChallengeId[];

const challengesById = new Map(
  eventConfig.challenges.map((challenge) => [challenge.id, challenge]),
);

export const isChallengeId = (value: string): value is ChallengeId =>
  challengesById.has(value as ChallengeId);

export const getChallengeMaxSubmissions = (
  challengeId: string,
): number | undefined => {
  const challenge = challengesById.get(challengeId as ChallengeId);
  return challenge && "maxSubmissions" in challenge
    ? challenge.maxSubmissions
    : undefined;
};

export type ChallengeSummaryItem = {
  id: ChallengeId;
  completedByCount: number;
  isCompletedByUser: boolean;
  isLocked: boolean;
  maxSubmissions: number | null;
  photo: PhotoListItem | null;
};

export type ChallengesStatsResponse = {
  challenges: ChallengeSummaryItem[];
};
