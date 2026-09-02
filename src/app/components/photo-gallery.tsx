import { getChallengeCaption } from "@/lib/challenges";
import {
  type GalleryPhoto,
  galleryImageSizes,
  useDeletePhotoMutation,
  usePhotosInfiniteQuery,
} from "@/lib/queries/photos";
import { useAppState } from "@/lib/state";
import { translateAppError } from "@/lib/utils";
import { User } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Masonry,
  type RenderComponentProps,
  useInfiniteLoader,
} from "masonic";
import { useCallback, useMemo, useState } from "react";
import { useWebHaptics } from "web-haptics/react";
import { useI18nContext } from "../i18n/i18n-react";
import { PhotoLightbox } from "./photo-lightbox";
import { Button } from "./ui/button";

type PhotoGalleryItem = {
  isOwner: boolean;
  photo: GalleryPhoto;
  onSelect: (index: number) => void;
};

const PhotoCard = ({
  data: { isOwner, photo, onSelect },
  index,
}: RenderComponentProps<PhotoGalleryItem>) => {
  const { LL } = useI18nContext();
  return (
    <button
      type="button"
      onClick={() => onSelect(index)}
      className="relative block w-full cursor-pointer overflow-hidden rounded-md bg-neutral-200 text-left shadow-sm ring-1 ring-black/5 transition-transform active:scale-95"
    >
      <img
        alt={LL.common.messages.photoBy({
          uploadedBy: photo.metadata.uploadedBy,
        })}
        className="block h-auto w-full object-cover"
        loading="lazy"
        decoding="async"
        height={photo.intrinsicHeight}
        sizes={galleryImageSizes}
        src={photo.urls.gallery}
        srcSet={photo.urls.gallerySrcSet || undefined}
        width={photo.intrinsicWidth}
      />
      {isOwner && (
        <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-neutral-950 text-neutral-100 ring-1 ring-white/60 backdrop-blur-sm inset-shadow-2xs inset-shadow-white/20">
          <HugeiconsIcon icon={User} size={12} strokeWidth={2} />
        </span>
      )}
    </button>
  );
};

const skeletonHeights = [
  136, 192, 164, 228, 148, 176, 212, 156, 188, 132, 204, 168,
];

const Skeleton = ({ count = 9 }: { count?: number }) => (
  <div
    aria-hidden="true"
    className="columns-2 gap-2 min-[460px]:columns-3 sm:columns-4"
  >
    {Array.from({ length: count }, (_, i) => (
      <div
        key={i}
        className="gallery-skeleton mb-2 w-full break-inside-avoid overflow-hidden rounded-md bg-neutral-200"
        style={{ height: skeletonHeights[i % skeletonHeights.length] }}
      />
    ))}
  </div>
);

export const PhotoGallery = () => {
  const { LL, locale } = useI18nContext();
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = usePhotosInfiniteQuery();

  const userId = useAppState((state) => state.userId);
  const deletionTokens = useAppState((state) => state.deletionTokens);
  const deleteMutation = useDeletePhotoMutation();

  const { trigger } = useWebHaptics();

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [hiddenPhotoKeys, setHiddenPhotoKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [masonryRevision, setMasonryRevision] = useState(0);

  const loadedPhotos = useMemo(
    () => data?.pages.flatMap((page) => page.photos) ?? [],
    [data],
  );
  const photos = useMemo(
    () =>
      loadedPhotos.filter((photo) => !hiddenPhotoKeys.has(photo.key)),
    [hiddenPhotoKeys, loadedPhotos],
  );
  const handleSelect = useCallback(
    (index: number) => {
      trigger("selection");
      setLightboxIndex(index);
    },
    [trigger],
  );
  const galleryItems = useMemo(
    () =>
      photos.map((photo) => ({
        isOwner: Boolean(deletionTokens[photo.key]),
        photo,
        onSelect: handleSelect,
      })),
    [deletionTokens, handleSelect, photos],
  );
  const loadMoreItems = useCallback(
    (_startIndex: number, _stopIndex: number) => {
      if (!hasNextPage || isFetchingNextPage) return;

      void fetchNextPage();
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  );
  const maybeLoadMore = useInfiniteLoader(loadMoreItems);
  const handleRender = useCallback(
    (startIndex: number, stopIndex: number, items: PhotoGalleryItem[]) =>
      maybeLoadMore(startIndex, stopIndex, items),
    [maybeLoadMore],
  );

  if (isLoading) return <Skeleton />;

  if (isError) {
    return (
      <div className="flex min-h-[40dvh] flex-col items-center justify-center gap-4 text-center">
        <div className="space-y-2">
          <p className="text-xl font-bold">
            {LL.photos.gallery.loadErrorTitle()}
          </p>
          <p className="text-sm font-semibold text-muted-foreground">
            {translateAppError(LL, error.message)}
          </p>
        </div>
        <Button variant="outline" onClick={() => void refetch()}>
          {LL.common.actions.retry()}
        </Button>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="flex min-h-[40dvh] flex-col items-center justify-center gap-3 text-center">
        <p className="text-xl font-bold">{LL.photos.gallery.emptyTitle()}</p>
        <p className="max-w-sm text-sm font-semibold text-muted-foreground">
          {LL.photos.gallery.emptyDescription()}
        </p>
      </div>
    );
  }

  return (
    <>
      <Masonry
        key={masonryRevision}
        items={galleryItems}
        render={PhotoCard}
        itemKey={({ photo }) => photo.key}
        columnWidth={132}
        columnGutter={8}
        rowGutter={8}
        itemHeightEstimate={180}
        onRender={handleRender}
        className="outline-none"
        tabIndex={-1}
      />

      {isFetchingNextPage && (
        <div className="pt-3">
          <Skeleton count={6} />
        </div>
      )}

      {!hasNextPage && (
        <p className="pt-2 text-center text-sm font-semibold text-muted-foreground">
          {LL.photos.gallery.endReached()}
        </p>
      )}

      {lightboxIndex !== null && (
        <PhotoLightbox
          canDeletePhoto={(key) => Boolean(deletionTokens[key])}
          photos={photos}
          startIndex={lightboxIndex}
          getCaption={(photo) =>
            getChallengeCaption(locale, photo.metadata.challengeId)
          }
          onClose={() => {
            trigger("medium");
            setLightboxIndex(null);
          }}
          onDelete={(key) => {
            const deletionToken = deletionTokens[key];
            if (!deletionToken) return;
            setHiddenPhotoKeys((current) => new Set(current).add(key));
            setMasonryRevision((current) => current + 1);
            deleteMutation.mutate(
              { deletionToken, key, userId },
              {
                onError: () => {
                  setHiddenPhotoKeys((current) => {
                    const next = new Set(current);
                    next.delete(key);
                    return next;
                  });
                  setMasonryRevision((current) => current + 1);
                },
              },
            );
            setLightboxIndex(null);
            trigger("success");
          }}
          onNearEnd={
            hasNextPage && !isFetchingNextPage ? fetchNextPage : undefined
          }
        />
      )}
    </>
  );
};
