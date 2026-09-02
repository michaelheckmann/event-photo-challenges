import { useEffect, useState } from "react";

export type UploadStatus = "queued" | "uploading" | "success" | "error";

export type UploadItem = {
  id: string;
  fileName: string;
  status: UploadStatus;
  errorMessage?: string;
};

export type UploadFileProgress = {
  index: number;
  status: UploadStatus;
  errorMessage?: string;
};

const createUploadItem = (file: File): UploadItem => ({
  id:
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 9),
  fileName: file.name,
  status: "queued",
});

export const useUploadStatusPanel = (isUploading: boolean) => {
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [isPanelVisible, setIsPanelVisible] = useState(false);

  useEffect(() => {
    const hasPendingItems = uploadItems.length > 0;
    const hasErrors = uploadItems.some((item) => item.status === "error");
    const shouldDismiss = !isUploading && hasPendingItems && !hasErrors;

    if (!shouldDismiss) return;

    const hideTimer = window.setTimeout(() => setIsPanelVisible(false), 2200);
    const cleanupTimer = window.setTimeout(() => setUploadItems([]), 2440);

    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(cleanupTimer);
    };
  }, [isUploading, uploadItems]);

  const queueFiles = (files: File[]) => {
    setIsPanelVisible(false);
    setUploadItems(files.map(createUploadItem));
    window.requestAnimationFrame(() => setIsPanelVisible(true));
  };

  const applyFileUpdate = ({
    index,
    status,
    errorMessage,
  }: UploadFileProgress) => {
    setUploadItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, status, errorMessage } : item,
      ),
    );
  };

  const markAllAsError = (message: string) => {
    setUploadItems((current) =>
      current.map((item) => ({
        ...item,
        errorMessage: message,
        status: "error",
      })),
    );
  };

  return {
    applyFileUpdate,
    isPanelVisible,
    markAllAsError,
    queueFiles,
    uploadItems,
  };
};
