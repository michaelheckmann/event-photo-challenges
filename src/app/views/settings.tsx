import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePhotoArchiveQuery } from "@/lib/queries/photos";
import { useAppState } from "@/lib/state";
import { cn } from "@/lib/utils";
import { Download02Icon, Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useWebHaptics } from "web-haptics/react";
import { eventConfig } from "../../shared/event-config";
import { useI18nContext } from "../i18n/i18n-react";

export const SettingsView = () => {
  const { trigger } = useWebHaptics();
  const userName = useAppState((state) => state.userName);
  const { LL, locale } = useI18nContext();
  const archive = usePhotoArchiveQuery();
  const localizedArchive = archive.data?.downloads[locale];

  const onChangeUserName = (userName: string) => {
    useAppState.setState({ userName });
  };

  const onChangeLanguage = (locale: string) => {
    trigger("selection");
    localStorage.setItem("lang", locale);
    window.location.reload();
  };

  const formattedArchiveSize = localizedArchive?.downloadBytes
    ? new Intl.NumberFormat(locale, {
        maximumFractionDigits: 1,
        style: "unit",
        unit:
          localizedArchive.downloadBytes >= 1_000_000_000
            ? "gigabyte"
            : "megabyte",
        unitDisplay: "short",
      }).format(
        localizedArchive.downloadBytes /
          (localizedArchive.downloadBytes >= 1_000_000_000
            ? 1_000_000_000
            : 1_000_000),
      )
    : null;
  const isArchiveEmpty = archive.data?.status === "empty";
  const isArchiveAvailable =
    archive.data?.status === "available" && Boolean(formattedArchiveSize);
  const canDownloadArchive =
    archive.data?.status === "available" &&
    Boolean(localizedArchive?.downloadUrl);

  return (
    <>
      <div className="p-6 flex flex-col gap-12">
        <div>
          <Label
            htmlFor="username"
            className="flex flex-col items-start gap-0 pb-4"
          >
            <p className="font-bold text-lg">{LL.common.labels.name()}</p>
            <p className="text-muted-foreground leading-snug text-pretty">
              {LL.settings.nameDescription()}
            </p>
          </Label>
          <Input
            id="username"
            placeholder={LL.common.placeholders.name()}
            className="w-full"
            value={userName ?? ""}
            onChange={(e) => onChangeUserName(e.target.value)}
          />
        </div>
        <div>
          <Label className="flex flex-col items-start gap-0 pb-4">
            <p className="font-bold text-lg">{LL.common.labels.language()}</p>
            <p className="text-muted-foreground leading-snug text-pretty">
              {LL.settings.languageDescription()}
            </p>
          </Label>
          <div className="flex gap-4">
            <button
              className={cn(
                "h-12 font-semibold flex-1 bg-neutral-100 rounded-md",
                "active:scale-95 transition-transform",
                locale === "de" &&
                  "border-2 border-primary/80 ring-3 ring-primary/20 text-primary",
              )}
              onClick={() => onChangeLanguage("de")}
            >
              {LL.common.labels.german()}
            </button>
            <button
              className={cn(
                "h-12 font-semibold flex-1 bg-neutral-100 rounded-md",
                "active:scale-95 transition-transform",
                locale === "en" &&
                  "border-2 border-primary/80 ring-3 ring-primary/20 text-primary",
              )}
              onClick={() => onChangeLanguage("en")}
            >
              {LL.common.labels.english()}
            </button>
          </div>
        </div>
        <div>
          <Label className="flex flex-col items-start gap-0 pb-4">
            <p className="font-bold text-lg">{LL.settings.archiveTitle()}</p>
            <p className="text-muted-foreground leading-snug text-pretty">
              {LL.settings.archiveDescription()}
            </p>
          </Label>
          {isArchiveAvailable && formattedArchiveSize ? (
            <p className="mb-3 text-sm text-muted-foreground">
              {LL.settings.archiveSummary({
                downloadSize: formattedArchiveSize,
                imageCount: archive.data?.imageCount ?? 0,
              })}
            </p>
          ) : isArchiveEmpty ? (
            <p className="mb-3 text-sm text-muted-foreground">
              {LL.settings.archiveEmpty()}
            </p>
          ) : (
            <p className="mb-3 text-sm text-muted-foreground">
              {archive.isError
                ? LL.settings.archiveError()
                : LL.settings.archivePreparing({
                    imageCount: archive.data?.imageCount ?? 0,
                  })}
            </p>
          )}
          <Button
            variant="secondary"
            asChild={canDownloadArchive}
            className="w-full border-2 border-primary/80 ring-3 ring-primary/20 text-primary"
            disabled={!canDownloadArchive}
          >
            {canDownloadArchive && localizedArchive?.downloadUrl ? (
              <a
                href={localizedArchive.downloadUrl}
                download={`${eventConfig.archiveFilenamePrefix}-${locale}.zip`}
              >
                <HugeiconsIcon icon={Download02Icon} strokeWidth={2} />
                {LL.settings.archiveDownload()}
              </a>
            ) : (
              <span className="flex items-center gap-2">
                <HugeiconsIcon
                  icon={
                    isArchiveEmpty || archive.isError
                      ? Download02Icon
                      : Loading03Icon
                  }
                  className={
                    !isArchiveEmpty && !archive.isError
                      ? "animate-spin"
                      : undefined
                  }
                  strokeWidth={2}
                />
                {isArchiveEmpty
                  ? LL.settings.archiveEmptyDownload()
                  : LL.settings.archiveDownload()}
              </span>
            )}
          </Button>
        </div>
      </div>
    </>
  );
};
