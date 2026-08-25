"use client";

import {
  JOJOAccordion,
  JOJOAccordionItem,
  JOJOAccordionVariant,
  JOJOAccordionSize,
} from "@/components/ui/JOJOAccordion";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

interface FaqAccordionProps {
  openFaqItem: string | null;
  onOpenFaqItemChange: (value: string | null) => void;
}

export function FaqAccordion({ openFaqItem, onOpenFaqItemChange }: FaqAccordionProps) {
  const t = useTranslations("LandingPage");
  const [showGlows, setShowGlows] = useState(false);

  // FAQ items come from the active locale's translation file so they update
  // automatically when the user switches language.
  const faqs = t.raw("faqs") as JOJOAccordionItem[];

  // Hash navigation — scroll to #faq on mount and on direct URL open
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setShowGlows(true);

    if (typeof window === "undefined") return;
    const scrollToFaq = () => {
      if (window.location.hash === "#faqs" && sectionRef.current) {
        sectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    const timer = setTimeout(scrollToFaq, 120);
    window.addEventListener("hashchange", scrollToFaq);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("hashchange", scrollToFaq);
    };
  }, []);

  return (
    <div
      id="faqs"
      ref={sectionRef}
      className="relative w-full mx-auto px-4 sm:px-6 lg:px-17.5 pb-16 lg:pb-40 overflow-visible scroll-mt-24"
    >
      {showGlows && <div aria-hidden="true" className="faq-glow-1" />}
      {showGlows && <div aria-hidden="true" className="faq-glow-2" />}
      <div className="relative z-10">
        <h2 className="mb-4 sm:mb-6 text-xl sm:text-2xl lg:text-4xl font-semibold text-theme_1">
          {t("faq_title")}
        </h2>
        <JOJOAccordion
          multiple={false}
          variant={JOJOAccordionVariant.GLASS}
          size={JOJOAccordionSize.LG}
          items={faqs}
          value={openFaqItem ?? ""}
          onValueChange={(val) => onOpenFaqItemChange((val as string) || null)}
          className="cursor-pointer"
        />
      </div>
    </div>
  );
}