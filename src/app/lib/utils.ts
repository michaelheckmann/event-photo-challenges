import { useWindowScroll } from "@mantine/hooks";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { TranslationFunctions } from "../i18n/i18n-types";

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

export const useScrollOffset = (offset: number) => {
  const [scroll] = useWindowScroll();
  return scroll.y > offset;
};

export const translateAppError = (
  LL: TranslationFunctions,
  message: string,
) => {
  const normalized = message.trim();

  if (
    normalized === "Failed to fetch" ||
    normalized === "Load failed" ||
    normalized === "NetworkError when attempting to fetch resource."
  ) {
    return LL.errors.requestFailed();
  }

  const knownMessages: Record<string, string> = {
    "A photo file is required.": LL.errors.photoFileRequired(),
    "Failed to load challenge stats.": LL.errors.challengeStatsLoadFailed(),
    "Only image uploads are supported.": LL.errors.imageUploadsOnly(),
    "Something went wrong.": LL.errors.generic(),
    "The photo could not be stored.": LL.errors.photoStoreFailed(),
    "The photo file is empty.": LL.errors.emptyPhotoFile(),
    "The request could not be completed.": LL.errors.requestFailed(),
    "A deletion token is required.": LL.errors.deletePhotoNotAllowed(),
    "You are not allowed to delete this photo.":
      LL.errors.deletePhotoNotAllowed(),
    "You have already completed this challenge.":
      LL.errors.challengeAlreadyCompleted(),
    "This challenge is locked because the limit was reached.":
      LL.errors.challengeLocked(),
    "uploadedBy is required.": LL.errors.uploadedByRequired(),
    "userId is required for challenge uploads.":
      LL.errors.userIdRequiredForChallengeUpload(),
    "userId is required.": LL.errors.userIdRequired(),
  };

  return knownMessages[normalized] ?? normalized;
};
