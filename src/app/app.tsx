import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useEffect, useState } from "react";
import {
  localStorageDetector,
  navigatorDetector,
} from "typesafe-i18n/detectors";
import { eventConfig } from "../shared/event-config";
import TypesafeI18n from "./i18n/i18n-react";
import { detectLocale } from "./i18n/i18n-util";
import { loadLocaleAsync } from "./i18n/i18n-util.async";
import { Router } from "./views/router";

const queryClient = new QueryClient();

const TranslationProvider = ({ children }: { children: ReactNode }) => {
  // Detect locale
  // (Use as advanaced locale detection strategy as you like.
  // More info: https://github.com/ivanhofer/typesafe-i18n/tree/main/packages/detectors)
  const locale = detectLocale(
    localStorageDetector,
    navigatorDetector,
    () => [eventConfig.defaultLocale],
  );

  const [localesLoaded, setLocalesLoaded] = useState(false);
  useEffect(() => {
    loadLocaleAsync(locale).then(() => {
      setLocalesLoaded(true);
      document.documentElement.lang = locale;
    });
  }, [locale]);

  if (!localesLoaded) {
    return null;
  }

  return <TypesafeI18n locale={locale}>{children}</TypesafeI18n>;
};

export const App = () => {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--primary", eventConfig.theme.primary);
    root.style.setProperty(
      "--primary-foreground",
      eventConfig.theme.primaryForeground,
    );
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TranslationProvider>
        <Router />
      </TranslationProvider>
    </QueryClientProvider>
  );
};
