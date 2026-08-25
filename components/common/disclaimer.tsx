import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";
import { DisclaimerOptions } from "@/types/global.types";

const linkStyle = { color: "var(--theme_13_samecolour)" };
const linkClass = "hover:underline";

export function buildDisclaimer({ disclaimerFirst, disclaimerSecound, supportEmail }: DisclaimerOptions) {
  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-sm text-theme_7 leading-[1.6]">
        {disclaimerFirst({
          email: (chunks) => (
            <Link href={`mailto:${supportEmail}`} style={linkStyle} className={linkClass}>
              {chunks}
            </Link>
          ),
        })}
      </p>
      <p className="m-0 text-sm text-theme_7 leading-[1.6]">
        {disclaimerSecound({
          conditions: (chunks) => (
            <Link href={ROUTES.TERMS} style={linkStyle} className={linkClass}>
              {chunks}
            </Link>
          ),
          privacy: (chunks) => (
            <Link href={ROUTES.PRIVACY} style={linkStyle} className={linkClass}>
              {chunks}
            </Link>
          ),
        })}
      </p>
    </div>
  );
}
