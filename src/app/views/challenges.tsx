import { PhotoLightbox } from "@/components/photo-lightbox";
import { UploadStatusPanel } from "@/components/upload-status-panel";
import { getChallengeContent, photoChallenges } from "@/lib/challenges";
import { useChallengeSummaryQuery } from "@/lib/queries/challenges";
import {
  useDeletePhotoMutation,
  useUploadPhotosMutation,
} from "@/lib/queries/photos";
import { useAppState } from "@/lib/state";
import { useUploadStatusPanel } from "@/lib/upload-state";
import { cn } from "@/lib/utils";
import {
  ChampionIcon,
  CrownIcon,
  PartyIcon,
  ThumbsUpIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  type ChangeEvent,
  type ComponentProps,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useReward } from "react-rewards";
import { useWebHaptics } from "web-haptics/react";
import type { PhotoListItem } from "../../shared/photos";
import { useI18nContext } from "../i18n/i18n-react";
import type { TranslationFunctions } from "../i18n/i18n-types";

type Difficulty = "easy" | "medium" | "hard" | "extreme";
type IconProp = ComponentProps<typeof HugeiconsIcon>["icon"];
type Challenge = (typeof photoChallenges)[number];
type ActiveChallengePhoto = {
  caption: string;
  photo: PhotoListItem;
};

// --- Style maps ---

const containerStyles: Record<Difficulty, string> = {
  easy: "bg-emerald-100 border-emerald-200 shadow-emerald-500/5 ring-emerald-500/20",
  medium: "bg-sky-100 border-sky-200 shadow-sky-500/5 ring-sky-500/20",
  hard: "bg-rose-100 border-rose-200 shadow-rose-500/5 ring-rose-500/20",
  extreme:
    "bg-purple-100 border-purple-200 shadow-purple-500/5 ring-purple-500/20",
};

const patternStyles: Record<Difficulty, string> = {
  easy: "text-emerald-300",
  medium: "text-sky-300",
  hard: "text-rose-300",
  extreme: "text-purple-300",
};

const pillStyles: Record<Difficulty, string> = {
  easy: "bg-emerald-500 text-emerald-50 border-emerald-500",
  medium: "bg-sky-500 text-sky-50 border-sky-500",
  hard: "bg-rose-500 text-rose-50 border-rose-500",
  extreme: "bg-purple-500 text-purple-50 border-purple-500",
};

const pillAltStyles: Record<Difficulty, string> = {
  easy: "border-emerald-500 text-emerald-800",
  medium: "border-sky-500 text-sky-800",
  hard: "border-rose-500 text-rose-800",
  extreme: "border-purple-500 text-purple-800",
};

// --- Completed (monochrome) styles ---

const completedContainerStyles =
  "bg-neutral-100 border-neutral-200 shadow-neutral-500/5 ring-neutral-500/20";
const completedPatternStyles = "text-neutral-300";
const completedPillStyles = "bg-neutral-500 text-neutral-50 border-neutral-500";
const lockedContainerStyles =
  "bg-neutral-200 border-neutral-300 shadow-neutral-500/5 ring-neutral-500/20";
const lockedPillStyles = "bg-neutral-800 text-neutral-50 border-neutral-800";

// Icon shown in the card pattern when a challenge is completed, scaled by difficulty
const completedIcons: Record<Difficulty, IconProp> = {
  easy: PartyIcon,
  medium: ThumbsUpIcon,
  hard: ChampionIcon,
  extreme: CrownIcon,
};

// --- Pattern constants ---

const randomRotations = [12, -45, 78, -15, 60, -80, 25, -5, 90];
const GRID_COLS = 3;
const CELL_SIZE = 32;
const PATTERN_SIZE = CELL_SIZE * GRID_COLS;

const getDifficultyLabel = (
  LL: TranslationFunctions,
  difficulty: Difficulty,
) => {
  switch (difficulty) {
    case "easy":
      return LL.challenges.difficulty.easy();
    case "medium":
      return LL.challenges.difficulty.medium();
    case "hard":
      return LL.challenges.difficulty.hard();
    case "extreme":
      return LL.challenges.difficulty.extreme();
  }
};

function getSolvedLabel(LL: TranslationFunctions, count: number): string {
  if (count === 0) return LL.challenges.solvedState.first();
  if (count < 5) return LL.challenges.solvedState.catchUp();
  return LL.challenges.solvedState.keepUp();
}

// --- Sub-components ---

interface ChallengePatternProps {
  id: string;
  icon: IconProp;
  difficulty: Difficulty;
  isCompleted: boolean;
}

