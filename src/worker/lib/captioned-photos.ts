import { Resvg } from "@cf-wasm/resvg/workerd";
import type { ChallengeId } from "../../shared/challenges";
import {
  eventConfig,
  SUPPORTED_LOCALES,
  type AppLocale,
} from "../../shared/event-config";

export const CAPTION_STYLE_VERSION = "v3";
export const CAPTION_LOCALES = SUPPORTED_LOCALES;
const CAPTION_STYLE_VERSIONS = ["v1", "v2", CAPTION_STYLE_VERSION] as const;

export type CaptionLocale = AppLocale;

const OUTPUT_CONTENT_TYPE = "image/jpeg";
const OUTPUT_QUALITY = 92;
const IMAGES_BINDING_MAX_INPUT_BYTES = 20 * 1024 * 1024;
const CAPTION_SOURCE_MAX_DIMENSION = 2400;
const CAPTION_FONT_KEY = "_assets/inter-variable.ttf";
const CAPTION_FONT_URL =
  "https://raw.githubusercontent.com/google/fonts/main/ofl/inter/Inter%5Bopsz,wght%5D.ttf";

export const isCaptionLocale = (value: string): value is CaptionLocale =>
  CAPTION_LOCALES.some((locale) => locale === value);

export const getCaptionedPhotoKey = (
  originalKey: string,
  locale: CaptionLocale,
): string => `${CAPTION_STYLE_VERSION}/${locale}/${originalKey}.jpg`;

export const getChallengeCaption = (
  challengeId: ChallengeId,
  locale: CaptionLocale,
): string => {
  const challenge = eventConfig.challenges.find(
    (entry) => entry.id === challengeId,
  );
  if (!challenge) throw new Error(`Unknown challenge: ${challengeId}`);
  return challenge.caption[locale];
};

export const generateCaptionedPhotoVariants = async (
  env: Env,
  originalKey: string,
  challengeId: ChallengeId,
): Promise<void> => {
  for (const locale of CAPTION_LOCALES) {
    await ensureCaptionedPhoto(env, originalKey, challengeId, locale);
  }
};

export const ensureCaptionedPhoto = async (
  env: Env,
  originalKey: string,
  challengeId: ChallengeId,
  locale: CaptionLocale,
): Promise<R2ObjectBody> => {
  const derivativeKey = getCaptionedPhotoKey(originalKey, locale);
  const existing = await env.PHOTO_DERIVATIVES.get(derivativeKey);
  if (existing) return existing;

  const transformed = await renderCaptionedPhoto(
    env,
    originalKey,
    getChallengeCaption(challengeId, locale),
    locale,
  );

  await env.PHOTO_DERIVATIVES.put(derivativeKey, transformed.body, {
    customMetadata: {
      challengeId,
      locale,
      originalKey,
      styleVersion: CAPTION_STYLE_VERSION,
    },
    httpMetadata: {
      cacheControl: "public, max-age=31536000, immutable",
      contentType: OUTPUT_CONTENT_TYPE,
    },
  });

  const stored = await env.PHOTO_DERIVATIVES.get(derivativeKey);
  if (!stored) throw new Error("The captioned photo could not be stored.");
  return stored;
};

export const deleteCaptionedPhotoVariants = async (
  bucket: R2Bucket,
  originalKey: string,
): Promise<void> => {
  await bucket.delete(
    CAPTION_STYLE_VERSIONS.flatMap((version) =>
      CAPTION_LOCALES.map(
        (locale) => `${version}/${locale}/${originalKey}.jpg`,
      ),
    ),
  );
};

export const renderCaptionedPhoto = async (
  env: Env,
  originalKey: string,
  caption: string,
  locale: CaptionLocale,
): Promise<Response> => {
  const original = await env.PHOTOS.head(originalKey);
  if (!original) throw new Error("The original photo was not found.");
  return renderSizedCaptionedPhoto(env, originalKey, caption, locale);
};

const renderSizedCaptionedPhoto = async (
  env: Env,
  originalKey: string,
  caption: string,
  locale: CaptionLocale,
): Promise<Response> => {
  const sourceUrl = buildLargePhotoSourceUrl(env.APP_BASE_URL, originalKey);
  const sourceResponse = await fetchLargePhotoSource(sourceUrl);
  if (!sourceResponse.ok) {
    throw new Error(
      `The caption source failed with ${sourceResponse.status}.`,
    );
  }

  const sourceImage = await sourceResponse.arrayBuffer();
  if (sourceImage.byteLength > IMAGES_BINDING_MAX_INPUT_BYTES) {
    throw new Error("The sized caption source exceeds the Images input limit.");
  }

  const metadataBody = new Response(sourceImage).body;
  if (!metadataBody) throw new Error("The caption source could not be read.");

  const info = await env.IMAGES.info(metadataBody);
  if (!("width" in info) || !("height" in info)) {
    throw new Error("The caption source dimensions could not be read.");
  }

  const imageBody = new Response(sourceImage).body;
  if (!imageBody) throw new Error("The caption source could not be read.");

  return composeCaptionedPhoto(
    env,
    imageBody,
    caption,
    locale,
    info.width,
    info.height,
  );
};

const buildLargePhotoSourceUrl = (
  appBaseUrl: string,
  originalKey: string,
): string => {
  const baseUrl = appBaseUrl.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(baseUrl)) {
    throw new Error("APP_BASE_URL is required for large captioned photos.");
  }

  return `${baseUrl}/api/photo-objects/${encodeURIComponent(originalKey)}`;
};

