"use client";

import { PageBackground } from "@/components/common/PageBackground";
import { JOJOButton, JOJOCustomButton } from "@/components/ui/JOJOButton";
import { JOJOCardContent, JOJOCardFooter, JOJOCustomCard } from "@/components/ui/JOJOCard";
import { JOJOTabs } from "@/components/ui/JOJOTabs";
import { LOCALE_LABELS, Locale, SUPPORTED_LOCALES } from "@/enums/ui.enum";
import { ROUTES } from "@/lib/constants/routes";
import { initLocale, useLocaleStore } from "@/store/useLocaleStore";
import { useNavStore } from "@/store/useNavStore";
import { themeColors } from "@/tailwind.config";
import { useGeoAvailability } from "@features/geo/hooks/useGeoAvailability";
import Lottie from "lottie-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FaqAccordion } from "./faqAccordion";
import Loading from "./loading";

const selectLocale = (s: ReturnType<typeof useLocaleStore.getState>) => s.locale;
const selectSetLocale = (s: ReturnType<typeof useLocaleStore.getState>) => s.setLocale;

export default function LandingPage() {
  const t = useTranslations("LandingPage");
  const router = useRouter();
  const locale = useLocaleStore(selectLocale);
  const setLocale = useLocaleStore(selectSetLocale);
  const setHeroLoginVisible = useNavStore((s) => s.setHeroLoginVisible);
  const { isAvailable } = useGeoAvailability();
  const [openFaqItem, setOpenFaqItem] = useState<string | null>(null);
  const [animationData, setAnimationData] = useState<object | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const heroLoginRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let mounted = true;
    fetch("/lottie/device_carousel_data.json")
      .then((res) => res.json())
      .then((data) => {
        if (mounted) {
          setAnimationData(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    void initLocale();
  }, []);

  useEffect(() => {
    const el = heroLoginRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setHeroLoginVisible(entry.isIntersecting),
      { threshold: 0 }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      setHeroLoginVisible(true);
    };
  }, [setHeroLoginVisible, isLoading]);

  useEffect(() => {
    const handleScroll = () => {
      // When user scrolls near top, close FAQ accordion
      if (window.scrollY <= 100) {
        setOpenFaqItem(null);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="flex flex-col mt-42">
      <div className="flex flex-col">
        <PageBackground />
        <div className="z-2 flex-1 flex flex-col items-center pt-0 lg:pt-10">
          <JOJOCustomCard className="w-full max-w-xs sm:max-w-sm md:max-w-md" cardConfig={{
            borderGradient: "card_border_gradient",
            borderWidth: 2,
            showBorder: true,
          }}>
            <JOJOCardContent className="flex flex-col items-center gap-50 text-center w-full" gap={50}>
              {/* Language tabs */}
              <JOJOTabs
                items={SUPPORTED_LOCALES.map((code) => ({
                  value: code,
                  label: LOCALE_LABELS[code as Locale],
                }))}
                value={locale}
                onChange={(code) => setLocale(code as Locale)}
              />
              <div className="flex flex-col gap-2 w-full">
                <h1
                  className="w-full text-center m-0 whitespace-pre-line title-lg-semibold px-4"
                  style={{
                    color: "var(--theme_3)",
                    lineHeight: "32px",
                  }}
                >
                  {t("headline")}
                </h1>
                <p
                  className="text-center m-0 title-sm-medium"
                  style={{
                    color: "var(--theme_13_samecolour)",
                    lineHeight: "28px",
                  }}
                >
                  {t("subheadline")}
                </p>
              </div>
              <JOJOCustomButton
                ref={heroLoginRef}
                size={JOJOButton.Size.L}
                state={JOJOButton.State.ACTIVE}
                hoverColor={themeColors.theme_13_samecolour}
                onClick={() => router.push(ROUTES.LOGIN)}
              >
                {t("login")}
              </JOJOCustomButton>
            </JOJOCardContent>

            {!isAvailable && (
              <JOJOCardFooter className="w-full pt-2">
                <p className="m-0 text-center w-full text-theme_7 body-xs-regular">
                  {t("not_existing_user")}
                  <span
                    role="button"
                    tabIndex={0}
                    className="text-theme_13_samecolour cursor-pointer hover:underline ml-1"
                    onClick={() => router.push(ROUTES.REGISTER)}
                    onKeyDown={(e) => e.key === "Enter" && router.push(ROUTES.REGISTER)}
                  >
                    {t("create_account")}
                  </span>
                </p>
              </JOJOCardFooter>
            )}
          </JOJOCustomCard>
        </div>
      </div>
      <div className="relative z-2 text-center px-4 mt-40 sm:mt-38 md:mt-54 lg:mt-55 xl:mt-60 xs:pb-10 sm:pb-0">
        <h2 className="display-lg-semibold text-theme_1 mb-3">
          {t("tagline")}
        </h2>
        <p className="body-md-medium text-theme_4 leading-[1.7] m-0 whitespace-pre-line">
          {t("tagline_sub")}
        </p>
      </div>
      <div className="flex justify-center items-center overflow-hidden w-full relative h-[290px] sm:h-[395px] md:h-[490px] lg:h-[550px] xl:h-[800px] mb-10 md:mb-14">
        <Lottie
          animationData={animationData}
          loop
          className="
            absolute
            z-1
            w-full
            scale-180
            lg:scale-100
            origin-center
          "
        />
      </div>
      <FaqAccordion openFaqItem={openFaqItem} onOpenFaqItemChange={setOpenFaqItem} />
    </div>
  );
}
