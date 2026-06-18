"use client";

import { useEffect } from "react";

/** Registers the service worker so the app is installable and can receive push. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration can fail on unsupported browsers — safe to ignore.
      });
    }
  }, []);
  return null;
}
