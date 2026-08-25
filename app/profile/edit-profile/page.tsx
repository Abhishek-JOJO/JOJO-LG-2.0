"use client";

import { ROUTES } from "@/lib/constants/routes";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import { AVATAR_FLOW_STORAGE_KEYS } from "../avatar-flow-storage";

function EditProfileRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const editProfileId = searchParams.get("editProfileId");

    window.sessionStorage.setItem(AVATAR_FLOW_STORAGE_KEYS.accountSettingsTab, "profile");

    if (editProfileId) {
      window.sessionStorage.setItem(AVATAR_FLOW_STORAGE_KEYS.editProfileId, editProfileId);
    }

    router.replace(ROUTES.ACCOUNT_SETTINGS);
  }, [router, searchParams]);

  return null;
}

export default function EditProfileRedirectPage() {
  return (
    <Suspense>
      <EditProfileRedirectContent />
    </Suspense>
  );
}
