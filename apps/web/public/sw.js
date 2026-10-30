// Service worker for Web Push. Plain JS, served as-is from /sw.js (not bundled).
// Payload shape: PushPayload in apps/api/src/notifications/push.service.ts.

self.addEventListener('push', (event) => {
  let data;
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Events', {
      body: data.body || '',
      tag: data.tag,
      data: { url: data.url || '/' },
    }),
  );
});

// Focus an open tab of the app (navigating it), or open a new one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const existing = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (existing) {
        await existing.focus();
        return existing.navigate(url);
      }
      return self.clients.openWindow(url);
    })(),
  );
});
