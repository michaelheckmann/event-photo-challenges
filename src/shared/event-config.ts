export const SUPPORTED_LOCALES = ["de", "en"] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export type LocalizedText = Record<AppLocale, string>;
export type ChallengeDifficulty = "easy" | "medium" | "hard" | "extreme";

export const CHALLENGE_ICON_NAMES = [
  "baby",
  "cake",
  "camera",
  "camera-tripod",
  "drink",
  "game",
  "gem",
  "glasses",
  "hair",
  "heart",
  "hold",
  "location",
  "paint",
  "plate",
  "push-up",
  "sparkles",
  "star",
  "sun",
  "time",
  "user-add",
  "user-group",
  "user-multiple",
  "user-pose",
  "user-time",
] as const;
export type ChallengeIconName = (typeof CHALLENGE_ICON_NAMES)[number];

export type ChallengeConfig = {
  id: string;
  difficulty: ChallengeDifficulty;
  icon: ChallengeIconName;
  rewardEmojis: readonly string[];
  maxSubmissions?: number;
  caption: LocalizedText;
};

export type EventConfig = {
  slug: string;
  defaultLocale: AppLocale;
  name: LocalizedText;
  shortName: LocalizedText;
  description: LocalizedText;
  onboardingTitle: LocalizedText;
  onboardingSubtitle: LocalizedText;
  hero: {
    src: string;
    alt: LocalizedText;
  };
  theme: {
    primary: string;
    primaryForeground: string;
    manifestBackground: string;
  };
  captionLabel: LocalizedText;
  archiveFilenamePrefix: string;
  challenges: readonly ChallengeConfig[];
};

