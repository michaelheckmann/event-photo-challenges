import { useQuery } from "@tanstack/react-query";
import type {
  ChallengeId,
  ChallengesStatsResponse,
} from "../../../shared/challenges";
import type { PhotoListItem } from "../../../shared/photos";

export const delayedChallengesReconciliationMs = 20_000;

export const challengesSummaryQueryKey = (userId: string) =>
  ["challenges", userId] as const;

export const markChallengeCompletedInSummary =
  (challengeId: string, photo: PhotoListItem) =>
  (
    current: ChallengesStatsResponse | undefined,
  ): ChallengesStatsResponse | undefined => {
    if (!current) return current;

    return {
      challenges: current.challenges.map((challenge) => {
        if (challenge.id !== challengeId) return challenge;

        return {
          ...challenge,
          completedByCount: challenge.isCompletedByUser
            ? challenge.completedByCount
            : challenge.completedByCount + 1,
          isCompletedByUser: true,
          isLocked:
            typeof challenge.maxSubmissions === "number" &&
            challenge.completedByCount + 1 >= challenge.maxSubmissions,
          photo,
        };
      }),
    };
  };

export const markChallengeOpenInSummary =
  (challengeId: ChallengeId | string) =>
  (
    current: ChallengesStatsResponse | undefined,
  ): ChallengesStatsResponse | undefined => {
    if (!current) return current;

    return {
      challenges: current.challenges.map((challenge) => {
        if (challenge.id !== challengeId) return challenge;

        return {
          ...challenge,
          completedByCount: challenge.isCompletedByUser
            ? Math.max(0, challenge.completedByCount - 1)
            : challenge.completedByCount,
          isCompletedByUser: false,
          isLocked:
            typeof challenge.maxSubmissions === "number" &&
            Math.max(0, challenge.completedByCount - 1) >=
              challenge.maxSubmissions,
          photo: null,
        };
      }),
    };
  };

export function useChallengeSummaryQuery(userId: string) {
  return useQuery({
    queryKey: challengesSummaryQueryKey(userId),
    queryFn: async (): Promise<ChallengesStatsResponse> => {
      const params = new URLSearchParams({ userId });
      const response = await fetch(`/api/challenges?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to load challenge stats.");
      return response.json() as Promise<ChallengesStatsResponse>;
    },
    staleTime: 30_000,
  });
}
