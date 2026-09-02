const encoder = new TextEncoder();

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

export const createDeletionToken = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
};

export const hashDeletionToken = async (token: string): Promise<string> =>
  toHex(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", encoder.encode(token)),
    ),
  );

export const deletionTokenMatches = async (
  token: string,
  expectedHash: string,
): Promise<boolean> => {
  const actualHash = await hashDeletionToken(token);
  if (actualHash.length !== expectedHash.length) return false;

  let difference = 0;
  for (let index = 0; index < actualHash.length; index += 1) {
    difference |= actualHash.charCodeAt(index) ^ expectedHash.charCodeAt(index);
  }
  return difference === 0;
};

export const readBearerToken = (authorization: string | undefined) =>
  authorization?.match(/^Bearer\s+([^\s]+)$/i)?.[1];
