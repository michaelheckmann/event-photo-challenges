import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { PassThrough } from "node:stream";
import ZipStream from "zip-stream";
import { eventConfig } from "../src/shared/event-config.ts";
import {
  formatPhotoTimestamp,
  sanitizeFilenameSegment,
} from "../src/shared/file-names.ts";

const photosBucket = process.env.R2_PHOTOS_BUCKET?.trim();
const derivativesBucket = process.env.R2_DERIVATIVES_BUCKET?.trim();
if (!photosBucket) throw new Error("R2_PHOTOS_BUCKET is required.");
if (!derivativesBucket) throw new Error("R2_DERIVATIVES_BUCKET is required.");
const eventPrefix = "archive-events/";
const captionStyleVersion = "v3";
const archiveDefinitions = [
  {
    filename: `${eventConfig.archiveFilenamePrefix}-de.zip`,
    key: `archives/${eventConfig.archiveFilenamePrefix}-de.zip`,
    locale: "de",
  },
  {
    filename: `${eventConfig.archiveFilenamePrefix}-en.zip`,
    key: `archives/${eventConfig.archiveFilenamePrefix}-en.zip`,
    locale: "en",
  },
];

const requireEnvironmentVariable = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
};

const s3 = new S3Client({
  credentials: {
    accessKeyId: requireEnvironmentVariable("R2_ACCESS_KEY_ID"),
    secretAccessKey: requireEnvironmentVariable("R2_SECRET_ACCESS_KEY"),
  },
  endpoint: `https://${requireEnvironmentVariable("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
  region: "auto",
});

const listObjects = async (bucket, prefix) => {
  const objects = [];
  let continuationToken;

  do {
    const page = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        ContinuationToken: continuationToken,
        Prefix: prefix,
      }),
    );
    objects.push(...(page.Contents ?? []));
    continuationToken = page.IsTruncated
      ? page.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return objects;
};

const headObject = async (bucket, key) => {
  try {
    return await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  } catch (error) {
    if (error?.$metadata?.httpStatusCode === 404) return null;
    throw error;
  }
};

const archivesExist = async () => {
  const archives = await Promise.all(
    archiveDefinitions.map(({ key }) => headObject(derivativesBucket, key)),
  );
  return archives.every(Boolean);
};

const createArchiveFilename = (entry, occurrences) => {
  const { photo, variant } = entry;
  const metadata = photo.Metadata ?? {};
  const timestamp = formatPhotoTimestamp(metadata.takenat, photo.LastModified);
  const uploadedBy = sanitizeFilenameSegment(metadata.uploadedby ?? "Unknown");
  const challenge = metadata.challengeid
    ? `_Challenge-${sanitizeFilenameSegment(metadata.challengeid)}`
    : "";
  const caption =
    variant.kind === "captioned" ? `_Beschriftet-${variant.locale}` : "";
  const extension =
    variant.kind === "captioned"
      ? ".jpg"
      : (photo.Key.match(/\.[a-z0-9]+$/i)?.[0].toLowerCase() ?? ".jpg");
  const base = `${eventConfig.archiveFilenamePrefix}_${timestamp}_by-${uploadedBy}${challenge}${caption}`;
  const occurrence = (occurrences.get(base) ?? 0) + 1;
  occurrences.set(base, occurrence);
  return `${base}${occurrence === 1 ? "" : `-${occurrence}`}${extension}`;
};

const addZipEntry = (zip, body, name, date) =>
  new Promise((resolve, reject) => {
    zip.entry(body, { date, name }, (error) =>
      error ? reject(error) : resolve(),
    );
  });

const deleteObjects = async (objects) => {
  for (let index = 0; index < objects.length; index += 1_000) {
    await s3.send(
      new DeleteObjectsCommand({
        Bucket: derivativesBucket,
        Delete: {
          Objects: objects
            .slice(index, index + 1_000)
            .map(({ Key }) => ({ Key })),
          Quiet: true,
        },
      }),
    );
  }
};

const getCaptionedPhotoKey = (originalKey, locale) =>
  `${captionStyleVersion}/${locale}/${originalKey}.jpg`;

const createPhotoSources = async (photos) => {
  const sources = [];

  for (const listedPhoto of photos) {
    const original = await headObject(photosBucket, listedPhoto.Key);
    if (!original) continue;

    const source = {
      captioned: {},
      original: {
        bucket: photosBucket,
        key: listedPhoto.Key,
        photo: { ...listedPhoto, ...original },
        size: original.ContentLength ?? listedPhoto.Size ?? 0,
        variant: { kind: "original" },
      },
    };
    sources.push(source);

    const challengeId = original.Metadata?.challengeid;
    if (!challengeId) continue;

    for (const { locale } of archiveDefinitions) {
      const key = getCaptionedPhotoKey(listedPhoto.Key, locale);
      const captioned = await headObject(derivativesBucket, key);
      if (!captioned) {
        throw new Error(`Captioned photo is missing: ${key}.`);
      }

      source.captioned[locale] = {
        bucket: derivativesBucket,
        key,
        photo: { ...listedPhoto, ...original },
        size: captioned.ContentLength ?? 0,
        variant: { kind: "captioned", locale },
      };
    }
  }

  return sources;
};

const createArchiveUpload = (definition, metadata) => {
  const zip = new ZipStream({ forceZip64: true, store: true });
  const uploadBody = new PassThrough();
  zip.on("error", (error) => uploadBody.destroy(error));
  zip.pipe(uploadBody);
  const upload = new Upload({
    client: s3,
    leavePartsOnError: false,
    params: {
      Body: uploadBody,
      Bucket: derivativesBucket,
      CacheControl: "public, max-age=60",
      ContentDisposition: `attachment; filename="${definition.filename}"`,
      ContentType: "application/zip",
      Key: definition.key,
      Metadata: metadata,
    },
    partSize: 10 * 1024 * 1024,
    queueSize: 4,
  });
  const uploadPromise = upload.done().catch((error) => {
    if (!zip.destroyed) zip.destroy(error);
    throw error;
  });

  return {
    ...definition,
    filenameOccurrences: new Map(),
    upload,
    uploadBody,
    uploadPromise,
    zip,
  };
};

const [events, hasArchive] = await Promise.all([
  listObjects(derivativesBucket, eventPrefix),
  archivesExist(),
]);

if (hasArchive && events.length === 0 && process.env.FORCE_REBUILD !== "true") {
  console.info("Photo archive is current; nothing to rebuild.");
  process.exit(0);
}

const photos = await listObjects(photosBucket);
const sources = await createPhotoSources(photos);
const imageCount = sources.reduce(
  (total, source) =>
    total + 1 + (Object.keys(source.captioned).length > 0 ? 1 : 0),
  0,
);
const originalBytes = sources.reduce(
  (total, source) => total + source.original.size,
  0,
);
const generatedAt = new Date().toISOString();
const archiveUploads = archiveDefinitions.map((definition) =>
  createArchiveUpload(definition, {
    generatedat: generatedAt,
    imagecount: String(imageCount),
    originalbytes: String(originalBytes),
  }),
);

try {
  for (const source of sources) {
    const originalPhoto = await s3.send(
      new GetObjectCommand({
        Bucket: source.original.bucket,
        Key: source.original.key,
      }),
    );
    if (!originalPhoto.Body)
      throw new Error(`Photo ${source.original.key} has no body.`);

    // Buffer one original at a time so the same R2 download can feed both ZIPs.
    // Uploads still stream directly to R2 and never occupy runner disk.
    const originalBodyBytes = await originalPhoto.Body.transformToByteArray();
    const originalBody = Buffer.from(
      originalBodyBytes.buffer,
      originalBodyBytes.byteOffset,
      originalBodyBytes.byteLength,
    );
    for (const archive of archiveUploads) {
      await addZipEntry(
        archive.zip,
        originalBody,
        `normal images/${createArchiveFilename(
          source.original,
          archive.filenameOccurrences,
        )}`,
        source.original.photo.LastModified,
      );
    }

    for (const archive of archiveUploads) {
      const captionedSource = source.captioned[archive.locale];
      if (!captionedSource) continue;
      const captionedPhoto = await s3.send(
        new GetObjectCommand({
          Bucket: captionedSource.bucket,
          Key: captionedSource.key,
        }),
      );
      if (!captionedPhoto.Body)
        throw new Error(`Photo ${captionedSource.key} has no body.`);
      await addZipEntry(
        archive.zip,
        captionedPhoto.Body,
        `captioned images/${createArchiveFilename(
          captionedSource,
          archive.filenameOccurrences,
        )}`,
        captionedSource.photo.LastModified,
      );
    }
  }

  for (const archive of archiveUploads) archive.zip.finalize();
  const results = await Promise.all(
    archiveUploads.map(({ uploadPromise }) => uploadPromise),
  );
  await deleteObjects(events);
  console.info("Photo archives rebuilt", {
    archives: archiveUploads.map((archive, index) => ({
      archiveEtag: results[index].ETag,
      key: archive.key,
      locale: archive.locale,
    })),
    generatedAt,
    imageCount,
    originalBytes,
  });
} catch (error) {
  for (const archive of archiveUploads) {
    if (!archive.zip.destroyed) archive.zip.destroy(error);
    if (!archive.uploadBody.destroyed) archive.uploadBody.destroy(error);
  }
  await Promise.all(
    archiveUploads.map(({ upload }) => upload.abort().catch(() => undefined)),
  );
  throw error;
}