const ChallengePattern = ({
  id,
  icon,
  difficulty,
  isCompleted,
}: ChallengePatternProps) => (
  <div
    className={cn(
      "absolute inset-0 z-0 pointer-events-none",
      "mask-[linear-gradient(to_right,transparent_30%,black_100%)]",
    )}
  >
    <svg width="100%" height="100%">
      <defs>
        <pattern
          id={`pattern-${id}`}
          x="0"
          y="0"
          width={PATTERN_SIZE}
          height={PATTERN_SIZE}
          patternUnits="userSpaceOnUse"
        >
          {randomRotations.map((deg, index) => {
            const col = index % GRID_COLS;
            const row = Math.floor(index / GRID_COLS);
            const x = col * CELL_SIZE;
            const y = row * CELL_SIZE;
            const centerX = x + CELL_SIZE / 2;
            const centerY = y + CELL_SIZE / 2;

            return (
              <g
                key={index}
                transform={`rotate(${deg} ${centerX} ${centerY}) translate(${x + 6} ${y + 6})`}
              >
                <HugeiconsIcon
                  icon={icon}
                  size={22}
                  className={cn(
                    isCompleted
                      ? completedPatternStyles
                      : patternStyles[difficulty],
                    "opacity-50",
                  )}
                />
              </g>
            );
          })}
        </pattern>
      </defs>
      <rect
        x="0"
        y="0"
        width="100%"
        height="100%"
        fill={`url(#pattern-${id})`}
      />
    </svg>
  </div>
);

interface ChallengeCardProps {
  challenge: Challenge;
  caption: string;
  isCompleted: boolean;
  isLocked: boolean;
  completedByCount: number;
  onClick: () => void;
  photoUrl: string | null;
}

const ChallengeCard = ({
  challenge,
  caption,
  isCompleted,
  isLocked,
  completedByCount,
  onClick,
  photoUrl,
}: ChallengeCardProps) => {
  const { LL } = useI18nContext();
  const difficulty = challenge.difficulty as Difficulty;
  const patternIcon = isCompleted
    ? completedIcons[difficulty]
    : (challenge.icon as IconProp);
  const isUnavailable = isLocked && !isCompleted;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isUnavailable}
      aria-disabled={isUnavailable}
      className={cn(
        "w-full appearance-none text-left transition-transform",
        isUnavailable ? "cursor-not-allowed" : "active:scale-95 cursor-pointer",
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-2 p-4 rounded-lg relative overflow-hidden",
          "inset-shadow-2xs inset-shadow-white/10 shadow-md border",
          isCompleted
            ? completedContainerStyles
            : isUnavailable
              ? lockedContainerStyles
              : containerStyles[difficulty],
        )}
      >
        <ChallengePattern
          id={challenge.id}
          icon={patternIcon}
          difficulty={difficulty}
          isCompleted={isCompleted}
        />
        <div className="flex gap-2 items-center relative z-10">
          <div
            className={cn(
              "font-semibold tracking-wide text-xs px-2 rounded-full py-0.75 border",
              isCompleted
                ? completedPillStyles
                : isUnavailable
                  ? lockedPillStyles
                  : pillStyles[difficulty],
            )}
          >
            {getDifficultyLabel(LL, difficulty)}
          </div>
          {isUnavailable ? (
            <div className="font-semibold tracking-wide text-xs border border-neutral-500 bg-white/50 px-2 rounded-full py-0.75 text-neutral-800">
              {LL.challenges.solvedState.locked()}
            </div>
          ) : !isCompleted ? (
            <div
              className={cn(
                "font-semibold tracking-wide text-xs border bg-white/50 px-2 rounded-full py-0.75",
                pillAltStyles[difficulty],
              )}
            >
              {getSolvedLabel(LL, completedByCount)}
            </div>
          ) : null}
        </div>
        <div className="flex justify-between gap-4 relative z-10">
          <p
            className={cn(
              "font-semibold leading-tight text-pretty text-black text-shadow-2xs/5",
              isUnavailable && "text-neutral-600",
            )}
          >
            {caption}
          </p>
          {isCompleted &&
            (photoUrl ? (
              <img
                src={photoUrl}
                alt={LL.common.messages.challengePhotoAlt({ caption })}
                className="size-16 shrink-0 rotate-12 rounded-md bg-black object-cover shadow-sm"
              />
            ) : (
              <div className="bg-neutral-700 rounded-md size-16 shrink-0 rotate-12" />
            ))}
        </div>
      </div>
    </button>
  );
};

// --- View ---