const fetchLargePhotoSource = (sourceUrl: string): Promise<Response> =>
  fetch(sourceUrl, {
    cf: {
      image: {
        anim: false,
        fit: "scale-down",
        format: "jpeg",
        metadata: "none",
        quality: 92,
        height: CAPTION_SOURCE_MAX_DIMENSION,
        width: CAPTION_SOURCE_MAX_DIMENSION,
      },
    },
  });

const composeCaptionedPhoto = async (
  env: Env,
  imageBody: ReadableStream<Uint8Array>,
  caption: string,
  locale: CaptionLocale,
  width: number,
  height: number,
): Promise<Response> => {
  const overlay = createCaptionOverlaySvg({
    caption,
    height,
    locale,
    width,
  });
  const captionFont = await getCaptionFont(env.PHOTO_DERIVATIVES);
  const renderer = await Resvg.async(overlay, {
    background: "rgba(0, 0, 0, 0)",
    font: {
      defaultFontFamily: "Inter",
      fontBuffers: [captionFont],
      sansSerifFamily: "Inter",
    },
  });
  const overlayPng = renderer.render().asPng();
  const overlayBody = new Response(overlayPng).body;
  if (!overlayBody)
    throw new Error("The caption overlay could not be created.");

  const result = await env.IMAGES.input(imageBody)
    .draw(overlayBody, { bottom: 0, left: 0 })
    .output({ format: OUTPUT_CONTENT_TYPE, quality: OUTPUT_QUALITY });

  return result.response();
};

type CaptionOverlayOptions = {
  caption: string;
  height: number;
  locale: CaptionLocale;
  width: number;
};

export const createCaptionOverlaySvg = ({
  caption,
  height,
  locale,
  width,
}: CaptionOverlayOptions): string => {
  const shortSide = Math.min(width, height);
  const horizontalPadding = Math.round(shortSide * 0.04);
  const bottomPadding = Math.round(shortSide * 0.04);
  const labelFontSize = Math.round(shortSide * 0.022);
  const maxTextWidth = width - horizontalPadding * 2;
  const { fontSize, lines } = fitCaption(caption, maxTextWidth, shortSide);
  const lineHeight = Math.round(fontSize * 1.18);
  const labelGap = Math.round(shortSide * 0.02);
  const labelHeight = Math.round(labelFontSize * 1.15);
  const textHeight = lines.length * lineHeight;
  const panelHeight = Math.min(
    height,
    bottomPadding * 2 + labelHeight + labelGap + textHeight,
  );
  const textStartY = height - bottomPadding - textHeight + fontSize * 0.82;
  const label = eventConfig.captionLabel[locale];
  const gradientHeight = Math.min(
    height * 0.34,
    Math.max(panelHeight * 1.25, shortSide * 0.24),
  );
  const gradientStart = height - gradientHeight;
  const localTextStartY = textStartY - gradientStart;

  const textLines = lines
    .map(
      (line, index) =>
        `<tspan x="${horizontalPadding}" y="${Math.round(localTextStartY + index * lineHeight)}">${escapeXml(line)}</tspan>`,
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${gradientHeight}" viewBox="0 0 ${width} ${gradientHeight}">
  <defs>
    <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
      <stop offset="0" stop-color="#000" stop-opacity="0.025"/>
      <stop offset="0.3" stop-color="#000" stop-opacity="0.025"/>
      <stop offset="0.55" stop-color="#000" stop-opacity="0.25"/>
      <stop offset="0.75" stop-color="#000" stop-opacity="0.48"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.62"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${width}" height="${gradientHeight}" fill="url(#shade)"/>
  <text x="${horizontalPadding}" y="${Math.round(localTextStartY - labelGap - labelHeight)}" fill="#fff" font-family="Inter, sans-serif" font-size="${labelFontSize}" font-weight="700" letter-spacing="${Math.round(labelFontSize * 0.12)}">${escapeXml(label)}</text>
  <text fill="#fff" font-family="Inter, sans-serif" font-size="${fontSize}" font-weight="700">${textLines}</text>
</svg>`;
};

const getCaptionFont = async (bucket: R2Bucket): Promise<Uint8Array> => {
  const stored = await bucket.get(CAPTION_FONT_KEY);
  if (stored) return new Uint8Array(await stored.arrayBuffer());

  const response = await fetch(CAPTION_FONT_URL);
  if (!response.ok) {
    throw new Error(`Caption font download failed with ${response.status}.`);
  }

  const font = await response.arrayBuffer();
  await bucket.put(CAPTION_FONT_KEY, font, {
    httpMetadata: {
      cacheControl: "public, max-age=31536000, immutable",
      contentType: "font/ttf",
    },
  });
  return new Uint8Array(font);
};

const fitCaption = (
  caption: string,
  maxWidth: number,
  shortSide: number,
): { fontSize: number; lines: string[] } => {
  const maximumFontSize = Math.round(shortSide * 0.042);
  const minimumFontSize = Math.round(shortSide * 0.022);

  for (
    let fontSize = maximumFontSize;
    fontSize >= minimumFontSize;
    fontSize -= 2
  ) {
    const lines = wrapText(caption, maxWidth, fontSize);
    if (lines.length <= 4) return { fontSize, lines };
  }

  return {
    fontSize: minimumFontSize,
    lines: wrapText(caption, maxWidth, minimumFontSize),
  };
};

const wrapText = (
  text: string,
  maxWidth: number,
  fontSize: number,
): string[] => {
  const maxCharacters = Math.max(12, Math.floor(maxWidth / (fontSize * 0.55)));
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (candidate.length <= maxCharacters || currentLine === "") {
      currentLine = candidate;
      continue;
    }
    lines.push(currentLine);
    currentLine = word;
  }

  if (currentLine) lines.push(currentLine);
  return lines;
};

const escapeXml = (value: string): string =>
  value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&apos;",
    };
    return entities[character] ?? character;
  });
