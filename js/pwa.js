// ============================================================
// PWA: registro de Service Worker + prompt de instalação
// ============================================================

function detectIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export const pwa = {
  deferredPrompt: null,
  installed: false,
  onChange: null,
  isIOS: detectIOS(),
  isInstallable() { return !!this.deferredPrompt; },
  isInstalled() {
    return this.installed
      || window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
  },
  canShowInstall() {
    if (this.isInstalled()) return false;
    return this.isInstallable() || this.isIOS;
  },
  wasDismissed() {
    const t = Number(localStorage.getItem('pwa_install_dismissed_at') || 0);
    return t && (Date.now() - t) < 7 * 24 * 60 * 60 * 1000;
  },
  dismiss() {
    localStorage.setItem('pwa_install_dismissed_at', String(Date.now()));
    this.onChange?.();
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
