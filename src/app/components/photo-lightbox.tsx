import { cn } from "@/lib/utils";
import {
  Cancel,
  Download02Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef, useState } from "react";
import type { PhotoListItem } from "../../shared/photos";
import { eventConfig } from "../../shared/event-config";
import {
  formatPhotoTimestamp,
  sanitizeFilenameSegment,
} from "../../shared/file-names";
import { useI18nContext } from "../i18n/i18n-react";

type PhotoLightboxProps = {
  canDeletePhoto?: (key: string) => boolean;
  photos: PhotoListItem[];
  startIndex: number;
  getCaption?: (photo: PhotoListItem) => string | undefined;
  onClose: () => void;
  onDelete?: (key: string) => void;
  onNearEnd?: () => void;
};

const getDownloadFilename = (
  photo: PhotoListItem,
  locale: "de" | "en",
): string => {
  const timestamp = formatPhotoTimestamp(
    photo.uploadedAt,
    new Date("1970-01-01T00:00:00Z"),
  );
  const photographer = sanitizeFilenameSegment(photo.metadata.uploadedBy);
  const attribution = locale === "de" ? "von" : "by";
  const base = `${eventConfig.archiveFilenamePrefix}_${timestamp}_${attribution}-${photographer}`;
  const challengeId = photo.metadata.challengeId;

  if (challengeId) {
    return `${base}_Challenge-${sanitizeFilenameSegment(challengeId)}_${locale}.jpg`;
  }

  const extension = photo.key.match(/\.[a-z0-9]+$/i)?.[0] ?? ".jpg";
  return `${base}${extension.toLowerCase()}`;
};

