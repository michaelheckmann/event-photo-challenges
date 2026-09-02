import { create } from "zustand";
import { persist } from "zustand/middleware";

export type View = "onboarding" | "photos" | "challenges" | "settings";

export type AppState = {
  deletionTokens: Record<string, string>;
  selectedView: View;
  userName: string | null;
  userId: string;
};

const generateUserId = (): string => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return (
    Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
  );
};

const initialState: AppState = {
  deletionTokens: {},
  selectedView: "onboarding",
  userName: null,
  userId: generateUserId(),
};

export const useAppState = create<AppState>()(
  persist(() => initialState, { name: "event-photo-challenges" }),
);