export const ChallengesView = () => {
  const { trigger } = useWebHaptics();
  const { LL, locale } = useI18nContext();
  const userId = useAppState((s) => s.userId);
  const userName = useAppState((s) => s.userName);
  const deletionTokens = useAppState((s) => s.deletionTokens);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingChallenge, setPendingChallenge] = useState<Challenge | null>(
    null,
  );
  const [rewardedChallenge, setRewardedChallenge] = useState<{
    id: Challenge["id"];
    signal: number;
  } | null>(null);
  const [activeChallengePhoto, setActiveChallengePhoto] =
    useState<ActiveChallengePhoto | null>(null);
  const { data } = useChallengeSummaryQuery(userId);
  const uploadMutation = useUploadPhotosMutation();
  const deleteMutation = useDeletePhotoMutation();
  const isUploading = uploadMutation.isPending;
  const {
    applyFileUpdate,
    isPanelVisible,
    markAllAsError,
    queueFiles,
    uploadItems,
  } = useUploadStatusPanel(isUploading);
  const statsMap = useMemo(
    () => new Map((data?.challenges ?? []).map((c) => [c.id, c] as const)),
    [data],
  );
  const rewardConfig = useMemo(
    () => ({
      angle: 270,
      decay: 0.91,
      elementCount: 52,
      elementSize: 36,
      emoji: rewardedChallenge
        ? Array.from(
            photoChallenges.find(
              (challenge) => challenge.id === rewardedChallenge.id,
            )?.rewardEmojis ?? ["💛", "✨", "📸"],
          )
        : ["💛", "✨", "📸"],
      lifetime: 100,
      spread: 280,
      startVelocity: 20,
      zIndex: 50,
    }),
    [rewardedChallenge],
  );
  const { reward } = useReward("challenge-reward-rain", "emoji", rewardConfig);

  useEffect(() => {
    if (rewardedChallenge) reward();
  }, [reward, rewardedChallenge]);

  const openFilePicker = (challenge: Challenge) => {
    if (isUploading) return;
    trigger("selection");
    setPendingChallenge(challenge);
    fileInputRef.current?.click();
  };

  const openLightbox = (caption: string, photo: PhotoListItem) => {
    trigger("selection");
    setActiveChallengePhoto({
      caption,
      photo,
    });
  };

  const onFilesSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.currentTarget.value = "";

    if (files.length === 0) {
      setPendingChallenge(null);
      return;
    }

    if (!pendingChallenge) return;

    if (!userName?.trim()) {
      alert(LL.common.messages.enterNameBeforeUpload());
      setPendingChallenge(null);
      return;
    }

    const [file] = files;
    if (!file) {
      setPendingChallenge(null);
      return;
    }

    queueFiles([file]);

    try {
      const result = await uploadMutation.mutateAsync({
        challengeId: pendingChallenge.id,
        files: [file],
        uploadedBy: userName.trim(),
        userId,
        onFileUpdate: applyFileUpdate,
      });
      if (result.uploadedCount > 0) {
        trigger("success");
        setRewardedChallenge((current) => ({
          id: pendingChallenge.id,
          signal: (current?.signal ?? 0) + 1,
        }));
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : LL.common.messages.uploadFailed();
      markAllAsError(message);
    } finally {
      setPendingChallenge(null);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={onFilesSelected}
      />

      <span
        id="challenge-reward-rain"
        className="pointer-events-none fixed left-1/2 -top-28 z-50 size-0"
        aria-hidden="true"
      />

      <div className="p-6 flex flex-col gap-6">
        {photoChallenges.map((challenge) => {
          const caption = getChallengeContent(locale, challenge);
          const stats = statsMap.get(challenge.id);
          return (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              caption={caption}
              isCompleted={stats?.isCompletedByUser ?? false}
              isLocked={stats?.isLocked ?? false}
              completedByCount={stats?.completedByCount ?? 0}
              photoUrl={stats?.photo?.urls.gallery ?? null}
              onClick={() => {
                trigger("selection");
                if (stats?.isCompletedByUser && stats.photo) {
                  openLightbox(caption, stats.photo);
                  return;
                }

                if (!stats?.isCompletedByUser) {
                  openFilePicker(challenge);
                }
              }}
            />
          );
        })}
      </div>

      {activeChallengePhoto && (
        <PhotoLightbox
          canDeletePhoto={(key) => Boolean(deletionTokens[key])}
          photos={[activeChallengePhoto.photo]}
          startIndex={0}
          getCaption={() => activeChallengePhoto.caption}
          onClose={() => {
            trigger("medium");
            setActiveChallengePhoto(null);
          }}
          onDelete={(key) => {
            const deletionToken = deletionTokens[key];
            if (!deletionToken) return;
            deleteMutation.mutate({
              challengeId: activeChallengePhoto.photo.metadata.challengeId,
              deletionToken,
              key,
              userId,
            });
            setActiveChallengePhoto(null);
            trigger("success");
          }}
        />
      )}

      <div
        className={cn(
          "fixed bottom-20 pb-2 px-5 origin-bottom w-full max-w-2xl transition-all duration-200 ease-out z-20",
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
