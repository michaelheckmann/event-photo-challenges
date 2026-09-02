import type { UploadFileProgress } from "@/lib/upload-state";
import { useAppState } from "@/lib/state";
import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  challengesSummaryQueryKey,
  delayedChallengesReconciliationMs,
  markChallengeCompletedInSummary,
  markChallengeOpenInSummary,
} from "./challenges";
import {
  DEFAULT_PHOTOS_PAGE_SIZE,
  type PhotoListItem,
  type PhotoArchive,
  type PhotosPage,
  type UploadPhotoResponse,
} from "../../../shared/photos";

export const photosQueryKey = ["photos"] as const;
export const photoArchiveQueryKey = ["photo-archive"] as const;
export const galleryImageSizes =
  "(min-width: 640px) 150px, (min-width: 460px) calc((100vw - 64px) / 3), calc((100vw - 56px) / 2)";
const photosReadPath = "/api/photos";

export type UploadFileUpdate = UploadFileProgress;

type UploadPhotoRequest = {
  file: File;
  uploadedBy: string;
  userId: string;
  takenAt: string;
  challengeId?: string;
};

type UploadPhotosMutationInput = {
  files: File[];
  uploadedBy: string;
  userId: string;
  challengeId?: string;
  onFileUpdate?: (update: UploadFileUpdate) => void;
};

type UploadPhotosMutationResult = {
  uploadedCount: number;
  photos: PhotoListItem[];
};

type DeletePhotoMutationInput = {
  deletionToken: string;
  key: string;
  userId: string;
  challengeId?: string;
};

export type GalleryPhoto = PhotoListItem & {
  intrinsicHeight?: number;
  intrinsicWidth?: number;
};

type GalleryPhotosPage = Omit<PhotosPage, "photos"> & {
  photos: GalleryPhoto[];
};

const getErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : "Something went wrong.";
};

const getTakenAt = (file: File) => {
  if (Number.isFinite(file.lastModified) && file.lastModified > 0) {
    return new Date(file.lastModified).toISOString();
  }

  return new Date().toISOString();
};

const getResponseErrorMessage = async (response: Response) => {
  try {
    const data = (await response.clone().json()) as { message?: string };

    if (typeof data.message === "string" && data.message.trim() !== "") {
      return data.message;
    }
  } catch {
    // Fall back to the raw response text below.
  }

  const fallbackMessage = await response.text();
  return fallbackMessage || "The request could not be completed.";
};

const fetchJson = async <T>(input: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(input, init);

  if (!response.ok) {
    throw new Error(await getResponseErrorMessage(response));
  }

  return (await response.json()) as T;
};

const measureGalleryPhoto = (photo: PhotoListItem): Promise<GalleryPhoto> =>
  new Promise((resolve) => {
    const image = new Image();
    let isSettled = false;
    const finish = (measuredPhoto: GalleryPhoto) => {
      if (isSettled) return;
      isSettled = true;
      window.clearTimeout(timeout);
      resolve(measuredPhoto);
    };
    const timeout = window.setTimeout(() => finish(photo), 5_000);

    image.onload = () => {
      finish({
        ...photo,
        intrinsicHeight: image.naturalHeight,
        intrinsicWidth: image.naturalWidth,
      });
    };
    image.onerror = () => finish(photo);
    image.sizes = galleryImageSizes;
    image.srcset = photo.urls.gallerySrcSet;
    image.src = photo.urls.gallery;
  });

const fetchPhotosPage = async (
  cursor: string | null,
): Promise<GalleryPhotosPage> => {
  const params = new URLSearchParams({
    limit: String(DEFAULT_PHOTOS_PAGE_SIZE),
  });

  if (cursor) {
    params.set("cursor", cursor);
  }

  const page = await fetchJson<PhotosPage>(
    `${photosReadPath}?${params.toString()}`,
  );
  const photos = await Promise.all(page.photos.map(measureGalleryPhoto));
  return { ...page, photos };
};

