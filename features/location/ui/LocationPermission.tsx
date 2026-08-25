"use client";

import { PermissionType } from "@/lib/permissions/permissionManager";
import { PermissionPrompt } from "@components/common/PermissionPrompt";
import { usePermission } from "@hooks/usePermission";

export function LocationPermission() {
  const { request, status, loading, error } = usePermission(PermissionType.GEOLOCATION);

  return (
    <PermissionPrompt
      title="Use your location"
      description="We use your location to show nearby content and personalized recommendations."
      onAllow={request}
      loading={loading}
      error={error}
      status={status}
    />
  );
}
