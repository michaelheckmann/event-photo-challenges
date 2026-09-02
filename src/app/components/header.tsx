import { useAppState } from "@/lib/state";
import { cn, useScrollOffset } from "@/lib/utils";
import { TextMorph } from "torph/react";
import { useI18nContext } from "../i18n/i18n-react";

const useHeaderText = () => {
  const { LL } = useI18nContext();
  const selectedView = useAppState((state) => state.selectedView);

  switch (selectedView) {
    case "photos":
      return LL.common.views.photos();
    case "challenges":
      return LL.common.views.challenges();
    case "settings":
      return LL.common.views.settings();
    default:
      return "";
  }
};

export const Header = () => {
  const headerText = useHeaderText();
  const isScrolled = useScrollOffset(16);

  return (
    <div
      className={cn(
        "sticky top-0 left-0 w-full h-12 z-50",
        "flex-center px-6",
        "border-transparent border-b bg-transparent",
        isScrolled && "bg-neutral-50 border-border",
      )}
    >
      <TextMorph className="font-bold text-lg">{headerText}</TextMorph>
    </div>
  );
};
