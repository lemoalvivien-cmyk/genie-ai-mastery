import { useCallback } from "react";

const DEVICE_ID_KEY = "genie_ia_device_id";

function generateDeviceId(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function useDeviceTracker() {
  const getDeviceId = useCallback((): string => {
    try {
      let id = localStorage.getItem(DEVICE_ID_KEY);
      if (!id) {
        id = generateDeviceId();
        localStorage.setItem(DEVICE_ID_KEY, id);
      }
      return id;
    } catch {
      return generateDeviceId();
    }
  }, []);

  return { getDeviceId };
}
