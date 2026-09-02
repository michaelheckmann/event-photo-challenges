import type { PhotoListItem, PhotoMetadata } from "../../shared/photos";

// R2 lists objects lexicographically, so subtracting now from the max keeps newest photos first.
const REVERSED_TIMESTAMP_MAX = 9_999_999_999_999;
const GALLERY_WIDTHS = [360, 720] as const;
const LIGHTBOX_WIDTHS = [1080, 1600] as const;
const GALLERY_QUALITY = 74;
const LIGHTBOX_QUALITY = 82;
type ImageTransformProvider = "cloudflare" | "none";

const ALLOWED_EXTENSIONS = new Set([
  "avif",
  "gif",
  "heic",
  "heif",
  "jpeg",
  "jpg",
  "png",
  "webp",
]);

const MIME_TO_EXTENSION: Record<string, string> = {
  "image/avif": "avif",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const isValidImageFile = async (file: File): Promise<boolean> => {
  const extension = getExtension(file);
  if (!file.type.startsWith("image/") && !ALLOWED_EXTENSIONS.has(extension)) {
    return false;
  }

  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const ascii = String.fromCharCode(...bytes);
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng =
    bytes[0] === 0x89 && ascii.slice(1, 4) === "PNG" && bytes[4] === 0x0d;
  const isGif = ascii.startsWith("GIF87a") || ascii.startsWith("GIF89a");
  const isWebp = ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WEBP";
  const isoBrand = ascii.slice(8, 12);
  const isIsoImage =
    ascii.slice(4, 8) === "ftyp" &&
    ["avif", "avis", "heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(
      isoBrand,
    );

  return isJpeg || isPng || isGif || isWebp || isIsoImage;
};

export const createPhotoKey = (file: File): string => {
  const reversedTimestamp = String(
    REVERSED_TIMESTAMP_MAX - Date.now(),
  ).padStart(13, "0");
  const extension = getExtension(file);
  return `${reversedTimestamp}_${crypto.randomUUID()}.${extension}`;
};

export const toPhotoListItem = (
  requestUrl: string,
  cdnBaseUrl: string,
  imageTransformProvider: string,
  object: R2Object,
): PhotoListItem => {
  const urls = buildPhotoUrls(
    requestUrl,
    cdnBaseUrl,
    imageTransformProvider,
    object.key,
  );

  return {
    key: object.key,
    url: urls.original,
    urls,
    size: object.size,
    uploadedAt: object.uploaded.toISOString(),
    metadata: readMetadata(object),
  };
};

// --- Module-private helpers ---

const getExtension = (file: File): string => {
  const nameParts = file.name.split(".");
  const fromName =
    nameParts.length > 1
      ? nameParts
          .pop()
          ?.toLowerCase()
          .replace(/[^a-z0-9]/g, "")
      : undefined;

  if (fromName && ALLOWED_EXTENSIONS.has(fromName)) return fromName;
  return MIME_TO_EXTENSION[file.type] ?? "jpg";
};

const buildUrl = (
  requestUrl: string,
  cdnBaseUrl: string,
  key: string,
): string => {
  const encodedKey = encodeURIComponent(key);
  const trimmedCdn = normalizeBaseUrl(cdnBaseUrl);

  if (trimmedCdn) return `${trimmedCdn}/${encodedKey}`;

  // Fall back to worker proxy when CDN is not yet configured.
  return `${new URL(requestUrl).origin}/api/photo-objects/${encodedKey}`;
};

const buildPhotoUrls = (
  requestUrl: string,
  cdnBaseUrl: string,
  imageTransformProvider: string,
  key: string,
): PhotoListItem["urls"] => {
  const effectiveCdnBaseUrl = isLocalRequest(requestUrl) ? "" : cdnBaseUrl;
  const original = buildUrl(requestUrl, effectiveCdnBaseUrl, key);
  const hasCdn = normalizeBaseUrl(effectiveCdnBaseUrl) !== "";
  const provider = normalizeImageTransformProvider(imageTransformProvider);

  if (!hasCdn || provider === "none") {
    return {
      original,
      gallery: original,
      gallerySrcSet: "",
      lightbox: original,
      lightboxSrcSet: "",
    };
  }

  return {
    original,
    gallery: buildCloudflareImageUrl(
      effectiveCdnBaseUrl,
      key,
      360,
      GALLERY_QUALITY,
    ),
    gallerySrcSet: buildSrcSet(
      effectiveCdnBaseUrl,
      key,
      GALLERY_WIDTHS,
      GALLERY_QUALITY,
    ),
    lightbox: buildCloudflareImageUrl(
      effectiveCdnBaseUrl,
      key,
      1600,
      LIGHTBOX_QUALITY,
    ),
    lightboxSrcSet: buildSrcSet(
      effectiveCdnBaseUrl,
      key,
      LIGHTBOX_WIDTHS,
      LIGHTBOX_QUALITY,
    ),
  };
};

const isLocalRequest = (requestUrl: string): boolean => {
  const hostname = new URL(requestUrl).hostname;
  const ipv4Parts = hostname.split(".").map(Number);
  const isPrivateIpv4 =
    ipv4Parts.length === 4 &&
    ipv4Parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255) &&
    (ipv4Parts[0] === 10 ||
      (ipv4Parts[0] === 172 && ipv4Parts[1]! >= 16 && ipv4Parts[1]! <= 31) ||
      (ipv4Parts[0] === 192 && ipv4Parts[1] === 168));

  return (
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1"
    || hostname === "0.0.0.0"
    || hostname.endsWith(".local")
    || isPrivateIpv4
  );
};

