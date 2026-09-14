"use client";

import TvLoginPart from "@/app/account-settings/tv-login-part";

// TV Login pairing used to live behind the "TV Login" tab on
// /account-settings; that page is now a single flat view (no tabs), so this
// gets its own route instead. TvLoginPart itself is unchanged.
export default function TvLoginPage() {
  return (
    <main className="min-h-screen" style={{ background: "var(--theme_12)" }}>
      <div className="w-full px-4 sm:px-6 lg:px-14 pt-20 sm:pt-28 lg:pt-32 pb-16 max-w-[1600px] mx-auto">
        <TvLoginPart />
      </div>
    </main>
  );
}
