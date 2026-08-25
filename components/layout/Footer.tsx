"use client";

import { appConfig } from '@/lib/config/app.config';
import { LOGOS } from '@/lib/constants/assets';
const footerData = require('@/lib/data/footer.data.json');
import { cn, COL1_LABEL_KEY, COL2_LABEL_KEY, STORE_IMAGE_MAP } from '@/lib/utils';
import FacebookIcon from '@/public/svg/FacebookIcon';
import InstagramIcon from '@/public/svg/InstagramIcon';
import LinkdinIcon from '@/public/svg/LinkdinIcon';
import YoutubeIcon from '@/public/svg/YoutubeIcon';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import JOJOCommonImage, { JOJOImagePreset } from '../ui/JOJOCommonImage';

const SOCIAL_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  FACEBOOK_ICON: FacebookIcon,
  INSTAGRAM_ICON: InstagramIcon,
  YOUTUBE_ICON: YoutubeIcon,
  LINKDIN_ICON: LinkdinIcon,
};

export function Footer() {
  const t = useTranslations('footer');

  return (
    <footer
      className="w-full px-4 sm:px-6 lg:px-8 py-5 body-xs-light relative z-10"
      style={{
        color: 'var(--theme_6)',
        lineHeight: '22px',
      }}
    >
      <div
        className="pt-4.5"
        style={{
          borderTop: '1px solid var(--theme_13_samecolour)'
        }}
      >
        {/* Logo — Mobile Only */}
        <div className="mb-6 lg:hidden">
          <JOJOCommonImage
            src={LOGOS.JOJO_LOGO}
            alt="JOJO"
            width={80}
            height={32}
            preset={JOJOImagePreset.Logo}
            wrapperClassName="cursor-pointer"
          />

        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Column 1 */}
          <div className="flex flex-col gap-2 z-1">
            {footerData.columns[0].links.map((link: any) => {
              const label = t(COL1_LABEL_KEY[link.label] ?? link.label as any);
              const content = (
                <span className="hover:text-theme_13_samecolour text-theme_6 transition-colors w-fit body-sm-light">
                  {label}
                </span>
              );

              if (!link.href) {
                return (
                  <span
                    key={link.label}
                    className="opacity-50 cursor-not-allowed pointer-events-none w-fit hover:text-theme_13_samecolour text-theme_6"
                    aria-disabled="true"
                  >
                    {content}
                  </span>
                );
              }

              const isExternal = link.href.startsWith(appConfig.LINK_START_WITH);

              return (
                <Link
                  key={link?.label}
                  href={link?.href}
                  {...(isExternal
                    ? { target: '_blank', rel: 'noopener noreferrer' }
                    : {})}
                >
                  {content}
                </Link>
              );
            })}

            {/* Desktop Logo */}
            <div className="hidden lg:block mt-2">
              <JOJOCommonImage
                src={LOGOS.JOJO_LOGO}
                alt="JOJO"
                width={80}
                height={32}
                preset={JOJOImagePreset.Logo}
                wrapperClassName="cursor-pointer"
              />
              {(process.env.NEXT_PUBLIC_APP_VERSION || process.env.NEXT_PUBLIC_BUILD_TIME) && (
                <div className="flex flex-col gap-0.5 mt-1 text-[10px] text-theme_12 opacity-75 leading-tight font-sans">
                  {process.env.NEXT_PUBLIC_APP_VERSION && (
                    <span>version : {process.env.NEXT_PUBLIC_APP_VERSION}</span>
                  )}
                  {process.env.NEXT_PUBLIC_BUILD_TIME && (
                    <span>build : {process.env.NEXT_PUBLIC_BUILD_TIME}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Column 2 */}
          <div className="flex flex-col gap-2 z-1">
            {footerData.columns[1].links.map((link: any) => {
              const label = t(COL2_LABEL_KEY[link.label] ?? link.label as any);
              const content = (
                <span className="hover:text-theme_13_samecolour text-theme_6 transition-colors w-fit body-sm-light">
                  {label}
                </span>
              );

              if (!link.href) {
                return (
                  <span
                    key={link.label}
                    className="opacity-50 cursor-not-allowed pointer-events-none w-fit"
                    aria-disabled="true"
                  >
                    {content}
                  </span>
                );
              }

              const isExternal = link.href.startsWith('http') || link.href.startsWith('mailto:');

              return (
                <Link
                  key={link.label}
                  href={link.href}
                  {...(isExternal
                    ? { target: '_blank', rel: 'noopener noreferrer' }
                    : {})}
                >
                  {content}
                </Link>
              );
            })}
          </div>

          {/* Column 3 */}
          <div className="flex flex-col gap-3 z-1">
            {/* Social Icons */}
            <div>
              <p className="mb-3 body-sm-light">{t('social_title')}</p>

              <div className="flex items-center gap-3">
                {footerData.social.platforms.map((platform: any) => {
                  const Icon = SOCIAL_ICON_MAP[platform.iconKey];
                  if (!Icon) return null;

                  const wrapper = cn(
                    !platform.href && 'cursor-not-allowed pointer-events-none',
                    'group inline-flex items-center justify-center w-8 h-8 rounded-full bg-theme_1 transition-colors duration-200'
                  );

                  const defaultColorClass = 'hover:bg-theme_13_samecolour cursor-pointer';

                  const content = (
                    <Icon className="w-8 h-8 text-theme_10 group-hover:text-theme_1 transition-colors duration-200" />
                  );

                  if (!platform.href) {
                    return (
                      <div
                        key={platform.id}
                        className={cn(wrapper, defaultColorClass)}
                        aria-disabled="true"
                      >
                        {content}
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={platform.id}
                      href={platform.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(wrapper, defaultColorClass)}
                    >
                      {content}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* App Download Buttons */}
            <div>
              <p className="mb-3 body-sm-light">{t('app_download_title')}</p>

              <div className="flex flex-wrap items-center gap-3">
                {footerData.appDownload.buttons.map((btn: any) => {
                  const content = (
                    <JOJOCommonImage
                      src={STORE_IMAGE_MAP[btn.imageKey]}
                      alt={btn.label}
                      width={105}
                      height={35}
                      preset={JOJOImagePreset.Logo}
                      wrapperClassName={cn(
                        'rounded-none',
                        !btn.href &&
                        'cursor-not-allowed'
                      )}
                    />
                  );

                  if (!btn.href) {
                    return (
                      <div
                        key={btn.id}
                        className="pointer-events-none"
                        aria-disabled="true"
                      >
                        {content}
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={btn.id}
                      href={btn.href}
                      target='_blank'
                      rel="noopener noreferrer"
                    >
                      {content}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Copyright */}
            <p className="mt-auto body-sm-light">
              &copy; {new Date().getFullYear()} {t('copyright')}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