export const PhotoLightbox = ({
  canDeletePhoto,
  photos,
  startIndex,
  getCaption,
  onClose,
  onDelete,
  onNearEnd,
}: PhotoLightboxProps) => {
  const { LL, locale } = useI18nContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const lastSlideRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(startIndex);
  const [isDownloading, setIsDownloading] = useState(false);
  const activePhoto = photos[activeIndex] ?? photos[startIndex];
  const photoObjectsPath = "/api/photo-objects";
  const captionedPhotosPath = "/api/captioned-photos";
  const isChallengePhoto = Boolean(activePhoto?.metadata.challengeId);
  const downloadUrl = activePhoto
    ? isChallengePhoto
      ? `${captionedPhotosPath}/${locale}/${encodeURIComponent(activePhoto.key)}`
      : `${photoObjectsPath}/${encodeURIComponent(activePhoto.key)}?download=1`
    : undefined;
  const downloadFilename = activePhoto
    ? getDownloadFilename(activePhoto, locale)
    : undefined;

  const handleDownload = async () => {
    if (!activePhoto || !downloadUrl || !downloadFilename || isDownloading)
      return;

    setIsDownloading(true);
    try {
      const response = await fetch(downloadUrl);
      const contentType = response.headers.get("content-type") ?? "";

      if (!response.ok || !contentType.startsWith("image/")) {
        throw new Error(
          `Expected an image response, received ${response.status} ${contentType || "without a content type"}.`,
        );
      }

      const blob = await response.blob();
      const file = new File([blob], downloadFilename, { type: contentType });
      const canShareFile =
        window.matchMedia("(pointer: coarse)").matches &&
        typeof navigator.share === "function" &&
        navigator.canShare?.({ files: [file] });

      if (canShareFile) {
        await navigator.share({ files: [file] });
        return;
      }

      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = downloadFilename;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error("Photo download failed", error);
    } finally {
      setIsDownloading(false);
    }
  };

  // Lock body scroll and jump to the correct slide on mount
  useEffect(() => {
    document.body.style.overflow = "hidden";

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    const previousThemeColor = metaThemeColor?.getAttribute("content");

    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", "#181818");
    }

    if (containerRef.current) {
      containerRef.current.scrollTop = startIndex * window.innerHeight;
    }

    return () => {
      document.body.style.overflow = "";
      if (metaThemeColor && previousThemeColor) {
        metaThemeColor.setAttribute("content", previousThemeColor);
      }
    };
  }, [startIndex]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") onClose();
    if (!containerRef.current) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      containerRef.current.scrollBy({
        top: window.innerHeight,
        behavior: "smooth",
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      containerRef.current.scrollBy({
        top: -window.innerHeight,
        behavior: "smooth",
      });
    }
  };

  // IntersectionObserver for near-end detection
  useEffect(() => {
    const node = lastSlideRef.current;
    if (!node || !onNearEnd) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          onNearEnd();
        }
      },
      { rootMargin: "0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [onNearEnd, photos.length]);

  return (
    <div
      className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md outline-none"
      tabIndex={-1}
      autoFocus
      onKeyDown={handleKeyDown}
    >
      <div className="fixed right-4 top-4 z-60 flex gap-2">
        {activePhoto && (
          <button
            type="button"
            onClick={() => void handleDownload()}
            disabled={isDownloading}
            className="flex size-10 items-center justify-center rounded-full bg-black/70 text-neutral-100 inset-shadow-sm inset-shadow-white/5 shadow-2xl backdrop-blur-sm active:scale-95 transition-transform disabled:cursor-wait"
            aria-label={LL.common.actions.downloadPhoto()}
          >
            <HugeiconsIcon
              icon={isDownloading ? Loading03Icon : Download02Icon}
              size={20}
              strokeWidth={2}
              className={isDownloading ? "animate-spin" : undefined}
            />
          </button>
        )}
        <button
          onClick={onClose}
          className="flex size-10 items-center justify-center rounded-full bg-black/70 inset-shadow-sm inset-shadow-white/5 shadow-2xl text-neutral-100 backdrop-blur-sm active:scale-95 transition-transform"
          aria-label={LL.common.actions.close()}
        >
          <HugeiconsIcon icon={Cancel} size={24} strokeWidth={2} />
        </button>
      </div>

      <div
        ref={containerRef}
        className="h-dvh w-full snap-y snap-mandatory overflow-y-scroll"
        style={{ scrollbarWidth: "none" }}
        onScroll={(event) => {
          const nextIndex = Math.round(
            event.currentTarget.scrollTop / event.currentTarget.clientHeight,
          );
          setActiveIndex(Math.min(photos.length - 1, Math.max(0, nextIndex)));
        }}
      >
        {photos.map((photo, index) => {
          const isLast = index === photos.length - 1;
          const isOwner = canDeletePhoto?.(photo.key) ?? false;
          const caption = getCaption?.(photo);
          return (
            <div
              key={photo.key}
              ref={isLast ? lastSlideRef : null}
              className="relative flex h-dvh w-full shrink-0 snap-start flex-col pb-4"
            >
              <img
                src={photo.urls.lightbox}
                srcSet={photo.urls.lightboxSrcSet || undefined}
                sizes="100vw"
                alt={LL.common.messages.photoBy({
                  uploadedBy: photo.metadata.uploadedBy,
                })}
                className="h-full w-full object-contain"
                loading={Math.abs(index - startIndex) <= 2 ? "eager" : "lazy"}
              />
              <div className="absolute top-4 left-4 rounded-full bg-black/70 flex items-center px-4 h-10 backdrop-blur-sm inset-shadow-sm inset-shadow-white/5 shadow-2xl max-w-[75vw]">
                <button
                  className={cn(
                    "text-lg font-bold text-neutral-100 truncate inline-block",
                    isOwner &&
                      "text-rose-400 active:scale-95 transition-transform",
                  )}
                  disabled={!isOwner || !onDelete}
                  onClick={() => {
                    if (isOwner && onDelete) onDelete(photo.key);
                  }}
                >
                  {isOwner
                    ? LL.common.actions.deleteOwnPhoto()
                    : photo.metadata.uploadedBy}
                </button>
              </div>
              {caption && (
                <div className="absolute bottom-0 left-0 w-full p-6 pt-12 text-center">
                  <div className="mx-auto max-w-lg rounded-lg bg-black/70 p-4 inset-shadow-sm inset-shadow-white/5 shadow-2xl backdrop-blur-xs">
                    <p className="text-neutral-100">{caption}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
