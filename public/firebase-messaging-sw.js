importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp(Object.fromEntries(new URL(self.location).searchParams));
firebase.messaging();

self.addEventListener('push', (event) => {
  if (!event.data) return;
  const payload = event.data.json();
  const notification = payload.notification || {};
  const options = {
    body: notification.body || '',
    icon: notification.icon || notification.image,
    badge: notification.badge || notification.icon,
    image: notification.image,
    data: payload.data || {},
  };
  event.waitUntil(self.registration.showNotification(notification.title || 'Venda Aprovada!', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const path = event.notification?.data?.path || event.notification?.data?.FCM_MSG?.data?.path || '/';
  event.waitUntil(clients.openWindow(path));
});