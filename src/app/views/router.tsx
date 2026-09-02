import { Layout } from "@/components/layout";
import { useAppState } from "@/lib/state";
import { ChallengesView } from "./challenges";
import { Onboarding } from "./onboarding";
import { PhotosView } from "./photos";
import { SettingsView } from "./settings";

export const Router = () => {
  const selectedView = useAppState((state) => state.selectedView);

  if (selectedView === "onboarding") {
    return <Onboarding />;
  }

  return (
    <Layout>
      {selectedView === "photos" && <PhotosView />}
      {selectedView === "challenges" && <ChallengesView />}
      {selectedView === "settings" && <SettingsView />}
    </Layout>
  );
};