export const warmPhotoVariants = async (
  urls: PhotoListItem["urls"],
): Promise<void> => {
  const urlsToWarm = [
    urls.gallery,
    urls.lightbox,
    ...parseSrcSetUrls(urls.gallerySrcSet),
    ...parseSrcSetUrls(urls.lightboxSrcSet),
  ].filter((url, index, all) => url.trim() !== "" && all.indexOf(url) === index);

  await Promise.allSettled(
    urlsToWarm.map(async (url) => {
      const response = await fetch(url, {
        headers: {
          accept: "image/webp,image/*,*/*;q=0.8",
          "user-agent": "event-photo-challenges-cache-warmer/1.0",
        },
      });

      if (response.ok) {
        await response.arrayBuffer();
      } else {
        response.body?.cancel();
      }
    }),
  );
};

const buildSrcSet = (
  cdnBaseUrl: string,
  key: string,
  widths: readonly number[],
  quality: number,
): string =>
  widths
    .map(
      (width) =>
        `${buildCloudflareImageUrl(cdnBaseUrl, key, width, quality)} ${width}w`,
    )
    .join(", ");

const parseSrcSetUrls = (srcSet: string): string[] =>
  srcSet
    .split(",")
    .map((candidate) => candidate.trim().split(/\s+/)[0])
    .filter((url): url is string => Boolean(url));

const buildCloudflareImageUrl = (
  cdnBaseUrl: string,
  key: string,
  width: number,
  quality: number,
): string => {
  const baseUrl = normalizeBaseUrl(cdnBaseUrl);
  const encodedKey = encodeURIComponent(key);
  const options = [
    `width=${width}`,
    `quality=${quality}`,
    "format=webp",
    "fit=scale-down",
    "metadata=none",
  ].join(",");

  return `${baseUrl}/cdn-cgi/image/${options}/${encodedKey}`;
};

const normalizeBaseUrl = (raw: string): string => {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const normalizeImageTransformProvider = (
  raw: string,
): ImageTransformProvider => {
  const provider = raw.trim().toLowerCase();
  if (provider === "none") return provider;
  return "cloudflare";
};

const readMetadata = (object: R2Object): PhotoMetadata => {
  const raw: Record<string, string> = object.customMetadata ?? {};
  const uploadedBy = raw.uploadedBy?.trim() || "Unknown";
  const takenAt = parseDate(raw.takenAt) ?? object.uploaded.toISOString();
  const challengeId = raw.challengeId?.trim() || undefined;

  return {
    uploadedBy,
    takenAt,
    ...(challengeId ? { challengeId } : {}),
  };
};

const parseDate = (raw: string | undefined): string | undefined => {
  if (!raw) return undefined;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};
