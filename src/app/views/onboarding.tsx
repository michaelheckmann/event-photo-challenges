import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppState } from "@/lib/state";
import { cn } from "@/lib/utils";
import { type FormEvent, useState } from "react";
import { eventConfig } from "../../shared/event-config";
import { useI18nContext } from "../i18n/i18n-react";

export const Onboarding = () => {
  const [userName, setUserName] = useState("");
  const { LL, locale } = useI18nContext();

  const onJoin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (userName.trim() === "") {
      alert(LL.common.messages.enterName());
      return;
    }
    useAppState.setState({ userName, selectedView: "photos" });
  };

  return (
    <main className="bg-neutral-100 h-dvh">
      <div className={cn("max-w-2xl bg-neutral-50 h-dvh mx-auto sm:border-x")}>
        <img
          src={eventConfig.hero.src}
          alt={eventConfig.hero.alt[locale]}
          className="object-cover w-full h-[52dvh] sm:object-center object-bottom"
        />
        <div className="pb-8 pt-6 px-6">
          <div className="flex-center flex-col gap-4 pb-6">
            <h1 className="text-4xl font-bold tracking-tight text-center text-balance leading-[1.05]">
              {eventConfig.onboardingTitle[locale]}
            </h1>
            <p className="text-lg/tight text-center text-pretty font-semibold tracking-tight text-muted-foreground">
              {eventConfig.onboardingSubtitle[locale]}
            </p>
          </div>
          <form onSubmit={onJoin}>
            <div className="w-full pb-4 px-6">
              <Input
                autoComplete="name"
                enterKeyHint="go"
                name="userName"
                placeholder={LL.common.placeholders.name()}
                className="w-full"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
              />
            </div>
            <div className="w-full px-6">
              <Button className="w-full" type="submit">
                {LL.common.actions.join()}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
};
