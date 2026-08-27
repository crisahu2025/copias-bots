// ============================================================
// PWA HANDLER — COPIAS BOTS
// ============================================================

let deferredPrompt = null;

// 1. Registro del Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => {
        console.log('[PWA] Service Worker registrado con éxito:', reg.scope);
        reg.update(); // Forzar chequeo de nueva versión

        // Detectar si hay una actualización disponible
        reg.onupdatefound = () => {
          const installingWorker = reg.installing;
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              mostrarToastPwa('🔄 Versión actualizada.');
            }
          };
        };
      })
      .catch((err) => {
        console.warn('[PWA] Error al registrar Service Worker:', err);
      });
  });
}

// 2. Detección de instalación y evento 'beforeinstallprompt'
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevenir que el navegador muestre su diálogo genérico por defecto
  e.preventDefault();
  deferredPrompt = e;
  
  // Mostrar el banner de instalación si no estamos en modo standalone
  mostrarBannerInstalacion();
});

// 3. Cuando la app ya fue instalada
window.addEventListener('appinstalled', () => {
  console.log('[PWA] ¡Copias Bots instalada con éxito!');
  deferredPrompt = null;
  ocultarBannerInstalacion();
  mostrarToastPwa('🎉 ¡Copias Bots instalada en tu teléfono!');
});

// 4. Detectar si ya corre como app instalada (Standalone)
function esAppInstalada() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

document.addEventListener('DOMContentLoaded', () => {
  if (esAppInstalada()) {
    document.body.classList.add('is-standalone-app');
    console.log('[PWA] Ejecutando en modo App Standalone');
  }
  crearElementosPwaUI();
});

// 5. Interfaz UI para la Instalación
function crearElementosPwaUI() {
  if (esAppInstalada() || document.getElementById('pwa-install-banner')) return;

  // Banner inferior para instalar la App
  const banner = document.createElement('div');
  banner.id = 'pwa-install-banner';
  banner.className = 'pwa-banner';
  banner.innerHTML = `
    <div class="pwa-banner-content">
      <img src="icons/icon-192.png" alt="Copias Bots Icon" class="pwa-banner-icon" />
      <div class="pwa-banner-text">
        <strong>Instalá Copias Bots</strong>
        <span>Accedé más rápido a tus presupuestos y pedidos</span>
      </div>
      <div class="pwa-banner-actions">
        <button class="btn-pwa-install" onclick="instalarPwa()">📲 Instalar</button>
        <button class="btn-pwa-close" onclick="ocultarBannerInstalacion()" aria-label="Cerrar">✕</button>
      </div>
    </div>
  `;
  document.body.appendChild(banner);
}

function mostrarBannerInstalacion() {
  const banner = document.getElementById('pwa-install-banner');
  if (banner && deferredPrompt && !esAppInstalada()) {
    // Si el usuario no la cerró recientemente
    const dismissed = sessionStorage.getItem('pwa_banner_dismissed');
    if (!dismissed) {
      setTimeout(() => {
        banner.classList.add('visible');
      }, 1500);
    }
  }
}

function ocultarBannerInstalacion() {
  const banner = document.getElementById('pwa-install-banner');
  if (banner) {
    banner.classList.remove('visible');
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
  }
}

// Acción al presionar el botón de Instalar
async function instalarPwa() {
  if (!deferredPrompt) {
    alert('Para instalar en iPhone/Safari: tocá el botón Compartir ⬆️ y luego "Agregar al inicio ➕".');
    return;
  }
  
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`[PWA] Respuesta del usuario: ${outcome}`);
  
  if (outcome === 'accepted') {
    ocultarBannerInstalacion();
  }
  deferredPrompt = null;
}

// 6. Mensajes Toast flotantes
function mostrarToastPwa(mensaje) {
  let toast = document.getElementById('pwa-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'pwa-toast';
    toast.className = 'pwa-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = mensaje;
  toast.classList.add('visible');
  setTimeout(() => {
    toast.classList.remove('visible');
  }, 4000);
}

// 7. Alertas de conexión Online/Offline
window.addEventListener('offline', () => {
  mostrarToastPwa('📡 Sin conexión a internet. Mostrando contenido guardado.');
});

window.addEventListener('online', () => {
  mostrarToastPwa('✅ Conexión restablecida.');
});
