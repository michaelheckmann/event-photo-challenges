import { Progress } from "@/components/ui/progress";
import type { UploadItem } from "@/lib/upload-state";
import { translateAppError } from "@/lib/utils";
import { useI18nContext } from "../i18n/i18n-react";

type Props = {
  items: UploadItem[];
  isUploading: boolean;
};

export const UploadStatusPanel = ({ items, isUploading }: Props) => {
  const { LL } = useI18nContext();
  const completedCount = items.filter((i) => i.status === "success").length;
  const failedCount = items.filter((i) => i.status === "error").length;
  const firstError = items.find((i) => i.errorMessage)?.errorMessage;

  const title = isUploading
    ? LL.uploadStatus.uploadingTitle({ count: items.length })
    : failedCount > 0
      ? LL.uploadStatus.failedTitle()
      : LL.uploadStatus.completeTitle();

  const subtitle =
    failedCount > 0
      ? LL.uploadStatus.subtitleWithFailures({
          completedCount,
          failedCount,
          totalCount: items.length,
        })
      : LL.uploadStatus.subtitleCompleted({
          completedCount,
          totalCount: items.length,
        });

  return (
    <div className="w-full rounded-lg bg-white px-4 py-3 shadow-lg/15 ring-1 ring-black/10">
      <div className="flex items-center justify-between gap-3">
        <div className="ml-1">
          <p className="text-sm font-bold">{title}</p>
          {<p className="text-xs font-semibold text-neutral-400">{subtitle}</p>}
        </div>
        {isUploading && (
          <div className="size-5 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-400" />
        )}
      </div>

      <div className="mt-2 space-y-2">
        <Progress
          value={((completedCount + failedCount) / items.length) * 100}
        />
        {firstError && (
          <p className="text-xs font-semibold text-red-500 ml-1">
            {translateAppError(LL, firstError)}
          </p>
        )}
      </div>
    </div>
  );
};