export const eventConfig = {
  slug: "event-photo-challenges",
  defaultLocale: "en",
  name: {
    de: "Event-Foto-Challenges",
    en: "Event Photo Challenges",
  },
  shortName: {
    de: "Foto-Challenges",
    en: "Photo Challenges",
  },
  description: {
    de: "Eine gemeinsame Fotogalerie mit kreativen Challenges für dein Event.",
    en: "A shared photo gallery with creative challenges for your event.",
  },
  onboardingTitle: {
    de: "Euer Event durch eure Augen.",
    en: "Your event through your eyes.",
  },
  onboardingSubtitle: {
    de: "Meistert kreative Foto-Challenges und teilt eure schönsten Momente.",
    en: "Complete creative photo challenges and share your favorite moments.",
  },
  hero: {
    src: "/hero.webp",
    alt: {
      de: "Gäste fotografieren gemeinsam auf einem Event",
      en: "Guests taking photos together at an event",
    },
  },
  theme: {
    primary: "oklch(51.3% 0.11 164)",
    primaryForeground: "oklch(0.986 0.031 120.757)",
    manifestBackground: "#f5f5f4",
  },
  captionLabel: {
    de: "EVENT MOMENTS",
    en: "EVENT MOMENTS",
  },
  archiveFilenamePrefix: "event-photos",
  challenges: [
    {
      id: "youngest-guest",
      difficulty: "medium",
      icon: "baby",
      rewardEmojis: ["👶", "✨", "📸"],
      maxSubmissions: 3,
      caption: {
        de: "Foto mit dem jüngsten Gast",
        en: "Photo with the youngest guest",
      },
    },
    {
      id: "oldest-guest",
      difficulty: "medium",
      icon: "user-time",
      rewardEmojis: ["🎉", "🕰️", "📸"],
      maxSubmissions: 3,
      caption: {
        de: "Foto mit dem ältesten Gast",
        en: "Photo with the oldest guest",
      },
    },
    {
      id: "with-the-hosts",
      difficulty: "medium",
      icon: "heart",
      rewardEmojis: ["🎉", "💛", "📸"],
      maxSubmissions: 5,
      caption: {
        de: "Foto mit den Gastgeber:innen",
        en: "Photo with the hosts",
      },
    },
    {
      id: "prettiest-plate",
      difficulty: "easy",
      icon: "plate",
      rewardEmojis: ["🍽️", "✨", "📸"],
      caption: {
        de: "Foto vom schönsten Teller",
        en: "Photo of the prettiest plate",
      },
    },
    {
      id: "outdoor-game",
      difficulty: "easy",
      icon: "game",
      rewardEmojis: ["🎯", "🌿", "📸"],
      caption: {
        de: "Foto von einem Spiel draußen",
        en: "Photo of an outdoor game",
      },
    },
    {
      id: "photographer",
      difficulty: "easy",
      icon: "camera-tripod",
      rewardEmojis: ["📷", "✨", "📸"],
      maxSubmissions: 3,
      caption: {
        de: "Foto von jemandem beim Fotografieren",
        en: "Photo of someone taking a photo",
      },
    },
    {
      id: "spell-joy",
      difficulty: "medium",
      icon: "heart",
      rewardEmojis: ["🔤", "💛", "📸"],
      caption: {
        de: "Formt gemeinsam das Wort JOY",
        en: "Spell the word JOY together",
      },
    },
    {
      id: "prettiest-hairstyle",
      difficulty: "medium",
      icon: "hair",
      rewardEmojis: ["💇", "✨", "📸"],
      caption: {
        de: "Foto von der schönsten Frisur",
        en: "Photo of the prettiest hairstyle",
      },
    },
    {
      id: "piggyback-ride",
      difficulty: "hard",
      icon: "hold",
      rewardEmojis: ["🏃", "🙌", "📸"],
      caption: {
        de: "Foto von einem Huckepack-Ritt",
        en: "Photo of a piggyback ride",
      },
    },
    {
      id: "new-acquaintance",
      difficulty: "medium",
      icon: "user-add",
      rewardEmojis: ["👋", "🤝", "📸"],
      caption: {
        de: "Foto mit jemandem, den du heute kennengelernt hast",
        en: "Photo with someone you met today",
      },
    },
    {
      id: "borrowed-accessory-selfie",
      difficulty: "medium",
      icon: "glasses",
      rewardEmojis: ["🕶️", "🤳", "✨"],
      caption: {
        de: "Leiht euch ein Accessoire und macht ein Selfie",
        en: "Borrow an accessory and take a selfie",
      },
    },
    {
      id: "celebration-cake",
      difficulty: "easy",
      icon: "cake",
      rewardEmojis: ["🍰", "🎉", "📸"],
      caption: {
        de: "Foto vom Festkuchen oder Dessert",
        en: "Photo of the celebration cake or dessert",
      },
    },
    {
      id: "most-colorful-outfit",
      difficulty: "medium",
      icon: "sparkles",
      rewardEmojis: ["🌈", "✨", "📸"],
      caption: {
        de: "Foto vom farbenfrohsten Outfit",
        en: "Photo of the most colorful outfit",
      },
    },
    {
      id: "guest-photographing",
      difficulty: "extreme",
      icon: "camera",
      rewardEmojis: ["📸", "🔁", "✨"],
      caption: {
        de: "Fotografiere jemanden, der gerade ein Foto macht",
        en: "Photograph someone while they are taking a photo",
      },
    },
    {
      id: "favorite-location-view",
      difficulty: "easy",
      icon: "location",
      rewardEmojis: ["📍", "🌟", "📸"],
      caption: {
        de: "Foto von deinem Lieblingsblick am Veranstaltungsort",
        en: "Photo of your favorite view at the venue",
      },
    },
    {
      id: "second-buffet-helping",
      difficulty: "extreme",
      icon: "plate",
      rewardEmojis: ["🍽️", "😋", "📸"],
      caption: {
        de: "Erwische jemanden beim zweiten Gang zum Buffet",
        en: "Catch someone returning to the buffet",
      },
    },
    {
      id: "through-glass",
      difficulty: "easy",
      icon: "glasses",
      rewardEmojis: ["🥂", "🔍", "📸"],
      caption: {
        de: "Fotografiere das Event durch ein Glas",
        en: "Photograph the event through a glass",
      },
    },
    {
      id: "shadows-only",
      difficulty: "easy",
      icon: "sun",
      rewardEmojis: ["☀️", "🖤", "📸"],
      caption: {
        de: "Foto, auf dem nur Schatten zu sehen sind",
        en: "Photo showing only shadows",
      },
    },
    {
      id: "push-ups",
      difficulty: "extreme",
      icon: "push-up",
      rewardEmojis: ["💪", "🔥", "📸"],
      caption: {
        de: "Foto von jemandem bei Liegestützen",
        en: "Photo of someone doing push-ups",
      },
    },
    {
      id: "deco-detail",
      difficulty: "easy",
      icon: "gem",
      rewardEmojis: ["✨", "🌿", "📸"],
      caption: {
        de: "Foto von einem schönen Dekorationsdetail",
        en: "Photo of a beautiful decoration detail",
      },
    },
    {
      id: "same-zodiac-sign",
      difficulty: "hard",
      icon: "star",
      rewardEmojis: ["⭐", "🤝", "📸"],
      caption: {
        de: "Foto mit jemandem mit deinem Sternzeichen",
        en: "Photo with someone who shares your zodiac sign",
      },
    },
    {
      id: "same-first-letter",
      difficulty: "medium",
      icon: "user-multiple",
      rewardEmojis: ["🔤", "👯", "📸"],
      caption: {
        de: "Foto mit jemandem, dessen Name gleich beginnt",
        en: "Photo with someone whose name starts with the same letter",
      },
    },
    {
      id: "gone-in-one-hour",
      difficulty: "hard",
      icon: "time",
      rewardEmojis: ["⏳", "👀", "📸"],
      caption: {
        de: "Foto von etwas, das in einer Stunde weg sein wird",
        en: "Photo of something that will be gone in an hour",
      },
    },
    {
      id: "lift-a-friend",
      difficulty: "extreme",
      icon: "hold",
      rewardEmojis: ["💪", "🏆", "📸"],
      caption: {
        de: "Foto von mehreren Personen, die jemanden hochheben",
        en: "Photo of a group lifting a friend",
      },
    },
    {
      id: "form-a-heart",
      difficulty: "medium",
      icon: "heart",
      rewardEmojis: ["🫶", "💛", "📸"],
      caption: {
        de: "Formt ein Herz und lasst euch fotografieren",
        en: "Make a heart shape and get photographed",
      },
    },
    {
      id: "drawing-for-hosts",
      difficulty: "medium",
      icon: "paint",
      rewardEmojis: ["🎨", "💌", "📸"],
      caption: {
        de: "Malt ein kleines Bild für die Gastgeber:innen",
        en: "Draw a small picture for the hosts",
      },
    },
    {
      id: "meme-photo",
      difficulty: "extreme",
      icon: "camera",
      rewardEmojis: ["😂", "🔥", "📸"],
      caption: {
        de: "Stellt ein bekanntes Meme als Foto nach",
        en: "Recreate a well-known meme as a photo",
      },
    },
    {
      id: "best-model-pose",
      difficulty: "medium",
      icon: "user-pose",
      rewardEmojis: ["🕺", "✨", "📸"],
      caption: {
        de: "Foto von der besten Model-Pose",
        en: "Photo of the best model pose",
      },
    },
    {
      id: "table-toast",
      difficulty: "easy",
      icon: "drink",
      rewardEmojis: ["🥂", "🎉", "📸"],
      caption: {
        de: "Foto von einem gemeinsamen Anstoßen",
        en: "Photo of a group toast",
      },
    },
    {
      id: "old-group-photo",
      difficulty: "extreme",
      icon: "user-group",
      rewardEmojis: ["🖼️", "👥", "📸"],
      caption: {
        de: "Stellt ein altes Gruppenfoto nach",
        en: "Recreate an old group photo",
      },
    },
    {
      id: "heart-motif-location",
      difficulty: "hard",
      icon: "heart",
      rewardEmojis: ["❤️", "📍", "📸"],
      caption: {
        de: "Findet ein Herzmotiv am Veranstaltungsort",
        en: "Find a heart motif at the venue",
      },
    },
    {
      id: "something-glittering",
      difficulty: "easy",
      icon: "sparkles",
      rewardEmojis: ["✨", "💎", "📸"],
      caption: {
        de: "Foto von etwas Glitzerndem",
        en: "Photo of something glittering",
      },
    },
    {
      id: "first-time-attendee",
      difficulty: "hard",
      icon: "user-add",
      rewardEmojis: ["🎉", "👋", "📸"],
      maxSubmissions: 3,
      caption: {
        de: "Foto mit jemandem, der zum ersten Mal bei so einem Event ist",
        en: "Photo with someone attending this kind of event for the first time",
      },
    },
  ],
} as const satisfies EventConfig;

