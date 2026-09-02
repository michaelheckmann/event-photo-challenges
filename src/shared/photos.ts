export const DEFAULT_PHOTOS_PAGE_SIZE = 18;
export const MAX_PHOTOS_PAGE_SIZE = 48;
export const MAX_PHOTO_UPLOAD_BYTES = 50 * 1024 * 1024;

export type PhotoMetadata = {
  uploadedBy: string;
  takenAt: string;
  challengeId?: string;
};

export type PhotoListItem = {
  key: string;
  url: string;
  urls: {
    original: string;
    gallery: string;
    gallerySrcSet: string;
    lightbox: string;
    lightboxSrcSet: string;
  };
  size: number;
  uploadedAt: string;
  metadata: PhotoMetadata;
};

export type PhotosPage = {
  photos: PhotoListItem[];
  nextCursor: string | null;
};

export type UploadPhotoResponse = {
  photo: PhotoListItem;
  /** Returned once. Store it locally if the uploader should be able to delete the photo. */
  deletionToken: string;
};

export const PHOTO_ARCHIVE_LOCALES = ["de", "en"] as const;
export type PhotoArchiveLocale = (typeof PHOTO_ARCHIVE_LOCALES)[number];

export type PhotoArchiveDownload = {
  downloadBytes: number | null;
  downloadUrl: string | null;
};

export type PhotoArchive = {
  downloads: Record<PhotoArchiveLocale, PhotoArchiveDownload>;
  generatedAt: string | null;
  imageCount: number;
  originalBytes: number;
  status: "available" | "empty" | "preparing";
};
