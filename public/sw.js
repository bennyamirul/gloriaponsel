// Gloria Ponsel Service Worker - Web Push & Background Notifications
const CACHE_NAME = 'gloriaponsel-sw-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Tangani pesan Push dari server saat web sedang ditutup / HP terkunci
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch (err) {
    payload = {
      title: 'Gloria Ponsel',
      body: event.data.text() || 'Ada notifikasi baru.',
      url: '/dashboard',
    };
  }

  const title = payload.title || 'Gloria Ponsel';
  const options = {
    body: payload.body || payload.message || 'Ada notifikasi baru dari sistem Gloria Ponsel.',
    icon: payload.icon || '/logoGP.png',
    badge: payload.badge || '/logoGP.png',
    // Pola getar berulang untuk HP Android agar bergetar jelas
    vibrate: [300, 150, 300, 150, 300, 150, 400],
    tag: payload.tag || ('gloria-pos-' + Date.now()),
    renotify: true,
    requireInteraction: true,
    data: {
      url: payload.url || payload.link || '/dashboard',
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      { action: 'open', title: 'Buka Sekarang' },
      { action: 'close', title: 'Tutup' },
    ],
  };

  // Notifikasi juga dikirimkan ke tab browser aktif (jika ada yang terbuka) untuk membunyikan suara ringtone
  event.waitUntil(
    self.registration.showNotification(title, options).then(() => {
      return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'PUSH_NOTIFICATION_RECEIVED',
            title,
            body: options.body,
            url: options.data.url,
          });
        });
      });
    })
  );
});

// Tangani klik pada notifikasi di layar HP / Desktop
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Jika tab Gloria Ponsel sudah ada yang terbuka, fokuskan dan arahkan ke URL
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Jika belum ada tab terbuka, buka jendela baru
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
