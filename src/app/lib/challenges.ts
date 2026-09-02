import {
  Baby02Icon,
  CakeSliceIcon,
  CameraSmile01Icon,
  CameraTripodIcon,
  DrinkIcon,
  GameIcon,
  GemIcon,
  GlassesIcon,
  HairClipsIcon,
  HeartCheckIcon,
  Hold03Icon,
  LocationStar01Icon,
  PaintBrush03Icon,
  PlateIcon,
  PushUpBarIcon,
  SparklesIcon,
  StarCircleIcon,
  Sun03Icon,
  TimeHalfPassIcon,
  UserAdd01Icon,
  UserFullViewIcon,
  UserGroup03Icon,
  UserMultiple02Icon,
  UserTime01Icon,
} from "@hugeicons/core-free-icons";
import {
  eventConfig,
  type AppLocale,
  type ChallengeIconName,
} from "../../shared/event-config";

const challengeIcons = {
  baby: Baby02Icon,
  cake: CakeSliceIcon,
  camera: CameraSmile01Icon,
  "camera-tripod": CameraTripodIcon,
  drink: DrinkIcon,
  game: GameIcon,
  gem: GemIcon,
  glasses: GlassesIcon,
  hair: HairClipsIcon,
  heart: HeartCheckIcon,
  hold: Hold03Icon,
  location: LocationStar01Icon,
  paint: PaintBrush03Icon,
  plate: PlateIcon,
  "push-up": PushUpBarIcon,
  sparkles: SparklesIcon,
  star: StarCircleIcon,
  sun: Sun03Icon,
  time: TimeHalfPassIcon,
  "user-add": UserAdd01Icon,
  "user-group": UserGroup03Icon,
  "user-multiple": UserMultiple02Icon,
  "user-pose": UserFullViewIcon,
  "user-time": UserTime01Icon,
} satisfies Record<ChallengeIconName, unknown>;

export const photoChallenges = eventConfig.challenges.map((challenge) => ({
  ...challenge,
  icon: challengeIcons[challenge.icon],
}));

export const getChallengeContent = (
  locale: AppLocale,
  challenge: (typeof photoChallenges)[number],
) => challenge.caption[locale];

export const getChallengeCaption = (
  locale: AppLocale,
  challengeId: string | undefined,
) =>
  eventConfig.challenges.find((challenge) => challenge.id === challengeId)
    ?.caption[locale];
