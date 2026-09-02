import { describe, expect, it } from "vitest";
import {
  eventConfig,
  validateEventConfig,
  type EventConfig,
} from "../src/shared/event-config";
import {
  formatPhotoTimestamp,
  sanitizeFilenameSegment,
} from "../src/shared/file-names";
import {
  PHOTO_ARCHIVE_DOWNLOAD_PATHS,
  PHOTO_ARCHIVE_KEYS,
} from "../src/worker/lib/photo-archive";

describe("event configuration", () => {
  it("ships a valid, fully localized default configuration", () => {
    expect(validateEventConfig(eventConfig)).toEqual([]);
    const challenge = eventConfig.challenges.find(
      ({ id }) => id === "with-the-hosts",
    );
    expect(challenge?.caption.en).toBe(
      "Photo with the hosts",
    );
    expect(challenge?.caption.de).toBe(
      "Foto mit den Gastgeber:innen",
    );
  });

  it("rejects duplicate challenge IDs and invalid limits", () => {
    const challenge = eventConfig.challenges[0];
    const invalid = {
      ...eventConfig,
      challenges: [
        challenge,
        { ...challenge, maxSubmissions: 0 },
      ],
    } as unknown as EventConfig;

    expect(validateEventConfig(invalid)).toEqual(
      expect.arrayContaining([
        `duplicate challenge id: ${challenge.id}`,
        `maxSubmissions for ${challenge.id} must be a positive integer`,
      ]),
    );
  });

  it("derives generic archive names and routes", () => {
    expect(PHOTO_ARCHIVE_KEYS.en).toBe("archives/event-photos-en.zip");
    expect(PHOTO_ARCHIVE_DOWNLOAD_PATHS.de).toBe(
      "/api/photo-archive/de.zip",
    );
  });
});

describe("download filenames", () => {
  it("sanitizes user-provided filename segments", () => {
    expect(sanitizeFilenameSegment("  Ada / Lovelace  ")).toBe("Ada-Lovelace");
    expect(sanitizeFilenameSegment("***")).toBe("Unknown");
  });

  it("formats timestamps deterministically", () => {
    expect(formatPhotoTimestamp("2026-08-12T17:03:04Z")).toMatch(
      /^2026-08-12_\d{2}-03-04$/,
    );
  });
});
