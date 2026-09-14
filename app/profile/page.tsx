"use client";

import ProfilePart from "@/app/account-settings/profile-part";

// Profile switching/management used to live behind the "Profile" tab on
// /account-settings; that page is now a single flat view (no tabs), so this
// gets its own route instead. ProfilePart itself is unchanged.
export default function ProfilePage() {
  return (
    <main className="min-h-screen" style={{ background: "var(--theme_12)" }}>
      <div className="w-full px-4 sm:px-6 lg:px-14 pt-20 sm:pt-28 lg:pt-32 pb-16 max-w-[1600px] mx-auto">
        <ProfilePart />
      </div>
    </main>
  );
}
