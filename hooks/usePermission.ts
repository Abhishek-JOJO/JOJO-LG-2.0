"use client";

import { ErrorMessage, PermissionStatus } from "@/enums/ui.enum";
import {
  getPermissionStatus,
  PermissionType,
  requestCameraPermission,
  requestLocationPermission,
  requestMicrophonePermission,
} from "@lib/permissions/permissionManager";
import { useEffect, useState } from "react";

export function usePermission(type: PermissionType) {
  const [status, setStatus] = useState<PermissionState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = async () => {
    const res = await getPermissionStatus(type);
    setStatus(res);
  };

  const request = async () => {
    if (loading) return false;

    setLoading(true);
    setError(null);

    let result = false;

    try {
      // CAMERA
      if (type === PermissionType.CAMERA) {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setError(ErrorMessage.FEATURE_NOT_SUPPORTED_ON_DEVICE);
          setStatus(null);
          return false;
        }

        result = await requestCameraPermission();
        setStatus(result ? PermissionStatus.GRANTED : PermissionStatus.DENIED);
      }

      // GEOLOCATION
      if (type === PermissionType.GEOLOCATION) {
        if (!navigator.geolocation) {
          setError(ErrorMessage.FEATURE_NOT_SUPPORTED_ON_DEVICE);
          setStatus(null);
          return false;
        }

        await requestLocationPermission();
        await check();

        const currentStatus = await getPermissionStatus(PermissionType.GEOLOCATION);

        const isGranted = currentStatus === PermissionStatus.GRANTED;

        setError(isGranted ? null : ErrorMessage.PERMISSION_DENIED_ENABLE_IN_BROWSER);

        return isGranted;
      }

      // MICROPHONE
      if (type === PermissionType.MICROPHONE) {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setError(ErrorMessage.FEATURE_NOT_SUPPORTED_ON_DEVICE);
          setStatus(null);
          return false;
        }

        result = await requestMicrophonePermission();
        setStatus(result ? PermissionStatus.GRANTED : PermissionStatus.DENIED);
      }

      // ✅ CONSISTENT ERROR HANDLING FOR ALL
      if (result) {
        setError(null);
      } else {
        setError(ErrorMessage.PERMISSION_DENIED_ENABLE_IN_BROWSER);
      }

      return result;
    } catch (err) {
      setError(ErrorMessage.FAILED_TO_REQUEST_PERMISSION);
      setStatus(null);
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only geolocation supports Permissions API reliably
    if (type === PermissionType.GEOLOCATION) {
      check();
    }
  }, []);

  return { status, check, request, loading, error };
}