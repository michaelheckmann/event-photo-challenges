import { PhotoGallery } from "@/components/photo-gallery";
import { UploadStatusPanel } from "@/components/upload-status-panel";
import { useUploadPhotosMutation } from "@/lib/queries/photos";
import { useAppState } from "@/lib/state";
import { useUploadStatusPanel } from "@/lib/upload-state";
import { cn } from "@/lib/utils";
import { Plus } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { type ChangeEvent, useRef } from "react";
import { useWebHaptics } from "web-haptics/react";
import { useI18nContext } from "../i18n/i18n-react";

export const PhotosView = () => {
  const { trigger } = useWebHaptics();
  const { LL } = useI18nContext();
  const userName = useAppState((state) => state.userName);
  const userId = useAppState((state) => state.userId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadPhotosMutation();
  const isUploading = uploadMutation.isPending;
  const {
    applyFileUpdate,
    isPanelVisible,
    markAllAsError,
    queueFiles,
    uploadItems,
  } = useUploadStatusPanel(isUploading);

  const openFilePicker = () => {
    if (isUploading) return;
    trigger("selection");
    fileInputRef.current?.click();
  };

  const onFilesSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.currentTarget.value = "";

    if (files.length === 0) return;

    if (!userName?.trim()) {
      alert(LL.common.messages.enterNameBeforeUpload());
      return;
    }

    queueFiles(files);

    try {
      await uploadMutation.mutateAsync({
        files,
        uploadedBy: userName.trim(),
        userId,
        onFileUpdate: applyFileUpdate,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : LL.common.messages.uploadFailed();
      markAllAsError(message);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={onFilesSelected}
      />
      <div className="min-h-[calc(100dvh-112px)] p-6">
        <PhotoGallery />
      </div>

      <div className="fixed bottom-17 -right-3 px-6 pb-2 flex w-full max-w-2xl justify-end">
        <button
          aria-label={LL.photos.uploadButtonAriaLabel()}
          className="pointer-events-auto size-13.5 inset-shadow-sm inset-shadow-white/10 ring ring-black/80 rounded-full bg-neutral-800 flex-center text-neutral-100 text-lg font-bold active:scale-95 transition-transform shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isUploading}
          onClick={openFilePicker}
        >
          <HugeiconsIcon
            icon={Plus}
            size={32}
            strokeWidth={2.2}
            className="drop-shadow-xs drop-shadow-black"
          />
        </button>
      </div>
      <div
        className={cn(
          "fixed bottom-20 pb-2 px-5 origin-bottom w-full max-w-2xl transition-all duration-200 ease-out",
          isPanelVisible
            ? "scale-100 opacity-100"
            : "scale-75 opacity-0 pointer-events-none",
        )}
      >
        {uploadItems.length !== 0 && (
          <UploadStatusPanel items={uploadItems} isUploading={isUploading} />
        )}
      </div>
    </>
  );
};
