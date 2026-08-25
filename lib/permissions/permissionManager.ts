import { logger } from "@/lib/logger/logger";

export enum PermissionType {
  CAMERA = "camera",
  MICROPHONE = "microphone",
  GEOLOCATION = "geolocation",
  NOTIFICATIONS = "notifications"
}

export async function getPermissionStatus(type: PermissionType): Promise<PermissionState | null> {
  if (typeof navigator === "undefined" || !navigator.permissions) return null;

  // Camera and microphone permissions are not reliably supported in all browsers
  if (type === PermissionType.CAMERA || type === PermissionType.MICROPHONE) {
    return null;
  }

  try {
    return (await navigator.permissions.query({
      name: type as PermissionName,
    })).state;
  } catch {
    return null;
  }
}

let locationRequestInProgress = false;

export async function requestLocationPermission(): Promise<{ success: boolean; latitude?: number; longitude?: number }> {
  // Prevent duplicate calls
  if (locationRequestInProgress) {
    logger.warn('[Permissions] Location request already in progress, skipping duplicate call');
    return { success: false };
  }

  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve({ success: false });

    locationRequestInProgress = true;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        logger.info('[Permissions] Location Permission Granted', { latitude, longitude });

        locationRequestInProgress = false;
        resolve({ success: true, latitude, longitude });
      },
      () => {
        locationRequestInProgress = false;
        resolve({ success: false });
      }
    );
  });
}

export async function requestCameraPermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });

    // Immediately stop tracks (permission check only)
    stream.getTracks().forEach((track) => track.stop());

    return true;
  } catch {
    return false;
  }
}

export async function requestMicrophonePermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Stop immediately (permission check only)
    stream.getTracks().forEach((track) => track.stop());

    return true;
  } catch {
    return false;
  }
}
