"use client";

import { useEffect, useState } from "react";
import { fetchPolicy, PolicyResponse } from "@/lib/api/linkHandler";
import { useBootstrap } from "@/lib/bootstrap/BootstrapContext";
import { useLocaleStore } from "@/store/useLocaleStore";
import { useTranslations } from "next-intl";

export default function PrivacyPage() {
  const { isAppReady } = useBootstrap();
  const t = useTranslations("policy");
  const locale = useLocaleStore((s) => s.locale);
  const [policy, setPolicy] = useState<PolicyResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!isAppReady) return;

    const load = async () => {
      setLoading(true);
      const languageId = locale === "gu" ? 2 : 1;
      try {
        const result = await fetchPolicy(1, languageId); // policy_id 1 for Privacy Policy
        setPolicy(result);
        setError("");
      } catch (e: any) {
        console.error(e);
        setError(e.message || t("failedPrivacy"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAppReady, locale, t]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-white">
        <span className="animate-pulse">{t("loadingPrivacy")}</span>
      </div>
    );
  }

  if (error) {
    return <div className="p-8 text-red-400">{error}</div>;
  }

  return (
    <div className="min-h-screen">
      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
        <div
          className="policy-content prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: policy?.policy_description || "" }}
        />
      </div>

      {/* Scoped styles for policy HTML content */}
      <style jsx global>{`
        .policy-content h1 {
          font-size: 1.75rem;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 1rem;
          line-height: 1.3;
        }
        .policy-content h2 {
          font-size: 1.5rem;
          font-weight: 600;
          color: #f0f0f0;
          margin-top: 2rem;
          margin-bottom: 0.75rem;
        }
        .policy-content h3 {
          font-size: 1.2rem;
          font-weight: 600;
          color: #e0e0e0;
          margin-top: 1.75rem;
          margin-bottom: 0.5rem;
          padding-bottom: 0.4rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .policy-content p {
          font-size: 0.95rem;
          line-height: 1.75;
          color: #b0b0b0;
          margin-bottom: 0.75rem;
        }
        .policy-content strong {
          color: #d4d4d4;
          font-weight: 600;
        }
        .policy-content a {
          color: var(--theme_13_samecolour, #6d9eeb);
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .policy-content a:hover {
          color: #93b8f0;
        }
        .policy-content ul,
        .policy-content ol {
          padding-left: 1.5rem;
          margin-bottom: 1rem;
          color: #b0b0b0;
        }
        .policy-content li {
          margin-bottom: 0.4rem;
          line-height: 1.65;
        }
      `}</style>
    </div>
  );
}

