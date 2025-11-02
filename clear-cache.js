// Clear service worker cache script
console.log('🧹 Clearing service worker cache...');

if ('serviceWorker' in navigator) {
  // Unregister current service worker
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      console.log('Unregistering service worker:', registration.scope);
      registration.unregister();
    });
  });
  
  // Clear all caches
  if ('caches' in window) {
    caches.keys().then(cacheNames => {
      cacheNames.forEach(cacheName => {
        console.log('Deleting cache:', cacheName);
        caches.delete(cacheName);
      });
    });
  }
  
  // Reload page after clearing
  setTimeout(() => {
    console.log('🔄 Reloading page...');
    window.location.reload();
  }, 1000);
} else {
  console.log('Service worker not supported');
}
