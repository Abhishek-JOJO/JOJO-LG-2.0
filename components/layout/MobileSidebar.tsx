import React from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { ROUTES } from "@/lib/constants/routes";

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isGold: boolean;
  visibleNavItems: any[];
  pathname: string;
}

export function MobileSidebar({ isOpen, onClose, isGold, visibleNavItems, pathname }: MobileSidebarProps) {
  const tNav = useTranslations("Navbar");

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[65] lg:hidden animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Sidebar Drawer */}
      <div
        className={`fixed top-0 left-0 bottom-0 h-full w-[260px] sm:w-[300px] max-w-[60vw] bg-theme_12 z-[70] lg:hidden border-r border-theme_1/10 p-6 flex flex-col gap-6 shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-theme_1/5 pb-4">
          <span className="text-sm font-bold text-theme_5 tracking-wider">{tNav("menu")}</span>
          <div
            onClick={onClose}
            className="text-theme_1/60 hover:text-theme_1 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </div>
        </div>

        {!isGold && (
          <div className="flex justify-center border-b border-theme_1/5 pb-4 sm:hidden">
            <Link
              href={ROUTES.SUBSCRIPTION}
              onClick={onClose}
              className="gold-gradient-outline-button w-full h-9 px-4 cursor-pointer flex items-center justify-center whitespace-nowrap text-sm font-semibold"
            >
              {tNav("upgrade_to_gold")}
            </Link>
          </div>
        )}

        <div className="flex flex-col gap-2 text-base font-semibold overflow-y-auto">
          {visibleNavItems.length === 0 ? (
            <>
              {[...Array(5)].map((_, i) => (
                <div key={`nav-skele-${i}`} className="h-12 border-b border-theme_1/5 flex items-center">
                  <div className="h-5 bg-theme_1/10 rounded animate-pulse" style={{ width: `${60 + (i % 3) * 20}px` }} />
                </div>
              ))}
            </>
          ) : (
            visibleNavItems.map((item) => {
              const displayTitle = item?.title;
              const targetUrl = item?.url === ROUTES.HOMEPAGE ? ROUTES.HOME : item.url;
              const isItemActive = pathname === targetUrl;

              return (
                <Link
                  key={item?.title}
                  href={targetUrl}
                  onClick={onClose}
                  className="py-3.5 border-b border-theme_1/5 block cursor-pointer"
                >
                  <span className={`transition-colors duration-200 hover:text-theme_13_samecolour ${
                    isItemActive ? "text-theme_13_samecolour font-semibold" : "text-theme_1/80"
                  }`}>
                    {displayTitle}
                  </span>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
