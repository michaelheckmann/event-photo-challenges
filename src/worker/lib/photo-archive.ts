import {
  PHOTO_ARCHIVE_LOCALES,
  type PhotoArchive,
  type PhotoArchiveLocale,
} from "../../shared/photos";
import { eventConfig } from "../../shared/event-config";

export const PHOTO_ARCHIVE_KEYS = {
  de: `archives/${eventConfig.archiveFilenamePrefix}-de.zip`,
  en: `archives/${eventConfig.archiveFilenamePrefix}-en.zip`,
} as const satisfies Record<PhotoArchiveLocale, string>;

export const PHOTO_ARCHIVE_DOWNLOAD_PATHS = {
  de: "/api/photo-archive/de.zip",
  en: "/api/photo-archive/en.zip",
} as const satisfies Record<PhotoArchiveLocale, string>;

export const PHOTO_ARCHIVE_EVENT_PREFIX = "archive-events/";

export const markPhotoArchiveDirty = async (bucket: R2Bucket): Promise<void> => {
  const event = await bucket.put(
    `${PHOTO_ARCHIVE_EVENT_PREFIX}${Date.now()}-${crypto.randomUUID()}`,
    "",
  );
  if (!event) throw new Error("The photo archive change could not be recorded.");
};

export const getPhotoArchiveMetadata = async (
  env: Env,
  requestUrl: string,
): Promise<PhotoArchive> => {
  const archiveEntries = await Promise.all(
    PHOTO_ARCHIVE_LOCALES.map(async (locale) => ({
      archive: await env.PHOTO_DERIVATIVES.head(PHOTO_ARCHIVE_KEYS[locale]),
      locale,
    })),
  );
  const availableEntry = archiveEntries.find(({ archive }) => archive);
  const origin = new URL(requestUrl).origin;
  const downloads = Object.fromEntries(
    archiveEntries.map(({ archive, locale }) => [
      locale,
      {
        downloadBytes: archive?.size ?? null,
        downloadUrl: archive
          ? `${origin}${PHOTO_ARCHIVE_DOWNLOAD_PATHS[locale]}`
          : null,
      },
    ]),
  ) as PhotoArchive["downloads"];

  if (availableEntry?.archive) {
    const metadata = availableEntry.archive.customMetadata ?? {};
    const imageCount = Number(metadata.imagecount ?? 0);
    return {
      downloads,
      generatedAt:
        metadata.generatedat ?? availableEntry.archive.uploaded.toISOString(),
      imageCount,
      originalBytes: Number(metadata.originalbytes ?? 0),
      status:
        imageCount === 0
          ? "empty"
          : archiveEntries.every(({ archive }) => archive)
            ? "available"
            : "preparing",
    };
  }

  let imageCount = 0;
  let originalBytes = 0;
  let cursor: string | undefined;
  do {
    const page = await env.PHOTOS.list({ cursor, limit: 1_000 });
    imageCount += page.objects.length;
    originalBytes += page.objects.reduce((total, photo) => total + photo.size, 0);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  return {
    downloads,
    generatedAt: null,
    imageCount,
    originalBytes,
    status: imageCount === 0 ? "empty" : "preparing",
  };
};
