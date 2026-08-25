import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export default getRequestConfig(async () => {
  // Read locale from cookies on the server
  const cookieStore = await cookies();
  const storedLocale = cookieStore.get("jojo_locale")?.value || "en";
  
  // Validate locale (fallback to 'en')
  const locale = storedLocale === "gu" ? "gu" : "en";

  return {
    locale,
    timeZone: "Asia/Kolkata",
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
