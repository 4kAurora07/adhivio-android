import { createRoot } from "react-dom/client";
import { LocalNotifications } from "@capacitor/local-notifications";
import App from "./App.tsx";
import "./index.css";

// ─── Global error guard ────────────────────────────────────────────────────
window.addEventListener("unhandledrejection", (event) => {
  event.preventDefault();
  console.warn("Unhandled promise rejection:", event.reason);
});

// ─── Notification channel bootstrap ───────────────────────────────────────
//
// MUST run before any LocalNotifications.schedule() call.
// Android 8+ (API 26+) requires a channel to exist for notifications to show.
//
// ⚠️  SOUND NOTE:
//    Android locks a channel's sound after the user first receives a notification
//    on it. Changing `sound` here only takes effect on a FRESH INSTALL or after
//    the user clears app data. The file referenced here MUST exist in
//    android/app/src/main/res/raw/ (without extension).
//
// ⚠️  CUSTOM SOUNDS (base64 / user-uploaded):
//    Android system notifications CANNOT play arbitrary audio data. Custom
//    sounds can ONLY be played when the app is in the FOREGROUND — the
//    localNotificationReceived listener in useNotifications handles that.
//    Background / killed-app notifications always play reminder_sound.mp3.
//
async function initNotificationChannel(): Promise<void> {
  try {
    await LocalNotifications.createChannel({
      id: "reminder_channel",    // matches channelId in useNotifications.ts
      name: "Reminders",
      description: "Adhivio reminder alerts",
      importance: 5,             // IMPORTANCE_HIGH → heads-up banner + sound
      visibility: 1,             // VISIBILITY_PUBLIC → shown on lock screen
      sound: "reminder_sound",   // ← NO extension. File: res/raw/reminder_sound.mp3
      vibration: true,
      lights: true,
    });
    console.debug("[Notifications] Channel created: reminder_channel");

    await LocalNotifications.createChannel({
      id: "silent_reminder_channel",
      name: "Silent Reminders",
      description: "Adhivio reminders with custom background sounds",
      importance: 5,             // IMPORTANCE_HIGH → heads-up banner
      visibility: 1,
      sound: undefined,          // silent channel
      vibration: false,          // disable system vibration
      lights: true,
    });
    console.debug("[Notifications] Channel created: silent_reminder_channel");
  } catch (err) {
    // Non-fatal — the app still works; notifications may use Android default sound
    console.warn("[Notifications] createChannel failed (may already exist):", err);
  }
}

// Boot the channel first, THEN mount React
initNotificationChannel().finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});