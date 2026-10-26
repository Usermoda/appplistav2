// ============================================================
// PWA: registro de Service Worker + prompt de instalação
// ============================================================

export const pwa = {
  deferredPrompt: null,
  installed: false,
  onChange: null,
  isInstallable() { return !!this.deferredPrompt; },
  isInstalled() {
    return this.installed
      || window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
  },
  async install() {
    if (!this.deferredPrompt) return false;
    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    this.deferredPrompt = null;
    if (outcome === 'accepted') this.installed = true;
    this.onChange?.();
    return outcome === 'accepted';
  }
};

export function registerPwa() {
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch((err) => {
        console.warn('[PWA] falha ao registrar SW:', err);
      });
    });
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    pwa.deferredPrompt = e;
    pwa.onChange?.();
  });

  window.addEventListener('appinstalled', () => {
    pwa.deferredPrompt = null;
    pwa.installed = true;
    pwa.onChange?.();
  });
}
