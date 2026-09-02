import type { Translation } from "../i18n-types";

const en = {
  common: {
    actions: {
      close: "Close",
      deleteOwnPhoto: "Delete my photo",
      downloadPhoto: "Download photo",
      join: "Join",
      retry: "Try again",
    },
    labels: {
      english: "English",
      german: "Deutsch",
      language: "Language",
      name: "Name",
    },
    messages: {
      challengePhotoAlt: "Challenge photo: {caption}",
      enterName: "Please enter your name.",
      enterNameBeforeUpload: "Please enter your name before uploading photos.",
      photoBy: "Photo by {uploadedBy}",
      uploadFailed: "Upload failed.",
    },
    placeholders: {
      name: "Enter your name",
    },
    views: {
      challenges: "Challenges",
      photos: "Gallery",
      settings: "Settings",
    },
  },
  settings: {
    archiveDescription:
      "Download every image from the gallery together as a ZIP file.",
    archiveDownload: "Download all photos",
    archiveEmpty: "There are no photos to download yet.",
    archiveEmptyDownload: "No photos to download",
    archiveError: "The download could not be loaded.",
    archivePreparing:
      "Preparing the archive with {imageCount} image{{imageCount:s}} …",
    archiveSummary:
      "{imageCount} image{{imageCount:s}} · {downloadSize} download",
    archiveTitle: "All photos",
    languageDescription: "Choose the language the app should be displayed in.",
    nameDescription:
      "Your name personalizes the experience and helps identify you in the gallery. It is visible to other guests.",
  },
  photos: {
    gallery: {
      emptyDescription:
        "Tap the plus button and choose one or more images to fill the gallery.",
      emptyTitle: "No photos yet.",
      endReached: "All photos loaded.",
      loadErrorTitle: "Couldn't load photos.",
    },
    uploadButtonAriaLabel: "Upload photos",
  },
  challenges: {
    difficulty: {
      easy: "Easy",
      extreme: "Extreme",
      hard: "Hard",
      medium: "Medium",
    },
    solvedState: {
      catchUp: "Catch up",
      first: "Be the first",
      keepUp: "Keep up",
      locked: "All spots taken",
    },
  },
  uploadStatus: {
    completeTitle: "Upload complete",
    failedTitle: "Some uploads failed",
    subtitleCompleted: "{completedCount} of {totalCount} uploaded",
    subtitleWithFailures:
      "{completedCount} of {totalCount} uploaded, {failedCount} failed",
    uploadingTitle: "Uploading {count} photo{{count:s}}",
  },
  errors: {
    challengeAlreadyCompleted: "You have already completed this challenge.",
    challengeLocked:
      "This challenge is full. If someone removes their photo, a spot opens again.",
    challengeStatsLoadFailed: "Couldn't load challenge stats.",
    deletePhotoNotAllowed:
      "This browser no longer has the deletion key for this photo.",
    emptyPhotoFile: "The photo file is empty.",
    generic: "Something went wrong.",
    imageUploadsOnly: "Only image uploads are supported.",
    photoFileRequired: "A photo file is required.",
    photoStoreFailed: "The photo could not be stored.",
    requestFailed: "The request could not be completed.",
    uploadedByRequired: "Please enter your name.",
    userIdRequired: "The request could not be linked to your user.",
    userIdRequiredForChallengeUpload:
      "A user ID is required for challenge uploads.",
  },
} satisfies Translation;

export default en;
