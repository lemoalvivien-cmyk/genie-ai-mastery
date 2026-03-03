import { useState, useEffect, useCallback } from "react";

export type CookieConsent = {
  necessary: true;
  preferences: boolean;
  analytics: boolean;
  marketing: boolean;
  ts: number;
};

const STORAGE_KEY = "genie_cookie_consent";
const CONSENT_DURATION_MS = 6 * 30 * 24 * 60 * 60 * 1000; // ~6 months

function readConsent(): CookieConsent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsent;
    // Check expiry
    if (Date.now() - parsed.ts > CONSENT_DURATION_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function useCookieConsent() {
  const [consent, setConsentState] = useState<CookieConsent | null>(null);
  const [bannerOpen, setBannerOpen] = useState(false);

  useEffect(() => {
    const stored = readConsent();
    setConsentState(stored);
    if (!stored) setBannerOpen(true);
  }, []);

  const saveConsent = useCallback((c: Omit<CookieConsent, "necessary" | "ts">) => {
    const full: CookieConsent = {
      necessary: true,
      preferences: c.preferences,
      analytics: c.analytics,
      marketing: c.marketing,
      ts: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
    setConsentState(full);
    setBannerOpen(false);
  }, []);

  const acceptAll = useCallback(() => {
    saveConsent({ preferences: true, analytics: true, marketing: true });
  }, [saveConsent]);

  const rejectAll = useCallback(() => {
    saveConsent({ preferences: false, analytics: false, marketing: false });
  }, [saveConsent]);

  const openBanner = useCallback(() => setBannerOpen(true), []);
  const closeBanner = useCallback(() => setBannerOpen(false), []);

  return {
    consent,
    bannerOpen,
    openBanner,
    closeBanner,
    saveConsent,
    acceptAll,
    rejectAll,
    hasConsented: consent !== null,
    analyticsEnabled: consent?.analytics === true,
    marketingEnabled: consent?.marketing === true,
    preferencesEnabled: consent?.preferences === true,
  };
}