const uploadPhotoRequest = async ({
  file,
  uploadedBy,
  userId,
  takenAt,
  challengeId,
}: UploadPhotoRequest): Promise<UploadPhotoResponse> => {
  const formData = new FormData();
  formData.set("file", file);
  formData.set("uploadedBy", uploadedBy);
  formData.set("userId", userId);
  formData.set("takenAt", takenAt);
  if (challengeId) {
    formData.set("challengeId", challengeId);
  }

  return fetchJson<UploadPhotoResponse>("/api/photos", {
    body: formData,
    method: "POST",
  });
};

export const usePhotosInfiniteQuery = () => {
  return useInfiniteQuery<
    GalleryPhotosPage,
    Error,
    InfiniteData<GalleryPhotosPage>,
    typeof photosQueryKey,
    string | null
  >({
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => fetchPhotosPage(pageParam),
    queryKey: photosQueryKey,
    staleTime: 30_000,
  });
};

export const usePhotoArchiveQuery = () =>
  useQuery({
    queryFn: () => fetchJson<PhotoArchive>("/api/photo-archive"),
    queryKey: photoArchiveQueryKey,
    refetchInterval: (query) =>
      query.state.data?.status === "preparing" ? 3_000 : false,
    staleTime: 30_000,
  });

export const useUploadPhotosMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      files,
      uploadedBy,
      userId,
      challengeId,
      onFileUpdate,
    }: UploadPhotosMutationInput): Promise<UploadPhotosMutationResult> => {
      let uploadedCount = 0;
      const photos: PhotoListItem[] = [];

      for (const [index, file] of files.entries()) {
        onFileUpdate?.({ index, status: "uploading" });

        try {
          const response = await uploadPhotoRequest({
            challengeId,
            file,
            takenAt: getTakenAt(file),
            uploadedBy,
            userId,
          });

          uploadedCount += 1;
          photos.push(response.photo);
          useAppState.setState((state) => ({
            deletionTokens: {
              ...state.deletionTokens,
              [response.photo.key]: response.deletionToken,
            },
          }));
          onFileUpdate?.({ index, status: "success" });
        } catch (error) {
          onFileUpdate?.({
            errorMessage: getErrorMessage(error),
            index,
            status: "error",
          });
        }
      }

      return { photos, uploadedCount };
    },
    onSuccess: async ({ photos, uploadedCount }, { challengeId, userId }) => {
      if (uploadedCount > 0) {
        await queryClient.invalidateQueries({
          exact: true,
          queryKey: photosQueryKey,
        });
        await queryClient.invalidateQueries({
          exact: true,
          queryKey: photoArchiveQueryKey,
        });

        const [photo] = photos;
        if (challengeId && photo) {
          queryClient.setQueryData(
            challengesSummaryQueryKey(userId),
            markChallengeCompletedInSummary(challengeId, photo),
          );

          window.setTimeout(() => {
            void queryClient.invalidateQueries({
              queryKey: challengesSummaryQueryKey(userId),
            });
          }, delayedChallengesReconciliationMs);
        }
      }
    },
  });
};

export const useDeletePhotoMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      key,
      deletionToken,
    }: DeletePhotoMutationInput): Promise<void> => {
      const response = await fetch(`/api/photos/${encodeURIComponent(key)}`, {
        headers: { authorization: `Bearer ${deletionToken}` },
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await getResponseErrorMessage(response));
      }
    },
    onSuccess: async (_data, { challengeId, key, userId }) => {
      useAppState.setState((state) => {
        const deletionTokens = { ...state.deletionTokens };
        delete deletionTokens[key];
        return { deletionTokens };
      });
      await queryClient.invalidateQueries({
        exact: true,
        queryKey: photosQueryKey,
      });
      await queryClient.invalidateQueries({
        exact: true,
        queryKey: photoArchiveQueryKey,
      });

      if (challengeId) {
        queryClient.setQueryData(
          challengesSummaryQueryKey(userId),
          markChallengeOpenInSummary(challengeId),
        );

        window.setTimeout(() => {
          void queryClient.invalidateQueries({
            queryKey: challengesSummaryQueryKey(userId),
          });
        }, delayedChallengesReconciliationMs);
      }
    },
  });
};
