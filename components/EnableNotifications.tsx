"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type Status =
  | "loading"
  | "unsupported"
  | "ios-install"
  | "default"
  | "denied"
  | "subscribed";

export function EnableNotifications() {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true;

      const supported =
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;

      if (!supported) {
        // On iPhone, push only exists once the app is installed to the home screen.
        setStatus(isIos && !standalone ? "ios-install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setStatus(sub ? "subscribed" : "default");
    })().catch(() => setStatus("unsupported"));
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setStatus(perm === "denied" ? "denied" : "default");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
        ),
      });
      const res = await fetch("/api/push", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      if (res.ok) setStatus("subscribed");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus("default");
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading" || status === "unsupported") return null;

  return (
    <div className="card flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 className="font-bold">🔔 Prediction reminders</h3>
        <p className="text-sm text-muted">
          {status === "subscribed"
            ? "On ✓ — we sent a test notification to this device. You'll get a nudge 3h and 1h before each deadline."
            : status === "denied"
              ? "Notifications are blocked. Enable them for this site in your browser settings."
              : status === "ios-install"
                ? "On iPhone: tap Share → Add to Home Screen, open SpotOn from your home screen, then turn on reminders here."
                : "Get a phone reminder before each gameweek locks."}
        </p>
      </div>
      {status === "default" && (
        <button onClick={enable} disabled={busy} className="btn-accent">
          {busy ? "Enabling…" : "Enable reminders"}
        </button>
      )}
      {status === "subscribed" && (
        <button onClick={disable} disabled={busy} className="btn-ghost">
          {busy ? "…" : "Turn off"}
        </button>
      )}
    </div>
  );
}
