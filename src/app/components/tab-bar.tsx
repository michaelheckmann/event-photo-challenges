import { useAppState, View } from "@/lib/state";
import { cn } from "@/lib/utils";
import {
  Photo,
  Settings01Icon,
  Target02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useWebHaptics } from "web-haptics/react";
import { useI18nContext } from "../i18n/i18n-react";

export const TabBar = () => {
  const { trigger } = useWebHaptics();
  const { LL } = useI18nContext();

  const selectedView = useAppState((state) => state.selectedView);

  const setSelectedView = (view: View) => {
    trigger("selection");
    useAppState.setState({ selectedView: view });
  };

  return (
    <div
      className={cn(
        "fixed w-full bottom-0 h-16 max-w-2xl left-1/2 -translate-x-1/2 z-50",
        "bg-neutral-100/95 backdrop-blur-sm border-t",
        "sm:border-x",
        "flex-center gap-4 px-4",
      )}
    >
      <div className="flex justify-between max-w-64 size-full">
        <button
          aria-label={LL.common.views.photos()}
          className={cn(
            "h-full w-16 flex-center cursor-pointer",
            "active:scale-95 transition-transform",
          )}
          onClick={() => setSelectedView("photos")}
        >
          <HugeiconsIcon
            icon={Photo}
            size={24}
            strokeWidth={2.2}
            className={cn(
              "opacity-40 transition-opacity duration-300",
              selectedView === "photos" && "opacity-90",
            )}
          />
        </button>
        <button
          aria-label={LL.common.views.challenges()}
          className={cn(
            "h-full w-16 flex-center cursor-pointer",
            "active:scale-95 transition-transform",
          )}
          onClick={() => setSelectedView("challenges")}
        >
          <HugeiconsIcon
            icon={Target02Icon}
            size={24}
            strokeWidth={2.2}
            onClick={() => setSelectedView("challenges")}
            className={cn(
              "opacity-40 transition-opacity duration-300",
              selectedView === "challenges" && "opacity-90",
            )}
          />
        </button>
        <button
          aria-label={LL.common.views.settings()}
          className={cn(
            "h-full w-16 flex-center cursor-pointer",
            "active:scale-95 transition-transform",
          )}
          onClick={() => setSelectedView("settings")}
        >
          <HugeiconsIcon
            icon={Settings01Icon}
            size={24}
            strokeWidth={2.2}
            onClick={() => setSelectedView("settings")}
            className={cn(
              "opacity-40 transition-opacity duration-300",
              selectedView === "settings" && "opacity-90",
            )}
          />
        </button>
      </div>
    </div>
  );
};
