import type { TizenTVInputDevice } from "../types";
import { TIZEN_OPTIONAL_KEY_NAMES } from "./tizenKeys";

let consumers = 0;
let activeDevice: TizenTVInputDevice | undefined;

function registerIndividually(device: TizenTVInputDevice): void {
  for (const keyName of TIZEN_OPTIONAL_KEY_NAMES) {
    try {
      device.registerKey(keyName);
    } catch (error) {
      console.warn(`[Tizen] Could not register remote key ${keyName}`, error);
    }
  }
}

export function registerTizenKeys(
  device = typeof window !== "undefined" ? window.tizen?.tvinputdevice : undefined,
): () => void {
  if (!device) return () => undefined;

  consumers += 1;
  if (consumers === 1) {
    activeDevice = device;
    if (device.registerKeyBatch) {
      try {
        device.registerKeyBatch(
          [...TIZEN_OPTIONAL_KEY_NAMES],
          undefined,
          () => registerIndividually(device),
        );
      } catch {
        registerIndividually(device);
      }
    } else {
      registerIndividually(device);
    }
  }

  let cleanedUp = false;
  return () => {
    if (cleanedUp) return;
    cleanedUp = true;
    consumers = Math.max(0, consumers - 1);
    if (consumers !== 0 || !activeDevice) return;

    const deviceToClean = activeDevice;
    activeDevice = undefined;
    if (deviceToClean.unregisterKeyBatch) {
      try {
        deviceToClean.unregisterKeyBatch([...TIZEN_OPTIONAL_KEY_NAMES]);
        return;
      } catch {
        // Fall through to the per-key API.
      }
    }
    for (const keyName of TIZEN_OPTIONAL_KEY_NAMES) {
      try {
        deviceToClean.unregisterKey?.(keyName);
      } catch {
        // A key unsupported by this TV may never have been registered.
      }
    }
  };
}
