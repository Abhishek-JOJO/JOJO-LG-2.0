"use client";

// NOTE: This component renders outside NextIntlClientProvider (in RootLayout),
// so useTranslations cannot be used here. Strings are kept inline intentionally.
export function NoInternet() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-theme_12 text-theme_1 text-center px-6">
      <span className="text-5xl mb-4" aria-hidden="true">📡</span>
      <h1 className="text-2xl font-semibold mb-2">No Internet Connection</h1>
      <p className="text-sm text-theme_5">Please check your network and try again</p>
    </div>
  );
}
