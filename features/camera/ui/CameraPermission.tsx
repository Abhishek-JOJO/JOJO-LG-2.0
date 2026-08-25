"use client";

import { PermissionType } from "@/lib/permissions/permissionManager";
import { PermissionPrompt } from "@components/common/PermissionPrompt";
import { usePermission } from "@hooks/usePermission";

export function CameraPermission() {
  const { request, status, loading, error } = usePermission(PermissionType?.CAMERA);

  return (
    <PermissionPrompt
      title="Enable camera"
      description="Camera access is required for video calls and profile photos."
      onAllow={request}
      loading={loading}
      error={error}
      status={status}
    />
  );
}
