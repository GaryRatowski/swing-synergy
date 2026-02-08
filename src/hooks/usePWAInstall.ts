import { useState, useEffect, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const INSTALL_DISMISSED_KEY = "pwaInstallDismissed";
const VISIT_COUNT_KEY = "pwaVisitCount";
const MIN_VISITS_FOR_PROMPT = 2;

export const usePWAInstall = () => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // Check if already installed
  useEffect(() => {
    // Check if running as PWA
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    setIsInstalled(isStandalone);

    if (isStandalone) return;

    // Track visits
    const visitCount = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || "0", 10);
    localStorage.setItem(VISIT_COUNT_KEY, String(visitCount + 1));

    // Check if dismissed
    const isDismissed = localStorage.getItem(INSTALL_DISMISSED_KEY) === "true";

    // Show banner after min visits and not dismissed
    if (visitCount + 1 >= MIN_VISITS_FOR_PROMPT && !isDismissed) {
      setShowInstallBanner(true);
    }
  }, []);

  // Listen for install prompt
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setShowInstallBanner(false);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!installPrompt) return false;

    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      
      if (outcome === "accepted") {
        setIsInstalled(true);
        setShowInstallBanner(false);
      }
      
      setInstallPrompt(null);
      return outcome === "accepted";
    } catch (error) {
      console.error("Install prompt error:", error);
      return false;
    }
  }, [installPrompt]);

  const dismissBanner = useCallback(() => {
    localStorage.setItem(INSTALL_DISMISSED_KEY, "true");
    setShowInstallBanner(false);
  }, []);

  const resetDismissal = useCallback(() => {
    localStorage.removeItem(INSTALL_DISMISSED_KEY);
  }, []);

  return {
    isInstallable,
    isInstalled,
    showInstallBanner,
    promptInstall,
    dismissBanner,
    resetDismissal,
  };
};
