// Firebase Cloud Messaging service worker.
// Config is passed via the query string the registration uses (SW can't read import.meta.env).
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp(Object.fromEntries(new URL(self.location).searchParams));
const messaging = firebase.messaging();

// Shown when the app is closed or in the background.
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "Hello Aisha";
  const body = payload.notification?.body || "";
  const path = payload.data?.path || "/chats";
  self.registration.showNotification(title, {
    body,
    icon: "/favicon.png",
    badge: "/favicon.png",
    tag: path,
    renotify: true,
    data: { path },
  });
});

// Open (or focus) the right screen when the notification is tapped.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = event.notification.data?.path || "/chats";
  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clientList) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) await client.navigate(path);
          return;
        }
      }
      await self.clients.openWindow(path);
    })(),
  );
});
