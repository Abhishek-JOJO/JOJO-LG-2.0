import { DEFAULT_LOCALE, Locale, SUPPORTED_LOCALES } from "@/enums/ui.enum";
import { StorageKey } from "@enums/storage.enum";
import { localStorageManager } from "@lib/localStorage/localStorage.manager";
import { cookiesManager } from "@/lib/cookies/cookies.manager";
import { getQueryClient } from "@lib/react-query/queryClient";
import { create } from "zustand";
import { analyticsService } from "@/shared/analytics";
import { EVENT_NAMES } from "@/shared/analytics/constants/analytics.constants";

import enMessages from "../messages/en.json";
import guMessages from "../messages/gu.json";

const messagesMap: Record<Locale, Record<string, unknown>> = {
  en: enMessages as Record<string, unknown>,
  gu: guMessages as Record<string, unknown>,
};

function isValidLocale(value: unknown): value is Locale {
  return SUPPORTED_LOCALES.includes(value as Locale);
}

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const stored = localStorageManager.get<string>(StorageKey.LOCALE);
    if (stored && SUPPORTED_LOCALES.includes(stored as Locale)) {
      return stored as Locale;
    }
  } catch { }
  return DEFAULT_LOCALE;
}

const initialLocale = getInitialLocale();

interface LocaleState {
  locale: Locale;
  messages: Record<string, unknown> | null;
  setLocale: (locale: Locale) => Promise<void>;
}

export const useLocaleStore = create<LocaleState>((set, get) => ({
  locale: initialLocale,
  messages: messagesMap[initialLocale] || enMessages,

  setLocale: async (locale) => {
    const oldLocale = get().locale;
    const messages = messagesMap[locale] || enMessages;
    localStorageManager.set(StorageKey.LOCALE, locale);
    cookiesManager.set("jojo_locale", locale);
    set({ locale, messages });

    // Invalidate react-query cache to refetch all active data with the new language header
    getQueryClient().invalidateQueries();

    // Track language changed
    if (oldLocale && oldLocale !== locale) {
      try {
        analyticsService.track(EVENT_NAMES.WEB_LANGUAGE_CHANGED, {
          old_language: oldLocale,
          new_language: locale,
        });
      } catch (e) { }
    }
  },
}));

/** Call once on app boot to rehydrate locale from localStorage. */
export async function initLocale(): Promise<void> {
  const stored = localStorageManager.get<string>(StorageKey.LOCALE);
  const locale: Locale = isValidLocale(stored) ? stored : DEFAULT_LOCALE;
  cookiesManager.set("jojo_locale", locale);
  await useLocaleStore.getState().setLocale(locale);
}