export type ChallengeId = (typeof eventConfig.challenges)[number]["id"];

export const validateEventConfig = (config: EventConfig): string[] => {
  const errors: string[] = [];
  const ids = new Set<string>();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(config.slug))
    errors.push("slug must be lowercase kebab-case");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(config.archiveFilenamePrefix))
    errors.push("archiveFilenamePrefix must be lowercase kebab-case");
  for (const locale of SUPPORTED_LOCALES) {
    for (const [field, values] of Object.entries({
      name: config.name,
      shortName: config.shortName,
      description: config.description,
      onboardingTitle: config.onboardingTitle,
      onboardingSubtitle: config.onboardingSubtitle,
      captionLabel: config.captionLabel,
      heroAlt: config.hero.alt,
    })) {
      if (!values[locale]?.trim())
        errors.push(`${field}.${locale} is required`);
    }
  }
  for (const challenge of config.challenges) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(challenge.id))
      errors.push(`challenge id ${challenge.id} must be lowercase kebab-case`);
    if (ids.has(challenge.id))
      errors.push(`duplicate challenge id: ${challenge.id}`);
    ids.add(challenge.id);
    if (!(CHALLENGE_ICON_NAMES as readonly string[]).includes(challenge.icon))
      errors.push(`unknown icon for ${challenge.id}: ${challenge.icon}`);
    if (
      challenge.maxSubmissions !== undefined &&
      (!Number.isInteger(challenge.maxSubmissions) ||
        challenge.maxSubmissions < 1)
    )
      errors.push(
        `maxSubmissions for ${challenge.id} must be a positive integer`,
      );
    for (const locale of SUPPORTED_LOCALES) {
      if (!challenge.caption[locale]?.trim())
        errors.push(`caption.${locale} is required for ${challenge.id}`);
    }
  }
  return errors;
};

const configurationErrors = validateEventConfig(eventConfig);
if (configurationErrors.length > 0) {
  throw new Error(
    `Invalid event configuration:\n- ${configurationErrors.join("\n- ")}`,
  );
}
