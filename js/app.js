// ============================================================
// APP.JS — COPIAS BOTS v2 (con Login + Panel Admin)
// ============================================================

// ---- Estado global ----
const state = {
  precios:      null,
  productos:    [], // Para la pestaña de gestión de precios
  tipo:         null,
  color:        null,
  anillado:     null, // null fuerza la seleccion obligatoria
  papel:        'COMUN',
  envio:        'RETIRO',
  calcAnillado: false,
  calcSelection: { tipo: 'DOBLE', color: 'BN' }, // Por defecto Doble Faz B&N
  archivo:      null,
  currentStep:  1,
  adminLoggedIn: false,
};



const ANILLADOS = [
  { hasta: 100, precio: 1500 }, { hasta: 150, precio: 2000 },
  { hasta: 200, precio: 2500 }, { hasta: 250, precio: 3000 },
  { hasta: 300, precio: 3500 }, { hasta: 350, precio: 4000 },
  { hasta: 9999, precio: 4000 },
];

function calcAni(n)    { for (const a of ANILLADOS) if (n <= a.hasta) return a.precio; return 4000; }
function redondeo(n)   { if (!n || isNaN(n)) return 0; return Math.ceil(n / 100) * 100; }
function formatPeso(n) { return '$' + n.toLocaleString('es-AR'); }
async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================================
// INIT
// ============================================================
// Configurar el worker de PDF.js (necesario si se usa la libreria por CDN)
if (window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
}


document.addEventListener('DOMContentLoaded', () => {
  initScrollHeader();
  cargarPrecios();
  actualizarEnlacesContacto();
  crearModalConsultaUI();

  // Limpiar tokens persistentes antiguos en localStorage (la sesión debe ser estrictamente por pestaña en sessionStorage)
  localStorage.removeItem('cb_admin_session');
  localStorage.removeItem('cb_admin_token');

  if (sessionStorage.getItem('cb_admin_session') === 'true') {
    state.adminLoggedIn = true;
    initInactivityTracker();
    if (document.getElementById('adminPanel')) {
      mostrarAdminPanel();
    }
  }
  actualizarNavLoginBtn();

  // Pre-cargar datos si viene de la calculadora a encargar.html
  const urlParams = new URLSearchParams(window.location.search);
  const pHojas = urlParams.get('hojas');
  const pTipo = urlParams.get('tipo');
  const pColor = urlParams.get('color');
  const pAnillado = urlParams.get('anillado');

  if (pHojas && document.getElementById('ord-hojas')) {
    document.getElementById('ord-hojas').value = pHojas;
    const manualGroup = document.getElementById('manualPagesGroup');
    if (manualGroup) manualGroup.style.display = 'block';
  }
  if (pTipo) selectOption('tipo', pTipo, pTipo === 'SIMPLE' ? 'cc-simple' : 'cc-doble');
  if (pColor) selectOption('color', pColor, pColor === 'BN' ? 'cc-bn' : 'cc-color');
  if (pAnillado) {
    if (pAnillado === 'SI' || pAnillado === 'ANILLADO') {
      selectOption('anillado', 'ANILLADO', 'cc-ani-si');
    } else {
      selectOption('anillado', 'NO', 'cc-ani-no');
    }
  }

  // Bloquear que Chrome abra el archivo al arrastrarlo fuera del area
  document.addEventListener('dragover', (e) => e.preventDefault());
  document.addEventListener('drop', (e) => e.preventDefault());

  // Cookie banner
  if (!localStorage.getItem('cb_cookies_accepted')) {
    const banner = document.createElement('div');
    banner.className = 'cookie-banner';
    banner.innerHTML = `
      <p>🍪 Utilizamos cookies para mejorar tu experiencia en nuestro sitio web.</p>
      <button onclick="acceptCookies(this.parentElement)">Aceptar</button>
    `;
    document.body.appendChild(banner);
    setTimeout(() => banner.classList.add('show'), 500);
  }
});

// ============================================================
// CONTROL DE INACTIVIDAD — AUTO-LOGOUT (2 MINUTOS)
// ============================================================
let inactivityTimer = null;
const INACTIVITY_LIMIT_MS = 2 * 60 * 1000; // 2 minutos

function initInactivityTracker() {
  if (sessionStorage.getItem('cb_admin_session') !== 'true') return;

  const resetTimer = () => {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(onInactivityTimeout, INACTIVITY_LIMIT_MS);
  };

  const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'pointerdown'];
  activityEvents.forEach(evt => {
    window.addEventListener(evt, resetTimer, { passive: true });
  });

  resetTimer();
}

function onInactivityTimeout() {
  if (sessionStorage.getItem('cb_admin_session') !== 'true') return;
  sessionStorage.removeItem('cb_admin_session');
  sessionStorage.removeItem('cb_admin_token');
  localStorage.removeItem('cb_admin_session');
  localStorage.removeItem('cb_admin_token');
  state.adminLoggedIn = false;
  state.pedidos = [];
  state.productos = [];
  
  showToast('⏳ Sesión cerrada por inactividad (2 minutos).', 'warning');
  setTimeout(() => {
    window.location.href = 'login.html?expired=1';
  }, 1000);
}

function actualizarNavLoginBtn() {
  const isDashboard = window.location.pathname.includes('dashboard.html');
  const isLogged = sessionStorage.getItem('cb_admin_session') === 'true' || !!state.adminLoggedIn;

  // Acciones en la barra de escritorio
  const navActions = document.querySelector('.nav-actions');
  if (navActions) {
    if (isDashboard) {
      navActions.innerHTML = `<a class="btn-logout-header" href="javascript:void(0)" onclick="doLogout()">🚪 Cerrar Sesión</a>`;
    } else if (isLogged) {
      navActions.innerHTML = `
        <a class="btn-admin-header" href="dashboard.html">📊 Panel Admin</a>
        <a class="btn-logout-header" href="javascript:void(0)" onclick="doLogout()">🚪 Salir</a>
      `;
    } else {
      navActions.innerHTML = `<a class="btn-cta" href="login.html">Iniciar Sesión</a>`;
    }
  }

  // Menú Drawer Móvil
  const navLinks = document.getElementById('navLinks');
  if (navLinks) {
    // Asegurar que NO se inserte ningún li adicional que desconfigure los 4 enlaces de navegación
    const dashLi = document.getElementById('nav-item-dashboard');
    if (dashLi) dashLi.remove();

    let drawerActions = navLinks.querySelector('.nav-drawer-actions');
    if (!drawerActions) {
      drawerActions = document.createElement('div');
      drawerActions.className = 'nav-drawer-actions';
      navLinks.appendChild(drawerActions);
    }

    let btnCtaDrawer = `<a class="btn-drawer-cta" href="login.html" onclick="closeMenuMobile();">🔐 Iniciar Sesión</a>`;
    if (isDashboard) {
      btnCtaDrawer = `<a class="btn-drawer-cta" href="javascript:void(0)" onclick="closeMenuMobile(); doLogout();" style="background:#ef4444;">🚪 Cerrar Sesión</a>`;
    } else if (isLogged) {
      btnCtaDrawer = `
        <a class="btn-drawer-cta" href="dashboard.html" onclick="closeMenuMobile();">📊 Panel Admin</a>
        <a class="btn-drawer-cta" href="javascript:void(0)" onclick="closeMenuMobile(); doLogout();" style="background:#ef4444; margin-top:4px;">🚪 Salir</a>
      `;
    }

    drawerActions.innerHTML = `
      <button class="btn-drawer-msg" onclick="closeMenuMobile(); abrirModalConsulta();">💬 Dejar Consulta</button>
      ${btnCtaDrawer}
    `;

    // Cerrar el drawer al hacer clic en cualquier enlace
    navLinks.querySelectorAll('a').forEach(a => {
      a.removeEventListener('click', closeMenuMobile);
      a.addEventListener('click', closeMenuMobile);
    });
  }
}

function acceptCookies(bannerElement) {
  localStorage.setItem('cb_cookies_accepted', '1');
  bannerElement.classList.remove('show');
  setTimeout(() => bannerElement.remove(), 400);
}

function initScrollHeader() {
  const header = document.getElementById('siteHeader');
  if (!header) return;
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
}

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

function toggleMenu() {
  const links = document.getElementById('navLinks');
  const burger = document.getElementById('hamburger');
  let backdrop = document.getElementById('navBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'navBackdrop';
    backdrop.className = 'nav-backdrop';
    backdrop.onclick = closeMenuMobile;
    document.body.appendChild(backdrop);
  }

  const isOpen = links ? links.classList.contains('open') : false;
  if (isOpen) {
    closeMenuMobile();
  } else {
    if (links) links.classList.add('open');
    if (burger) burger.classList.add('active');
    if (backdrop) backdrop.classList.add('open');
  }
}

function closeMenuMobile() {
  const links = document.getElementById('navLinks');
  const burger = document.getElementById('hamburger');
  const backdrop = document.getElementById('navBackdrop');
  if (links) links.classList.remove('open');
  if (burger) burger.classList.remove('active');
  if (backdrop) backdrop.classList.remove('open');
}
function actualizarEnlacesContacto() {
  const tel = document.getElementById('link-telegram');
  const wa  = document.getElementById('link-whatsapp');
  if (tel) tel.href = `https://t.me/${CONFIG.TELEGRAM_USERNAME}`;
  if (wa)  wa.href  = CONFIG.WHATSAPP_LINK || `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=Buen%20dia%20Copias%20Bots`;
}

// ============================================================
// LOGIN / LOGOUT
// ============================================================
function openLogin() {
  if (state.adminLoggedIn) {
    // Ya está logueado, scroll al panel
    document.getElementById('adminPanel').scrollIntoView({ behavior: 'smooth' });
    return;
  }
  document.getElementById('loginBackdrop').classList.add('open');
  document.getElementById('loginModal').classList.add('open');
  setTimeout(() => document.getElementById('login-email').focus(), 300);
}

function closeLogin() {
  document.getElementById('loginBackdrop').classList.remove('open');
  document.getElementById('loginModal').classList.remove('open');
}

function togglePass() {
  const inp = document.getElementById('login-pass');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

function getAdminToken() {
  return sessionStorage.getItem('cb_admin_token') || '';
}

function isAdminLoggedIn() {
  return sessionStorage.getItem('cb_admin_session') === 'true' || !!state.adminLoggedIn;
}

async function doLogin() {
  const email    = document.getElementById('login-email').value.trim().toLowerCase();
  const pass     = document.getElementById('login-pass').value;
  const errEl    = document.getElementById('loginError');
  const btnLogin = document.getElementById('btn-do-login');

  errEl.textContent = '';
  if (!email || !pass) { errEl.textContent = '⚠️ Completá email y contraseña.'; return; }

  btnLogin.textContent = 'Verificando...';
  btnLogin.disabled    = true;

  try {
    const hash = await sha256(pass);
    const payload = {
      action: 'loginAdmin',
      email: email,
      hash: hash,
      pass: pass
    };

    const response = await fetch(CONFIG.BACKEND_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const res = await response.json();
    if (res.success) {
      sessionStorage.setItem('cb_admin_session', 'true');
      if (res.token) sessionStorage.setItem('cb_admin_token', res.token);
      localStorage.removeItem('cb_admin_session');
      localStorage.removeItem('cb_admin_token');
      state.adminLoggedIn = true;
      initInactivityTracker();
      actualizarNavLoginBtn();
      closeLogin();
      mostrarAdminPanel();
      cargarPedidos();
      showToast('¡Bienvenido al Panel de Control!', 'success');
    } else {
      errEl.textContent = res.error || '❌ Email o contraseña incorrectos.';
      document.getElementById('login-pass').classList.add('error');
    }
  } catch(e) {
    console.error(e);
    errEl.textContent = '❌ Error de conexión al verificar credenciales.';
  } finally {
    btnLogin.textContent = 'Ingresar al Panel';
    btnLogin.disabled    = false;
  }
}

function doLogout() {
  if (inactivityTimer) clearTimeout(inactivityTimer);
  sessionStorage.removeItem('cb_admin_session');
  sessionStorage.removeItem('cb_admin_token');
  localStorage.removeItem('cb_admin_session');
  localStorage.removeItem('cb_admin_token');
  state.adminLoggedIn = false;
  actualizarNavLoginBtn();
  const panel = document.getElementById('adminPanel');
  if (panel) panel.style.display = 'none';
  showToast('Sesión cerrada. ¡Hasta pronto!', 'info');
  setTimeout(() => window.location.href = 'index.html', 800);
}

const PRODUCTOS_DEFAULT = [
  { codigo: 1, detalle: "SIMPLE B&N", costo: 15, publico: 50 },
  { codigo: 2, detalle: "DOBLE B&N", costo: 15, publico: 40 },
  { codigo: 3, detalle: "SIMPLE COLOR", costo: 60, publico: 200 },
  { codigo: 4, detalle: "DOBLE COLOR", costo: 60, publico: 160 },
  { codigo: 5, detalle: "ANILLADO", costo: 100, publico: 1500 },
  { codigo: 6, detalle: "ABROCHADO", costo: 0, publico: 0 }
];

function switchAdminTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
  if (window.event && window.event.currentTarget) window.event.currentTarget.classList.add('active');
  const tabEl = document.getElementById('tab-' + tabId);
  if (tabEl) tabEl.classList.add('active');

  if (tabId === 'precios') {
    renderPricesAdmin();
  } else if (tabId === 'mensajes') {
    cargarMensajesAdmin();
  }
}

function mostrarAdminPanel() {
  const panel = document.getElementById('adminPanel');
  if (panel) {
    panel.style.display = 'block';
    panel.scrollIntoView({ behavior: 'smooth' });
  }
  cargarPedidos();
  cargarPrecios();
  actualizarBadgeMensajes();
}

// ============================================================
// CARGAR PEDIDOS — Panel Admin (Desde Supabase)
// ============================================================
async function cargarPedidos() {
  const loadingEl = document.getElementById('adminLoading');
  const tableEl   = document.getElementById('ordersTable');
  const emptyEl   = document.getElementById('adminEmpty');

  if (!loadingEl) return; // No estamos en una pagina con panel de pedidos

  loadingEl.style.display = 'flex';
  if (tableEl)  tableEl.style.display  = 'none';
  if (emptyEl)  emptyEl.style.display  = 'none';

  try {
    const adminToken = getAdminToken();
    const url = `${CONFIG.BACKEND_URL}?action=getPedidos&token=${encodeURIComponent(adminToken)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Error HTTP al obtener pedidos");
    
    const pedidos = await response.json();
    
    if (pedidos.error) throw new Error(pedidos.error);

    if (pedidos && pedidos.length > 0) {
      const p_precios = state.precios || CONFIG.PRECIOS_FALLBACK;
      const prodList = state.productos || [];

      const pedidosFormateados = pedidos.map(p => {
        let costoUnitario = 0;
        let hojas = parseInt(p.hojas) || 0;

        // Búsqueda flexible de costo unitario según el producto en la tabla "Lista-de-Precios"
        const findProdCosto = (tKey, cKey) => {
          const item = prodList.find(x => {
            const d = (x.detalle || '').toUpperCase();
            const matchTipo = d.includes(tKey);
            const matchColor = cKey === 'BN' ? (d.includes('B/N') || d.includes('B&N') || d.includes('BN')) : d.includes('COLOR');
            return matchTipo && matchColor;
          });
          return item ? (parseFloat(item.costo) || 0) : 0;
        };

        if (p.tipo === 'SIMPLE' && p.color === 'BN') {
          costoUnitario = findProdCosto('SIMPLE', 'BN') || 21.7;
        } else if (p.tipo === 'DOBLE' && p.color === 'BN') {
          costoUnitario = findProdCosto('DOBLE', 'BN') || 28.3;
        } else if (p.tipo === 'SIMPLE' && p.color === 'COLOR') {
          costoUnitario = findProdCosto('SIMPLE', 'COLOR') || 21.7;
        } else if (p.tipo === 'DOBLE' && p.color === 'COLOR') {
          costoUnitario = findProdCosto('DOBLE', 'COLOR') || 28.3;
        } else {
          costoUnitario = 25;
        }

        let costoHojas = (p.tipo === 'DOBLE') ? costoUnitario * Math.ceil(hojas / 2) : costoUnitario * hojas;
        let aniCosto = 0;
        if (p.anillado === 'ANILLADO') {
          const aniItem = prodList.find(x => (x.detalle || '').toUpperCase().includes('ANILLADO'));
          aniCosto = aniItem ? (parseFloat(aniItem.costo) || 100) : 100;
        } else if (p.anillado === 'ABROCHADO') {
          const abrItem = prodList.find(x => (x.detalle || '').toUpperCase().includes('ABROCHADO'));
          aniCosto = abrItem ? (parseFloat(abrItem.costo) || 0) : 0;
        }

        let costoTotalCalculado = Math.round((costoHojas + aniCosto) * 100) / 100;
        let total = parseFloat(p.precio) || 0;
        let ganancia = Math.round((total - costoTotalCalculado) * 100) / 100;
        let diezmo = Math.round((ganancia * 0.10) * 100) / 100;

        return {
          num: String(p.id || '1'),
          fecha: String(p.fecha || 'Sin fecha'),
          nombre: String(p.nombre || 'Sin nombre'),
          cel: String(p.telefono || ''),
          email: String(p.email || '-'),
          hojas: p.hojas || '-', 
          tipo: p.tipo || '-', 
          color: p.color || '-',
          anillado: p.anillado || '-',
          papel: p.papel || 'COMUN',
          envio: p.envio || 'RETIRO',
          notas: p.detalles || p.notas || '-',
          total: total,
          costo: costoTotalCalculado,
          ganancia: ganancia,
          diezmo: diezmo,
          archivoUrl: p.archivo || '',
          origen: 'WEB'
        };
      });
      if (typeof renderPedidos === 'function') {
        renderPedidos(pedidosFormateados);
      }
    } else {
      if (emptyEl) emptyEl.style.display = 'block';
    }
  } catch(e) {
    if (emptyEl) {
      emptyEl.style.display = 'block';
      emptyEl.innerHTML = `<h3>Error cargando pedidos</h3><p>${e.message}</p><button class="btn-outline" onclick="cargarPedidos()">🔄 Reintentar</button>`;
    }
  } finally {
    if (loadingEl) loadingEl.style.display = 'none';
  }
}
function formatearFechaLimpia(str) {
  if (!str || str === '—' || str === 'Sin fecha') return '—';
  try {
    const s = String(str).trim();
    if (s.includes('T') && s.includes('Z')) {
      const d = new Date(s);
      if (!isNaN(d.getTime())) {
        const dia = String(d.getDate()).padStart(2, '0');
        const mes = String(d.getMonth() + 1).padStart(2, '0');
        const hora = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return `${dia}/${mes} ${hora}:${min}`;
      }
    }
    return s.replace(/:\d\d\.\d+Z/, '').replace('T', ' ');
  } catch(e) { return String(str); }
}

const MESES_NOMBRES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function parsearPeriodoPedido(fechaStr) {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1;

  if (!fechaStr || fechaStr === 'Sin fecha' || fechaStr === '—') {
    return {
      key: `${year}-${String(month).padStart(2, '0')}`,
      label: `${MESES_NOMBRES[month - 1]} ${year}`,
      anio: year,
      mes: month
    };
  }

  const s = String(fechaStr).trim();

  // Si es formato ISO o YYYY-MM-DD
  if (s.match(/^\d{4}-\d{2}/)) {
    const parts = s.split('-');
    year = parseInt(parts[0]);
    month = parseInt(parts[1]);
  } 
  // Si es DD/MM/YYYY o DD/MM
  else if (s.includes('/')) {
    const parts = s.split(' ')[0].split('/');
    if (parts.length >= 2) {
      month = parseInt(parts[1]) || (now.getMonth() + 1);
      if (parts.length >= 3 && parts[2].length >= 4) {
        year = parseInt(parts[2]);
      }
    }
  }

  if (isNaN(month) || month < 1 || month > 12) month = now.getMonth() + 1;
  if (isNaN(year) || year < 2020) year = now.getFullYear();

  const key = `${year}-${String(month).padStart(2, '0')}`;
  return {
    key,
    label: `${MESES_NOMBRES[month - 1]} ${year}`,
    anio: year,
    mes: month
  };
}

function agruparPedidosPorMes(pedidos) {
  const grupos = {};

  pedidos.forEach((p, idx) => {
    const periodo = parsearPeriodoPedido(p.fecha);
    if (!grupos[periodo.key]) {
      grupos[periodo.key] = {
        key: periodo.key,
        label: periodo.label,
        anio: periodo.anio,
        mes: periodo.mes,
        pedidos: [],
        indices: [],
        ingresoBruto: 0,
        costosOperativos: 0,
        gananciaNeta: 0,
        diezmo: 0
      };
    }
    grupos[periodo.key].pedidos.push(p);
    grupos[periodo.key].indices.push(idx);
    grupos[periodo.key].ingresoBruto += (parseInt(p.total) || 0);
    grupos[periodo.key].costosOperativos += (parseFloat(p.costo) || 0);
    grupos[periodo.key].gananciaNeta += (parseFloat(p.ganancia) || 0);
    grupos[periodo.key].diezmo += (parseFloat(p.diezmo) || 0);
  });

  // Asegurar que el mes calendario actual siempre exista
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (!grupos[currentKey]) {
    grupos[currentKey] = {
      key: currentKey,
      label: `${MESES_NOMBRES[now.getMonth()]} ${now.getFullYear()}`,
      anio: now.getFullYear(),
      mes: now.getMonth() + 1,
      pedidos: [],
      indices: [],
      ingresoBruto: 0,
      costosOperativos: 0,
      gananciaNeta: 0,
      diezmo: 0
    };
  }

  return grupos;
}

let activeMonthFilter = null;

function renderPedidos(pedidos) {
  window.allPedidos = pedidos;
  const tbody       = document.getElementById('ordersBody');
  const table       = document.getElementById('ordersTable');
  const statsEl     = document.getElementById('adminStats');
  const selectorEl  = document.getElementById('monthSelectorContainer');
  const historyEl   = document.getElementById('historialMesesContainer');
  const emptyEl     = document.getElementById('adminEmpty');

  if (!tbody || !statsEl) return;
  tbody.innerHTML = '';

  const now = new Date();
  const realCurrentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const grupos = agruparPedidosPorMes(pedidos);
  const keysOrdenadas = Object.keys(grupos).sort().reverse();

  // Si no se eligió un mes, por defecto es el mes en curso
  if (!activeMonthFilter || !grupos[activeMonthFilter]) {
    activeMonthFilter = realCurrentKey;
  }

  const grupoActivo = grupos[activeMonthFilter] || {
    key: activeMonthFilter,
    label: 'Mes Seleccionado',
    pedidos: [],
    indices: [],
    ingresoBruto: 0,
    costosOperativos: 0,
    gananciaNeta: 0,
    diezmo: 0
  };

  const isRealCurrentMonth = (activeMonthFilter === realCurrentKey);

  // 1. Selector de Periodo en la cabecera
  if (selectorEl) {
    let optionsHtml = '';
    keysOrdenadas.forEach(k => {
      const g = grupos[k];
      const isCur = (k === realCurrentKey);
      const isSel = (k === activeMonthFilter);
      optionsHtml += `<option value="${k}" ${isSel ? 'selected' : ''}>${g.label} ${isCur ? '(Mes en curso)' : ''} — ${g.pedidos.length} ped.</option>`;
    });

    selectorEl.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:20px; background:#fff; padding:14px 18px; border-radius:14px; box-shadow:0 4px 14px rgba(0,0,0,0.06); border:1px solid #e2e8f0; width:100%;">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:1.5rem;">📅</span>
          <div>
            <div style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.05em;">Periodo Activo</div>
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <strong style="font-size:16px; color:#0c4a6e;">${grupoActivo.label}</strong>
              ${isRealCurrentMonth ? '<span class="badge" style="background:#e0f2fe; color:#0369a1; font-weight:800; font-size:11px; padding:3px 8px; border-radius:100px;">🟢 MES EN CURSO</span>' : '<span class="badge" style="background:#f1f5f9; color:#475569; font-weight:800; font-size:11px; padding:3px 8px; border-radius:100px;">📁 HISTÓRICO</span>'}
            </div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <label style="font-size:12px; font-weight:700; color:#64748b;">Cambiar mes:</label>
          <select class="price-input" style="padding:7px 12px; font-size:13px; font-weight:700; border-radius:8px; background:#f8fafc; border:1.5px solid #cbd5e1; color:#0c4a6e; cursor:pointer;" onchange="cambiarMesActivo(this.value)">
            ${optionsHtml}
          </select>
        </div>
      </div>
    `;
  }

  // 2. Tarjetas Financieras del Mes Activo
  statsEl.innerHTML = `
    <div class="stat-card">
      <span class="sc-val">${formatPeso(grupoActivo.ingresoBruto)}</span>
      <span class="sc-lbl">Ingreso Bruto (${grupoActivo.label})</span>
    </div>
    <div class="stat-card" style="background:rgba(239, 68, 68, 0.08); border-left-color:#ef4444;">
      <span class="sc-val" style="color:#ef4444;">${formatPeso(grupoActivo.costosOperativos)}</span>
      <span class="sc-lbl">Costos Operativos</span>
    </div>
    <div class="stat-card" style="background:rgba(16, 185, 129, 0.08); border-left-color:#10b981;">
      <span class="sc-val" style="color:#10b981;">${formatPeso(grupoActivo.gananciaNeta)}</span>
      <span class="sc-lbl">Ganancia Neta</span>
    </div>
    <div class="stat-card" style="background:rgba(245, 158, 11, 0.08); border-left-color:#f59e0b;">
      <span class="sc-val" style="color:#f59e0b;">${formatPeso(grupoActivo.diezmo)}</span>
      <span class="sc-lbl">Diezmo (10%)</span>
    </div>
  `;

  // 3. Tabla de Pedidos del Mes Activo
  if (grupoActivo.pedidos.length === 0) {
    if (table) table.style.display = 'none';
    if (emptyEl) {
      emptyEl.style.display = 'block';
      emptyEl.innerHTML = `
        <div style="padding:32px 16px; text-align:center; background:#fff; border-radius:14px; border:1px solid #e2e8f0;">
          <span style="font-size:2.5rem;">✨</span>
          <h3 style="color:#0c4a6e; margin:10px 0 6px;">Comenzando el mes de ${grupoActivo.label}</h3>
          <p style="color:#64748b; font-size:14px; margin:0;">Aún no hay pedidos registrados para este periodo. Los nuevos pedidos aparecerán acá.</p>
        </div>
      `;
    }
  } else {
    if (emptyEl) emptyEl.style.display = 'none';
    grupoActivo.pedidos.forEach((p, localIdx) => {
      const origIdx = grupoActivo.indices[localIdx];
      const isListo = localStorage.getItem('cb_order_status_' + p.num) === 'LISTO';
      const statusBadge = isListo
        ? '<span class="badge-ready">✅ LISTO</span>'
        : '<span class="badge-pending">⏳ PROCESO</span>';

      const celStr = String(p.cel || '');
      const celClean = celStr.replace(/\D/g, '');
      const waLink = celClean ? `https://wa.me/${celClean}?text=Hola%20${encodeURIComponent(p.nombre || '')},%20te%20escribimos%20de%20COPIAS%20BOTS` : '#';
      const fechaLimpia = formatearFechaLimpia(p.fecha);

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>#${p.num || '—'}</strong></td>
        <td style="white-space:nowrap; font-size:12px;">${fechaLimpia}</td>
        <td><strong>${p.nombre || '—'}</strong></td>
        <td>${p.cel ? `<a href="${waLink}" target="_blank" style="color:#0973AD; text-decoration:none; font-weight:700;">💬 ${p.cel}</a>` : '—'}</td>
        <td>Hojas: ${p.hojas} | ${p.tipo}</td>
        <td class="badge-total">${formatPeso(parseInt(p.total) || 0)}</td>
        <td id="status-cell-${p.num}">${statusBadge}</td>
        <td style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
          <button class="btn-primary" style="padding:5px 10px; font-size:12px; cursor:pointer;" onclick="abrirModalDetalle(${origIdx})">📋 Ver</button>
          <button class="btn-outline" style="padding:5px 10px; font-size:12px; cursor:pointer;" onclick="generarPDFDesdePedido(${origIdx})">📄 Recibo</button>
          ${p.archivoUrl && p.archivoUrl !== 'Sin archivo' ? `<a href="${p.archivoUrl}" target="_blank" class="btn-outline" style="padding:5px 10px; font-size:12px; text-decoration:none;">📁 Drive</a>` : ''}
        </td>
      `;
      tbody.appendChild(tr);
    });
    if (table) table.style.display = 'table';
  }

  // 4. Sección de Historial de Meses Anteriores (Acordeones hacia abajo)
  if (historyEl) {
    const mesesAnterioresKeys = keysOrdenadas.filter(k => k !== activeMonthFilter);

    if (mesesAnterioresKeys.length === 0) {
      historyEl.style.display = 'none';
    } else {
      historyEl.style.display = 'block';
      let historyHtml = `
        <div class="history-section-title">
          <span>📜</span>
          <span>Historial de Meses Anteriores (${mesesAnterioresKeys.length})</span>
        </div>
      `;

      mesesAnterioresKeys.forEach(k => {
        const m = grupos[k];
        let rowsHtml = '';
        m.pedidos.forEach((p, localIdx) => {
          const origIdx = m.indices[localIdx];
          const isListo = localStorage.getItem('cb_order_status_' + p.num) === 'LISTO';
          const statusBadge = isListo ? '<span class="badge-ready">✅ LISTO</span>' : '<span class="badge-pending">⏳ PROCESO</span>';
          const fechaLimpia = formatearFechaLimpia(p.fecha);
          const celClean = String(p.cel || '').replace(/\D/g, '');
          const waLink = celClean ? `https://wa.me/${celClean}?text=Hola%20${encodeURIComponent(p.nombre || '')}` : '#';

          rowsHtml += `
            <tr>
              <td><strong>#${p.num || '—'}</strong></td>
              <td style="white-space:nowrap; font-size:12px;">${fechaLimpia}</td>
              <td><strong>${p.nombre || '—'}</strong></td>
              <td>${p.cel ? `<a href="${waLink}" target="_blank" style="color:#0973AD; text-decoration:none; font-weight:700;">💬 ${p.cel}</a>` : '—'}</td>
              <td>Hojas: ${p.hojas} | ${p.tipo}</td>
              <td class="badge-total">${formatPeso(parseInt(p.total) || 0)}</td>
              <td>${statusBadge}</td>
              <td style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
                <button class="btn-primary" style="padding:4px 8px; font-size:11px; cursor:pointer;" onclick="abrirModalDetalle(${origIdx})">📋 Ver</button>
                <button class="btn-outline" style="padding:4px 8px; font-size:11px; cursor:pointer;" onclick="generarPDFDesdePedido(${origIdx})">📄 Recibo</button>
                ${p.archivoUrl && p.archivoUrl !== 'Sin archivo' ? `<a href="${p.archivoUrl}" target="_blank" class="btn-outline" style="padding:4px 8px; font-size:11px; text-decoration:none;">📁 Drive</a>` : ''}
              </td>
            </tr>
          `;
        });

        historyHtml += `
          <div class="history-month-card">
            <div class="hm-header" onclick="toggleMesHistorial('${k}')">
              <div class="hm-header-left">
                <span class="hm-icon">📁</span>
                <div>
                  <strong>${m.label}</strong>
                  <small>${m.pedidos.length} pedido(s) registrado(s)</small>
                </div>
              </div>
              <div class="hm-header-right">
                <div class="hm-badge-item">
                  <span>Ingreso:</span>
                  <strong>${formatPeso(m.ingresoBruto)}</strong>
                </div>
                <div class="hm-badge-item win">
                  <span>Ganancia:</span>
                  <strong>${formatPeso(m.gananciaNeta)}</strong>
                </div>
                <div class="hm-badge-item diezmo">
                  <span>Diezmo:</span>
                  <strong>${formatPeso(m.diezmo)}</strong>
                </div>
                <span class="hm-arrow" id="hm-arrow-${k}">▼</span>
              </div>
            </div>
            <div class="hm-body" id="hm-body-${k}" style="display:none;">
              <div class="hm-stats-grid">
                <div class="stat-card" style="padding:10px 14px;">
                  <span class="sc-val" style="font-size:1.2rem;">${formatPeso(m.ingresoBruto)}</span>
                  <span class="sc-lbl" style="font-size:10px;">Ingreso Total</span>
                </div>
                <div class="stat-card" style="padding:10px 14px; background:rgba(239,68,68,0.08); border-left-color:#ef4444;">
                  <span class="sc-val" style="color:#ef4444; font-size:1.2rem;">${formatPeso(m.costosOperativos)}</span>
                  <span class="sc-lbl" style="font-size:10px;">Costos</span>
                </div>
                <div class="stat-card" style="padding:10px 14px; background:rgba(16,185,129,0.08); border-left-color:#10b981;">
                  <span class="sc-val" style="color:#10b981; font-size:1.2rem;">${formatPeso(m.gananciaNeta)}</span>
                  <span class="sc-lbl" style="font-size:10px;">Ganancia</span>
                </div>
                <div class="stat-card" style="padding:10px 14px; background:rgba(245,158,11,0.08); border-left-color:#f59e0b;">
                  <span class="sc-val" style="color:#f59e0b; font-size:1.2rem;">${formatPeso(m.diezmo)}</span>
                  <span class="sc-lbl" style="font-size:10px;">Diezmo (10%)</span>
                </div>
              </div>
              <div class="table-responsive">
                <table class="orders-table">
                  <thead>
                    <tr>
                      <th>#</th><th>Fecha</th><th>Nombre</th><th>Celular</th><th>Detalle</th>
                      <th>Total</th><th>Estado</th><th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>${rowsHtml}</tbody>
                </table>
              </div>
            </div>
          </div>
        `;
      });

      historyEl.innerHTML = historyHtml;
    }
  }
}

function cambiarMesActivo(mesKey) {
  activeMonthFilter = mesKey;
  if (window.allPedidos) {
    renderPedidos(window.allPedidos);
  }
}

function toggleMesHistorial(mesKey) {
  const body = document.getElementById('hm-body-' + mesKey);
  const arrow = document.getElementById('hm-arrow-' + mesKey);
  if (!body) return;
  const isHidden = (body.style.display === 'none');
  body.style.display = isHidden ? 'block' : 'none';
  if (arrow) arrow.classList.toggle('open', isHidden);
}

function generarPDFDesdePedido(idx) {
  const p = (window.allPedidos && window.allPedidos[idx]) ? window.allPedidos[idx] : (window.currentPedidos ? window.currentPedidos[idx] : null);
  if (!p) return;
  const parts = String(p.fecha || '').split(' ');
  const detalleStr = `${p.hojas} Impresiones ${p.tipo} (${p.color === 'BN' ? 'B/N' : 'Color'})`;
  
  const items = [{ cant: 1, desc: detalleStr, precio: parseInt(p.total) || 0 }];
  if (p.anillado === 'SI' || p.anillado === 'Si' || p.anillado === 'ANILLADO') {
    items.push({ cant: 1, desc: 'Servicio de Anillado', precio: 0 });
  }
  
  capturarPDF(
    `Comprobante_${p.num}.pdf`,
    p.nombre || 'Consumidor Final',
    items,
    parseInt(p.total) || 0,
    p.num || '---',
    parts[0] || '',
    parts[1] || ''
  );
}

// Modal Detalle de Pedido & Gestión de Estado
function abrirModalDetalle(idx) {
  const p = (window.allPedidos && window.allPedidos[idx]) ? window.allPedidos[idx] : (window.currentPedidos ? window.currentPedidos[idx] : null);
  if (!p) return;

  window.currentOrderActive = p;
  const isListo = localStorage.getItem('cb_order_status_' + p.num) === 'LISTO';

  document.getElementById('modalDetalleNum').textContent = `Pedido #${p.num}`;
  const badgeEl = document.getElementById('modalDetalleBadge');
  badgeEl.className = isListo ? 'badge-ready' : 'badge-pending';
  badgeEl.textContent = isListo ? '✅ Listo para Retirar' : '⏳ En Proceso';

  const checkEl = document.getElementById('checkListoModal');
  if (checkEl) checkEl.checked = isListo;

  const celStrModal = String(p.cel || '');
  const celClean = celStrModal.replace(/\D/g, '');
  const waLink = celClean ? `https://wa.me/${celClean}?text=Hola%20${encodeURIComponent(p.nombre || '')},%20tu%20pedido%20de%20COPIAS%20BOTS%20ya%20está%20listo%20para%20retirar%20en%20Bolivia%20271` : '#';

  const html = `
    <div class="detail-grid">
      <div class="detail-item">
        <div class="detail-label">👤 Cliente</div>
        <div class="detail-val">${p.nombre || '—'}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">📱 Celular / WhatsApp</div>
        <div class="detail-val">
          ${p.cel ? `<a href="${waLink}" target="_blank" style="color:#0973AD; text-decoration:none;">💬 ${p.cel}</a>` : '—'}
        </div>
      </div>
      <div class="detail-item">
        <div class="detail-label">📧 Email del Cliente</div>
        <div class="detail-val">
          <input type="email" id="inputEmailModal" class="price-input" style="width:100%; box-sizing:border-box; font-size:13px; padding:6px 10px;" value="${p.email && p.email !== '-' ? p.email : ''}" placeholder="Ej: cliente@gmail.com" />
        </div>
      </div>
      <div class="detail-item">
        <div class="detail-label">📅 Fecha de Ingreso</div>
        <div class="detail-val">${p.fecha || '—'}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">📄 Hojas / Páginas</div>
        <div class="detail-val">${p.hojas || '—'} pag.</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">🖨️ Tipo & Color</div>
        <div class="detail-val">${p.tipo || '—'} · ${p.color === 'BN' ? 'Blanco y Negro' : 'A Color'}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">📎 Terminación / Anillado</div>
        <div class="detail-val">${p.anillado || 'Sin anillado'}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">📁 Archivo Adjunto</div>
        <div class="detail-val">
          ${p.archivoUrl && p.archivoUrl !== 'Sin archivo' ? `<a href="${p.archivoUrl}" target="_blank" class="btn-primary" style="padding:4px 10px; font-size:12px; text-decoration:none; display:inline-block; margin-top:4px;">📥 Abrir en Google Drive</a>` : 'Sin archivo cargado'}
        </div>
      </div>
      <div class="detail-item full">
        <div class="detail-label">📝 Notas / Indicaciones del Cliente</div>
        <div class="detail-val" style="font-weight:500; color:#334155;">${p.notas || 'Sin observaciones'}</div>
      </div>
      <div class="detail-item full" style="background:#f0f9ff; border-color:#bae6fd;">
        <div class="detail-label" style="color:#0369a1;">💰 Resumen Financiero del Trabajo</div>
        <div class="detail-val" style="color:#0973AD; font-size:1.05rem;">
          Total Cobrado: <strong>${formatPeso(p.total)}</strong> &nbsp;·&nbsp; 
          Costo Real: <strong>${formatPeso(p.costo)}</strong> &nbsp;·&nbsp; 
          Ganancia Neta: <strong style="color:#10b981;">${formatPeso(p.ganancia)}</strong>
        </div>
      </div>
    </div>
  `;

  document.getElementById('modalDetalleContent').innerHTML = html;
  document.getElementById('modalDetalleBackdrop').classList.add('open');
  document.getElementById('modalDetallePedido').classList.add('open');
}

function cerrarModalDetalle() {
  document.getElementById('modalDetalleBackdrop')?.classList.remove('open');
  document.getElementById('modalDetallePedido')?.classList.remove('open');
}

function toggleEstadoPedidoModal(isListo) {
  const p = window.currentOrderActive;
  if (!p) return;

  localStorage.setItem('cb_order_status_' + p.num, isListo ? 'LISTO' : 'PENDIENTE');

  const badgeEl = document.getElementById('modalDetalleBadge');
  if (badgeEl) {
    badgeEl.className = isListo ? 'badge-ready' : 'badge-pending';
    badgeEl.textContent = isListo ? '✅ Listo para Retirar' : '⏳ En Proceso';
  }

  const cellEl = document.getElementById('status-cell-' + p.num);
  if (cellEl) {
    cellEl.innerHTML = isListo ? '<span class="badge-ready">✅ LISTO</span>' : '<span class="badge-pending">⏳ PROCESO</span>';
  }

  showToast(isListo ? '🎉 Marcas este pedido como LISTO' : '⏳ Pedido marcado en proceso', 'info');
}

async function notificarClienteEmail() {
  const p = window.currentOrderActive;
  if (!p) return;

  const emailInput = document.getElementById('inputEmailModal');
  const targetEmail = (emailInput ? emailInput.value : p.email || '').trim();

  if (!targetEmail || !targetEmail.includes('@')) {
    showToast('⚠️ Ingresá un email válido para enviar la notificación (o avisá por WhatsApp).', 'warning');
    if (emailInput) emailInput.focus();
    return;
  }

  p.email = targetEmail;
  showLoading('Enviando correo de notificación al cliente...');
  try {
    const payload = {
      action: 'notificarCliente',
      token: getAdminToken(),
      orderId: p.num,
      nombre: p.nombre,
      email: targetEmail,
      detalles: `Hojas: ${p.hojas} | Impresión: ${p.tipo} (${p.color === 'BN' ? 'B&N' : 'Color'}) | Anillado: ${p.anillado || 'No'}`
    };

    if (CONFIG.BACKEND_URL && !CONFIG.BACKEND_URL.includes('TU_URL')) {
      await fetch(CONFIG.BACKEND_URL, {
        method: 'POST',
        mode: 'cors',
        body: JSON.stringify(payload)
      });
    }

    toggleEstadoPedidoModal(true);
    hideLoading();
    cerrarModalDetalle();
    showToast(`📩 Correo enviado con éxito a ${targetEmail} y pedido marcado como LISTO!`, 'success');
  } catch(e) {
    hideLoading();
    showToast('Error al enviar correo de notificación.', 'error');
  }
}

function notificarClienteWhatsApp() {
  const p = window.currentOrderActive;
  if (!p) return;

  const celStrModal = String(p.cel || '');
  const celClean = celStrModal.replace(/\D/g, '');

  if (!celClean) {
    showToast('⚠️ El pedido no tiene un número de celular registrado.', 'warning');
    return;
  }

  const msg = `Hola ${p.nombre || 'Cliente'}, tu pedido de COPIAS BOTS (Nº ${p.num}) ya está 100% listo para retirar en Bolivia 271, San Nicolás! 🖨️✨`;
  window.open(`https://wa.me/${celClean}?text=${encodeURIComponent(msg)}`, '_blank');

  toggleEstadoPedidoModal(true);
  cerrarModalDetalle();
  showToast('💬 Redirigido a WhatsApp y pedido marcado como LISTO', 'success');
}

// ============================================================
// PRECIOS Y GESTIÓN DE PRODUCTOS
// ============================================================
async function cargarPrecios() {
  // Cargar inmediatamente desde caché local para velocidad instantánea (0 ms)
  const cached = localStorage.getItem('cb_cached_precios_v1');
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed.precios) state.precios = parsed.precios;
      if (parsed.productos) state.productos = parsed.productos;
      actualizarTablasPrecios();
      renderPricesAdmin();
    } catch(eCache) {}
  }

  try {
    if (!CONFIG.BACKEND_URL || CONFIG.BACKEND_URL.includes('TU_URL')) throw new Error('Sin backend');
    const url  = `${CONFIG.BACKEND_URL}?action=precios`;
    const res  = await fetch(url, { mode: 'cors' });
    const data = await res.json();
    if (data.ok && data.precios) {
      state.precios = data.precios.basic || CONFIG.PRECIOS_FALLBACK;
      state.productos = (data.precios.items && data.precios.items.length > 0) ? data.precios.items : JSON.parse(JSON.stringify(PRODUCTOS_DEFAULT));
      localStorage.setItem('cb_cached_precios_v1', JSON.stringify({ precios: state.precios, productos: state.productos }));
    }
    else throw new Error('Respuesta inválida');
  } catch(e) {
    if (!state.precios) state.precios = CONFIG.PRECIOS_FALLBACK;
    if (!state.productos || state.productos.length === 0) {
      state.productos = JSON.parse(JSON.stringify(PRODUCTOS_DEFAULT));
    }
  }
  actualizarTablasPrecios();
  renderPricesAdmin();
}

function renderPricesAdmin() {
  const tbody = document.getElementById('pricesBody');
  if(!tbody) return;
  if (!state.productos || state.productos.length === 0) {
    state.productos = JSON.parse(JSON.stringify(PRODUCTOS_DEFAULT));
  }
  tbody.innerHTML = '';
  state.productos.forEach((prod, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="text" class="price-input" style="width:100%;" value="${prod.detalle || ''}" onchange="updateProduct(${idx}, 'detalle', this.value)"></td>
      <td><input type="number" class="price-input" value="${prod.costo !== undefined ? prod.costo : 0}" step="0.01" onchange="updateProduct(${idx}, 'costo', this.value)"></td>
      <td><input type="number" class="price-input" value="${prod.publico !== undefined ? prod.publico : 0}" step="0.01" onchange="updateProduct(${idx}, 'publico', this.value)"></td>
      <td><button class="btn-danger" onclick="eliminarProducto(${idx})">🗑️</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function updateProduct(idx, field, val) {
  if (field === 'detalle') state.productos[idx][field] = val;
  else state.productos[idx][field] = parseFloat(val) || 0;
}

function agregarNuevoProducto() {
  state.productos.push({ codigo: state.productos.length + 1, detalle: 'Nuevo Producto', costo: 0, publico: 0 });
  renderPricesAdmin();
}

function eliminarProducto(idx) {
  if (confirm("¿Estás seguro de eliminar este producto?")) {
    state.productos.splice(idx, 1);
    renderPricesAdmin();
  }
}

async function guardarPreciosAdmin() {
  const btn = document.getElementById('btn-save-prices');
  btn.textContent = 'Guardando...';
  btn.disabled = true;
  try {
    const payload = {
      action: 'guardarPrecios',
      token: getAdminToken(),
      items: state.productos
    };
    const r = await fetch(CONFIG.BACKEND_URL, { 
      method: 'POST', 
      mode: 'cors',
      body: JSON.stringify(payload)
    });
    const res = await r.json();
    if(res.ok) {
      showToast('Precios guardados correctamente.', 'success');
      cargarPrecios(); // recargar
    } else {
      throw new Error(res.error);
    }
  } catch(e) {
    showToast('Error al guardar precios.', 'error');
  } finally {
    btn.textContent = '💾 Guardar Cambios';
    btn.disabled = false;
  }
}

function actualizarTablasPrecios() {
  if (!state.precios) return;
  const p = state.precios;
  const set = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = formatPeso(val) + ' c/u'; };
  set('ptable-sbn',  p.sBN);
  set('ptable-dbn',  p.dBN);
  set('ptable-scol', p.sCol);
  set('ptable-dcol', p.dCol);

  // Hero cards
  const hs = document.getElementById('hero-price-sbn');
  const hc = document.getElementById('hero-price-scol');
  if(hs) hs.textContent = formatPeso(p.sBN) + ' c/u';
  if(hc) hc.textContent = formatPeso(p.sCol) + ' c/u';
}

// ============================================================
// CALCULADORA INTERACTIVA
// ============================================================
function calcularPresupuesto() {
  const hojasInp = document.getElementById('calc-hojas');
  if (!hojasInp) return;
  const hojas = parseInt(hojasInp.value);
  const grid  = document.getElementById('calcGrid');
  const ph    = document.getElementById('calcPlaceholder');
  const info  = document.getElementById('calcInfoBox');

  if (!hojas || hojas <= 0) {
    if (grid) grid.style.display = 'none';
    if (ph) ph.style.display = 'block';
    if (info) info.style.display = 'block';
    return;
  }

  if (ph) ph.style.display = 'none';
  if (info) info.style.display = 'none';
  if (grid) {
    grid.style.display = 'flex';
    grid.style.flexDirection = 'column';
  }

  const p = state.precios || CONFIG.PRECIOS_FALLBACK;
  const aniPrice = state.calcAnillado ? calcAni(hojas) : 0;

  // Precios individuales de impresión
  const priceSBN  = redondeo(hojas * p.sBN);
  const priceDBN  = redondeo(Math.ceil(hojas / 2) * p.dBN);
  const priceSCol = redondeo(hojas * p.sCol);
  const priceDCol = redondeo(Math.ceil(hojas / 2) * p.dCol);

  // Actualizar montos en las 4 tarjetas (mostrando total con anillado incluido si está activo)
  const setCardPrice = (id, badgeId, basePrice) => {
    const el = document.getElementById(id);
    const badge = document.getElementById(badgeId);
    const totalCard = basePrice + aniPrice;
    if (el) el.textContent = formatPeso(totalCard);
    if (badge) {
      if (state.calcAnillado) {
        badge.style.display = 'block';
        badge.textContent = `(${formatPeso(basePrice)} + ${formatPeso(aniPrice)} anillado)`;
      } else {
        badge.style.display = 'none';
      }
    }
  };

  setCardPrice('price-dbn', 'ani-badge-dbn', priceDBN);
  setCardPrice('price-sbn', 'ani-badge-sbn', priceSBN);
  setCardPrice('price-dcol', 'ani-badge-dcol', priceDCol);
  setCardPrice('price-scol', 'ani-badge-scol', priceSCol);

  // Actualizar Resumen de Sumatoria Seleccionada
  actualizarResumenCalculadora(hojas, priceSBN, priceDBN, priceSCol, priceDCol, aniPrice);
}

function seleccionarOpcionCalc(tipo, color) {
  state.calcSelection = { tipo, color };

  // Quitar selected de todas
  ['po-dbn', 'po-sbn', 'po-dcol', 'po-scol'].forEach(id => {
    document.getElementById(id)?.classList.remove('selected');
  });

  // Marcar la seleccionada
  let activeId = 'po-dbn';
  if (tipo === 'DOBLE' && color === 'BN') activeId = 'po-dbn';
  else if (tipo === 'SIMPLE' && color === 'BN') activeId = 'po-sbn';
  else if (tipo === 'DOBLE' && color === 'COLOR') activeId = 'po-dcol';
  else if (tipo === 'SIMPLE' && color === 'COLOR') activeId = 'po-scol';

  document.getElementById(activeId)?.classList.add('selected');

  calcularPresupuesto();
}

function toggleAnillado(val) {
  state.calcAnillado = val;
  document.getElementById('pill-ani-no')?.classList.toggle('active', !val);
  document.getElementById('pill-ani-si')?.classList.toggle('active', val);
  calcularPresupuesto();
}

function actualizarResumenCalculadora(hojas, sbn, dbn, scol, dcol, aniPrice) {
  const sel = state.calcSelection || { tipo: 'DOBLE', color: 'BN' };
  let printCost = dbn;
  let printDesc = `${hojas} páginas (Doble Faz B&N)`;

  if (sel.tipo === 'SIMPLE' && sel.color === 'BN') {
    printCost = sbn;
    printDesc = `${hojas} páginas (Simple Faz B&N)`;
  } else if (sel.tipo === 'DOBLE' && sel.color === 'BN') {
    printCost = dbn;
    printDesc = `${hojas} páginas (Doble Faz B&N)`;
  } else if (sel.tipo === 'SIMPLE' && sel.color === 'COLOR') {
    printCost = scol;
    printDesc = `${hojas} páginas (Simple Faz Color)`;
  } else if (sel.tipo === 'DOBLE' && sel.color === 'COLOR') {
    printCost = dcol;
    printDesc = `${hojas} páginas (Doble Faz Color)`;
  }

  const sumDescEl = document.getElementById('sum-desc-print');
  const sumPricePrintEl = document.getElementById('sum-price-print');
  const sumAniRow = document.getElementById('sum-ani-row');
  const sumPriceAniEl = document.getElementById('sum-price-ani');
  const sumPriceTotalEl = document.getElementById('sum-price-total');
  const btnTotalTxt = document.getElementById('btn-total-txt');

  if (sumDescEl) sumDescEl.textContent = printDesc;
  if (sumPricePrintEl) sumPricePrintEl.textContent = formatPeso(printCost);

  if (sumAniRow) {
    sumAniRow.style.display = state.calcAnillado ? 'flex' : 'none';
    if (sumPriceAniEl) sumPriceAniEl.textContent = formatPeso(aniPrice);
  }

  const finalTotal = printCost + aniPrice;
  if (sumPriceTotalEl) sumPriceTotalEl.textContent = formatPeso(finalTotal);
  if (btnTotalTxt) btnTotalTxt.textContent = formatPeso(finalTotal);
}

function irAEncargueConSeleccion() {
  const hojasInp = document.getElementById('calc-hojas');
  const hojas = hojasInp ? parseInt(hojasInp.value) : 0;
  if (!hojas || hojas <= 0) {
    showToast('Ingresá la cantidad de páginas primero.', 'warning');
    return;
  }

  const sel = state.calcSelection || { tipo: 'DOBLE', color: 'BN' };
  const anillado = state.calcAnillado ? 'ANILLADO' : 'NO';
  
  window.location.href = `encargar.html?hojas=${hojas}&tipo=${sel.tipo}&color=${sel.color}&anillado=${anillado}`;
}

// ============================================================
// FORM SELECTIONS
// ============================================================
const choiceGroups = {
  tipo:     ['cc-simple','cc-doble'],
  color:    ['cc-bn','cc-color'],
  anillado: ['cc-ani-no','cc-ani-si','cc-ani-abrochado'],
  papel:    ['cc-papel-comun','cc-papel-grueso','cc-papel-foto','cc-papel-sticker'],
  envio:    ['cc-envio-retiro','cc-envio-domicilio'],
};

function selectOption(campo, valor, id) {
  state[campo] = valor;
  if (choiceGroups[campo]) {
    choiceGroups[campo].forEach(cid => {
      const el = document.getElementById(cid);
      if (el) el.classList.remove('selected');
    });
  }
  const target = document.getElementById(id);
  if (target) target.classList.add('selected');

  // Si elige Papel Fotográfico o Sticker, forzar Simple Faz y deshabilitar Doble Faz
  if (campo === 'papel') {
    const dobCard = document.getElementById('cc-doble');
    if (valor === 'FOTOGRAFICO' || valor === 'STICKER') {
      if (state.tipo === 'DOBLE') {
        selectOption('tipo', 'SIMPLE', 'cc-simple');
      }
      if (dobCard) {
        dobCard.style.opacity = '0.4';
        dobCard.style.pointerEvents = 'none';
      }
      const pNombre = valor === 'FOTOGRAFICO' ? 'Fotográfico' : 'Sticker';
      showToast(`ℹ️ El Papel ${pNombre} solo está disponible para impresión en Simple Faz.`, 'info');
    } else {
      if (dobCard) {
        dobCard.style.opacity = '1';
        dobCard.style.pointerEvents = 'auto';
      }
    }
  }

  actualizarResumen();
}

// ============================================================
// STEPS
// ============================================================
function nextStep(from) { if (validarStep(from)) goToStep(from + 1); }
function prevStep(from) { goToStep(from - 1); }

function goToStep(target) {
  document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
  document.getElementById(`step-${target}`)?.classList.add('active');

  for (let i = 1; i <= 4; i++) {
    const st   = document.getElementById(`si-${i}`);
    const line = document.getElementById(`si-line-${i}`);
    if (!st) continue;
    st.classList.remove('active','done');
    if (i < target) st.classList.add('done');
    if (i === target) st.classList.add('active');
    if (line) line.classList.toggle('done', i < target);
  }
  state.currentStep = target;
  if (target === 4) actualizarResumen();
  setTimeout(() => document.getElementById('encargue')?.scrollIntoView({ behavior: 'smooth' }), 50);
}

// ============================================================
// VALIDACION
// ============================================================
function validarStep(step) {
  if (step === 1) {
    if (!state.archivo) { showToast('Por favor, subí un archivo primero.', 'error'); return false; }
    const hojas = parseInt(document.getElementById('ord-hojas').value);
    if (!hojas || hojas <= 0) { 
      showToast('Por favor ingresá la cantidad de hojas o esperá a que se calcule.', 'error'); 
      document.getElementById('ord-hojas').classList.add('error'); 
      return false; 
    }
    document.getElementById('ord-hojas').classList.remove('error');
  }
  if (step === 2) {
    if (!state.tipo)  { showToast('Por favor seleccioná el tipo de impresión (Simple o Doble faz).', 'error'); return false; }
    if (!state.color) { showToast('Por favor seleccioná el color (B&N o Color).', 'error'); return false; }
    if (!state.anillado) { showToast('Por favor seleccioná la terminación (Sin anillado, Con anillado o Abrochado).', 'error'); return false; }
  }
  if (step === 3) {
    const nombre = document.getElementById('ord-nombre')?.value.trim() || '';
    const cel    = document.getElementById('ord-cel')?.value.trim() || '';
    const email  = document.getElementById('ord-email')?.value.trim() || '';

    if (!nombre) { showToast('⚠️ Por favor ingresá tu Nombre completo.', 'error'); return false; }
    if (!cel || cel.length < 6) { showToast('⚠️ Por favor ingresá un número de Celular válido.', 'error'); return false; }
    if (!email || !email.includes('@')) { showToast('⚠️ Por favor ingresá tu Correo Electrónico (Email). Es un requisito obligatorio.', 'error'); return false; }
  }
  return true;
}

// ============================================================
// RESUMEN
// ============================================================
function actualizarResumen() {
  const hojas  = parseInt(document.getElementById('ord-hojas').value) || 0;
  const nombre = document.getElementById('ord-nombre')?.value.trim() || '';
  const cel    = document.getElementById('ord-cel')?.value.trim()    || '';
  const notas  = document.getElementById('ord-notas')?.value.trim()  || '—';

  document.getElementById('res-hojas').textContent  = hojas || '—';
  document.getElementById('res-tipo').textContent   = state.tipo === 'SIMPLE' ? 'Simple (una cara)' : state.tipo === 'DOBLE' ? 'Doble faz' : '—';
  document.getElementById('res-color').textContent  = state.color === 'BN' ? 'Blanco y Negro' : state.color === 'COLOR' ? 'A Color' : '—';
  
  const papelEl = document.getElementById('res-papel');
  if (papelEl) {
    let pTxt = 'Común (75g)';
    if (state.papel === 'GRUESO') pTxt = 'Hoja Gruesa (120g/200g)';
    if (state.papel === 'FOTOGRAFICO') pTxt = 'Papel Fotográfico';
    if (state.papel === 'STICKER') pTxt = 'Sticker Autoadhesivo';
    papelEl.textContent = pTxt;
  }

  const envioEl = document.getElementById('res-envio');
  if (envioEl) {
    envioEl.textContent = state.envio === 'DOMICILIO' ? '🛵 Envío a Domicilio' : '🏪 Retiro en Local';
  }

  let aniText = '—';
  if (state.anillado === 'SIN_ANILLADO') aniText = 'Sin anillado';
  if (state.anillado === 'ANILLADO')     aniText = 'Con anillado';
  if (state.anillado === 'ABROCHADO')    aniText = 'Abrochado';
  document.getElementById('res-ani').textContent = aniText;

  document.getElementById('res-notas').textContent  = notas || '—';
  document.getElementById('res-nombre').textContent = nombre || '—';
  document.getElementById('res-cel').textContent    = cel    || '—';
  document.getElementById('res-archivo').textContent = state.archivo ? state.archivo.name : 'Sin archivo';

  if (hojas && state.tipo && state.color) {
    const p = state.precios || CONFIG.PRECIOS_FALLBACK;
    let costoImpresion = 0;
    if (state.papel === 'GRUESO') {
      costoImpresion = (state.tipo === 'DOBLE' ? 200 : 150) * (state.tipo === 'DOBLE' ? Math.ceil(hojas / 2) : hojas);
    } else if (state.papel === 'FOTOGRAFICO') {
      costoImpresion = 500 * hojas;
    } else if (state.papel === 'STICKER') {
      costoImpresion = 800 * hojas;
    } else { // COMUN
      if (state.tipo === 'SIMPLE' && state.color === 'BN')    costoImpresion = p.sBN  * hojas;
      if (state.tipo === 'DOBLE'  && state.color === 'BN')    costoImpresion = p.dBN  * Math.ceil(hojas/2);
      if (state.tipo === 'SIMPLE' && state.color === 'COLOR') costoImpresion = p.sCol * hojas;
      if (state.tipo === 'DOBLE'  && state.color === 'COLOR') costoImpresion = p.dCol * Math.ceil(hojas/2);
    }
    
    const aniCosto = state.anillado === 'ANILLADO' ? calcAni(hojas) : 0;
    const envioCosto = state.envio === 'DOMICILIO' ? 4000 : 0;
    const total = redondeo(costoImpresion + aniCosto + envioCosto);
    
    document.getElementById('res-total').textContent = formatPeso(total);
    
    // Update live pricing in Step 2
    const elLivePagesDesc = document.getElementById('live-pages-desc');
    const elLivePagesCost = document.getElementById('live-pages-cost');
    const elLiveAniDesc = document.getElementById('live-ani-desc');
    const elLiveAniCost = document.getElementById('live-ani-cost');
    const elLiveEnvioDesc = document.getElementById('live-envio-desc');
    const elLiveEnvioCost = document.getElementById('live-envio-cost');
    const elLiveTotal = document.getElementById('live-total');
    
    if (elLivePagesDesc) {
      elLivePagesDesc.textContent = `Hojas (${hojas}):`;
      elLivePagesCost.textContent = formatPeso(redondeo(costoImpresion));
      
      let liveAniText = 'Sin anillado:';
      if (state.anillado === 'ANILLADO') liveAniText = 'Anillado:';
      if (state.anillado === 'ABROCHADO') liveAniText = 'Abrochado:';
      elLiveAniDesc.textContent = liveAniText;
      elLiveAniCost.textContent = state.anillado === 'ANILLADO' ? formatPeso(aniCosto) : '$0';

      if (elLiveEnvioDesc) {
        elLiveEnvioDesc.textContent = state.envio === 'DOMICILIO' ? 'Envío domicilio:' : 'Retiro local:';
        elLiveEnvioCost.textContent = state.envio === 'DOMICILIO' ? formatPeso(4000) : 'Gratis';
      }

      elLiveTotal.textContent = formatPeso(total);
    }
  } else {
    const elLivePagesDesc = document.getElementById('live-pages-desc');
    if (elLivePagesDesc) {
      document.getElementById('live-pages-desc').textContent = 'Hojas: -';
      document.getElementById('live-pages-cost').textContent = '$0';
      document.getElementById('live-ani-desc').textContent = 'Anillado: -';
      document.getElementById('live-ani-cost').textContent = '$0';
      const elLiveEnvioDesc = document.getElementById('live-envio-desc');
      if (elLiveEnvioDesc) {
        elLiveEnvioDesc.textContent = state.envio === 'DOMICILIO' ? 'Envío domicilio:' : 'Retiro local:';
        document.getElementById('live-envio-cost').textContent = state.envio === 'DOMICILIO' ? formatPeso(4000) : 'Gratis';
      }
      document.getElementById('live-total').textContent = state.envio === 'DOMICILIO' ? formatPeso(4000) : '$0';
    }
  }
}

// ============================================================
// UPLOAD — Handlers registrados via JS en DOMContentLoaded (ver arriba)
// ============================================================
// Las funciones handleDragOver, handleDrop y handleFileSelect se
// definen acá solo como fallback por si hay algun HTML legacy que las llame.
function handleDragOver(e) { if(e) e.preventDefault(); }
function handleDragLeave() {}
function handleDrop(e) { if(e) { e.preventDefault(); const f = e.dataTransfer && e.dataTransfer.files[0]; if(f) procesarArchivo(f); } }
function handleFileSelect(e) { if(e) { const f = e.target.files[0]; if(f) procesarArchivo(f); } }

async function procesarArchivo(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const okExt = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'];
  
  if (!okExt.includes(ext)) { 
    showToast('Tipo no permitido. Usá PDF, DOC, DOCX, JPG o PNG.', 'error'); 
    return; 
  }
  
  state.archivo = file;
  document.getElementById('uploadArea').style.display  = 'none';
  document.getElementById('filePreview').style.display = 'block';
  document.getElementById('fileName').textContent = file.name;
  document.getElementById('fileSize').textContent = formatFileSize(file.size);
  animateProgress(document.getElementById('uploadProgressFill'), 100);
  
  const pgCountEl = document.getElementById('filePagesCount');
  const manGroup = document.getElementById('manualPagesGroup');
  const ordHojas = document.getElementById('ord-hojas');
  
  pgCountEl.textContent = 'Calculando paginas...';
  manGroup.style.display = 'none';
  ordHojas.value = '';
  
  if (ext === 'pdf' && window.pdfjsLib) {
    try {
      const url = URL.createObjectURL(file);
      const pdf = await window.pdfjsLib.getDocument(url).promise;
      const numPages = pdf.numPages;
      pgCountEl.textContent = `Paginas detectadas: ${numPages}`;
      ordHojas.value = numPages;
    } catch(e) {
      pgCountEl.textContent = 'No se pudo leer el PDF automáticamente. Ingresa paginas manual.';
      manGroup.style.display = 'block';
    }
  } else if (['jpg', 'jpeg', 'png'].includes(ext)) {
    pgCountEl.textContent = 'Paginas detectadas: 1 (Imagen)';
    ordHojas.value = 1;
  } else {
    pgCountEl.textContent = 'Documento detectado. Ingresa las paginas manualmente.';
    manGroup.style.display = 'block';
  }
  
  actualizarResumen();
}

function removeFile() {
  state.archivo = null;
  document.getElementById('uploadArea').style.display  = 'block';
  document.getElementById('filePreview').style.display = 'none';
  document.getElementById('fileInput').value = '';
  document.getElementById('uploadProgressFill').style.width = '0';
  actualizarResumen();
}

function animateProgress(el, target) {
  let c = 0;
  const iv = setInterval(() => { c += 3; el.style.width = Math.min(c, target) + '%'; if(c >= target) clearInterval(iv); }, 16);
}

function formatFileSize(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b/1024).toFixed(1) + ' KB';
  return (b/1048576).toFixed(2) + ' MB';
}

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload  = () => res(r.result.split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

// ============================================================
// ENVIAR PEDIDO
// ============================================================
async function enviarPedido() {
  if (!document.getElementById('ord-terminos').checked) {
    showToast('Por favor aceptá los términos.', 'error'); return;
  }
  const hojas  = parseInt(document.getElementById('ord-hojas').value);
  const nombre = document.getElementById('ord-nombre').value.trim();
  const cel    = document.getElementById('ord-cel').value.trim();
  const email  = document.getElementById('ord-email').value.trim();
  const notas  = document.getElementById('ord-notas').value.trim() || '-';

  const p = state.precios || CONFIG.PRECIOS_FALLBACK;
  let costoImpresion = 0;
  if (state.papel === 'GRUESO') {
    costoImpresion = (state.tipo === 'DOBLE' ? 200 : 150) * (state.tipo === 'DOBLE' ? Math.ceil(hojas / 2) : hojas);
  } else if (state.papel === 'FOTOGRAFICO') {
    costoImpresion = 500 * hojas;
  } else if (state.papel === 'STICKER') {
    costoImpresion = 800 * hojas;
  } else { // COMUN
    if (state.tipo === 'SIMPLE' && state.color === 'BN')    costoImpresion = p.sBN  * hojas;
    if (state.tipo === 'DOBLE'  && state.color === 'BN')    costoImpresion = p.dBN  * Math.ceil(hojas/2);
    if (state.tipo === 'SIMPLE' && state.color === 'COLOR') costoImpresion = p.sCol * hojas;
    if (state.tipo === 'DOBLE'  && state.color === 'COLOR') costoImpresion = p.dCol * Math.ceil(hojas/2);
  }
  const aniCosto = state.anillado === 'ANILLADO' ? calcAni(hojas) : 0;
  const envioCosto = state.envio === 'DOMICILIO' ? 4000 : 0;
  const total = redondeo(costoImpresion + aniCosto + envioCosto);

  showLoading('Subiendo archivo y enviando pedido (puede demorar un poco)...');
  try {
    let base64File = null;
    let fileName = null;
    let fileMimeType = null;
    
    if (state.archivo) {
      // Convertir archivo a base64
      base64File = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(state.archivo);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
      });
      fileName = state.archivo.name;
      fileMimeType = state.archivo.type;
    }

    const detallesStr = `Hojas: ${hojas}\nImpresión: ${state.tipo} (${state.color})\nAnillado: ${state.anillado || 'No'}\nNotas: ${notas}`;

    const payload = {
      nombre: nombre,
      telefono: cel,
      email: email,
      detalles: detallesStr,
      precioTotal: total,
      hojas: hojas,
      tipo: state.tipo,
      color: state.color,
      anillado: state.anillado || 'NO',
      papel: state.papel || 'COMUN',
      envio: state.envio || 'RETIRO',
      notas: notas,
      fileBase64: base64File,
      fileName: fileName,
      fileMimeType: fileMimeType
    };

    showLoading('Subiendo archivo y registrando pedido...');
    updateLoadingProgress(25, 'Preparando transferencia...');

    let resp = { success: false };
    if (CONFIG.BACKEND_URL && !CONFIG.BACKEND_URL.includes('TU_URL')) {
      try {
        updateLoadingProgress(50, 'Enviando archivo y datos al servidor...');
        const fetchRes = await fetch(CONFIG.BACKEND_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });

        updateLoadingProgress(90, 'Procesando confirmación de pedido...');
        resp = await fetchRes.json();
      } catch (err) {
        console.error('Error enviando pedido:', err);
        resp = { success: false, error: err ? err.toString() : 'Error de transferencia' };
      }
    } else {
      resp = { success: true, orderId: "100001" };
    }

    hideLoading();
    if (resp.success) {
      document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
      const stepSuccess = document.getElementById('step-success');
      if (stepSuccess) stepSuccess.classList.add('active');
      const indicator = document.querySelector('.steps-indicator');
      if (indicator) indicator.style.display = 'none';

      const orderIdVal = resp.orderId || (100000 + Math.floor(Math.random() * 900) + 100);

      const successInfo = document.getElementById('successInfo');
      if (successInfo) {
        successInfo.innerHTML = `
          <div style="background:#f0f9ff; border:2px solid #0973AD; border-radius:16px; padding:24px; margin:20px 0; text-align:center;">
            <p style="color:#0369a1; font-weight:700; margin:0 0 6px 0; font-size:14px;">TU NÚMERO DE PEDIDO ES:</p>
            <h2 style="color:#0973AD; font-size:2.5rem; letter-spacing:3px; margin:0 0 12px 0;">${orderIdVal}</h2>
            <p style="color:#334155; font-size:14px; margin:0 0 16px 0;">
              Guardá este número. Te enviamos un email a <strong>${email}</strong> y podés consultar el avance de tu trabajo en cualquier momento desde la sección <strong>Estado de Pedido</strong>.
            </p>
            <a href="estado-pedido.html?num=${orderIdVal}" class="btn btn-primary" style="text-decoration:none; display:inline-block; font-size:15px; background:#0973AD;">
              🔎 Seguir Estado del Pedido
            </a>
          </div>
        `;
      }
      showToast('¡Pedido enviado con éxito! 🎉', 'success');
    } else {
      throw new Error(resp.error || 'Error al enviar pedido');
    }
  } catch(e) {
    hideLoading();
    
    // FALLBACK A WHATSAPP SI ALGO FALLA EN GOOGLE APPS SCRIPT
    const msg = `Hola! Tuve un problema enviando el encargo por la web. Te paso mi pedido:
- Archivo: ${state.archivo ? state.archivo.name : 'Sin archivo'}
- Hojas: ${hojas}
- Impresion: ${state.tipo} (${state.color === 'BN' ? 'Blanco y Negro' : 'Color'})
- Anillado: ${state.anillado ? state.anillado : 'No'}
- Notas: ${notas}
- Total estimado: ${formatPeso(total)}

Mis datos:
- Nombre: ${nombre}
- Celular: ${cel}`;
    const waLink = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
    
    document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
    document.getElementById('step-success').classList.add('active');
    document.querySelector('.steps-indicator').style.display = 'none';
    
    document.getElementById('successInfo').innerHTML = `
      <div style="background:#fff3cd; color:#856404; padding:15px; border-radius:8px; margin-top:20px; text-align:left;">
        <strong>⚠️ Hubo un problema al subir el archivo o enviar los datos.</strong><br>
        Por favor, hace clic en el boton de abajo para enviarnos el archivo y el detalle de tu pedido directamente por WhatsApp.
      </div>
      <a href="${waLink}" target="_blank" class="btn-success" style="display:inline-block; margin-top:15px; text-decoration:none;">Enviar por WhatsApp 💬</a>
    `;
    
    showToast('Redirigiendo a WhatsApp por error de servidor.', 'warning');
  }
}

function resetForm() {
  state.tipo = null; state.color = null; state.anillado = null; state.archivo = null;
  ['ord-hojas','ord-nombre','ord-cel','ord-email','ord-notas'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
  const terms = document.getElementById('ord-terminos');
  if (terms) terms.checked = false;
  document.querySelectorAll('.choice-card').forEach(el => el.classList.remove('selected'));
  removeFile();
  const si = document.querySelector('.steps-indicator');
  if (si) si.style.display = 'flex';
  goToStep(1);
}

// ============================================================
// UI HELPERS
// ============================================================
let toastTimer;
function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className   = `toast ${type} visible`;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('visible'), 4000);
}
function showLoading(text) {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.style.display = 'flex';
  const txt = document.getElementById('loadingText');
  if (txt) txt.textContent = text || 'Procesando...';

  let pBar = document.getElementById('globalLoadingProgress');
  if (!pBar) {
    const box = overlay ? overlay.querySelector('.loading-box') : null;
    if (box) {
      box.insertAdjacentHTML('beforeend', '<div style="width:100%;height:10px;background:#e2e8f0;border-radius:6px;margin-top:15px;overflow:hidden;"><div id="globalLoadingProgress" style="width:0%;height:100%;background:linear-gradient(90deg, #0973AD, #00B67A);transition:width 0.2s ease;"></div></div>');
      pBar = document.getElementById('globalLoadingProgress');
    }
  }
  if (pBar) pBar.style.width = '0%';
}

function updateLoadingProgress(percentage, text) {
  const txt = document.getElementById('loadingText');
  if (txt && text) txt.textContent = text;
  const pBar = document.getElementById('globalLoadingProgress');
  if (pBar) pBar.style.width = Math.min(100, Math.max(0, percentage)) + '%';
}

function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.style.display = 'none';
  if (window.loadingProgressInterval) clearInterval(window.loadingProgressInterval);
  const pBar = document.getElementById('globalLoadingProgress');
  if (pBar) pBar.style.width = '100%';
}

// ============================================================
// SISTEMA DE MENSAJERÍA / CONSULTAS
// ============================================================
function crearModalConsultaUI() {
  if (document.getElementById('modalConsultaCard')) return;

  const backdrop = document.createElement('div');
  backdrop.id = 'modalConsultaBackdrop';
  backdrop.className = 'modal-backdrop';
  backdrop.onclick = cerrarModalConsulta;

  const modal = document.createElement('div');
  modal.id = 'modalConsultaCard';
  modal.className = 'modal-consulta-card';
  modal.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; border-bottom:1px solid #e2e8f0; padding-bottom:12px;">
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="font-size:1.4rem;">💬</span>
        <h3 style="margin:0; color:var(--text-1); font-size:1.25rem; font-weight:800;">Dejanos tu Consulta</h3>
      </div>
      <button onclick="cerrarModalConsulta()" style="background:#f1f5f9; border:none; border-radius:50%; width:30px; height:30px; font-size:14px; cursor:pointer; color:#64748b; font-weight:700;">✕</button>
    </div>
    
    <p style="font-size:13px; color:var(--text-3); margin-bottom:18px; line-height:1.4;">
      Escribinos tu duda, presupuesto especial o consulta y te responderemos a la brevedad por WhatsApp.
    </p>

    <div class="form-group" style="margin-bottom:14px;">
      <label style="font-size:12px; font-weight:700; color:var(--text-2); display:block; margin-bottom:6px;">Tu Nombre Completo *</label>
      <input type="text" id="msg-nombre" class="price-input" style="width:100%; box-sizing:border-box; padding:10px 12px; font-size:14px;" placeholder="Ej: Mariano López" />
    </div>

    <div class="form-group" style="margin-bottom:14px;">
      <label style="font-size:12px; font-weight:700; color:var(--text-2); display:block; margin-bottom:6px;">Tu Teléfono / WhatsApp *</label>
      <input type="tel" id="msg-cel" class="price-input" style="width:100%; box-sizing:border-box; padding:10px 12px; font-size:14px;" placeholder="Ej: 3364123456" />
    </div>

    <div class="form-group" style="margin-bottom:20px;">
      <label style="font-size:12px; font-weight:700; color:var(--text-2); display:block; margin-bottom:6px;">Tu Mensaje / Consulta *</label>
      <textarea id="msg-texto" class="price-input" rows="3" style="width:100%; box-sizing:border-box; padding:10px 12px; font-size:14px; resize:vertical;" placeholder="Ej: ¿Cuánto demoran en hacer 100 copias anilladas?"></textarea>
    </div>

    <button class="btn-primary btn-full" onclick="enviarConsultaCliente()" id="btn-send-msg" style="padding:12px; font-size:15px; font-weight:700; background:var(--gradient); border:none; box-shadow:0 6px 18px rgba(9,115,173,0.3);">
      🚀 Enviar Mensaje
    </button>
  `;

  document.body.appendChild(backdrop);
  document.body.appendChild(modal);
}

function abrirModalConsulta() {
  crearModalConsultaUI();
  document.getElementById('modalConsultaBackdrop')?.classList.add('open');
  document.getElementById('modalConsultaCard')?.classList.add('open');
  setTimeout(() => document.getElementById('msg-nombre')?.focus(), 200);
}

function cerrarModalConsulta() {
  document.getElementById('modalConsultaBackdrop')?.classList.remove('open');
  document.getElementById('modalConsultaCard')?.classList.remove('open');
}

async function enviarConsultaCliente() {
  const nombre = (document.getElementById('msg-nombre')?.value || '').trim();
  const cel    = (document.getElementById('msg-cel')?.value || '').trim();
  const msg    = (document.getElementById('msg-texto')?.value || '').trim();
  const btn    = document.getElementById('btn-send-msg');

  if (!nombre) { showToast('Por favor, ingresá tu nombre.', 'warning'); return; }
  if (!cel || cel.length < 6) { showToast('Por favor, ingresá un número de WhatsApp válido.', 'warning'); return; }
  if (!msg) { showToast('Por favor, escribí tu consulta o mensaje.', 'warning'); return; }

  if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }

  const now = new Date();
  const nuevoMensaje = {
    id: 'MSG-' + Date.now(),
    fecha: now.toLocaleDateString('es-AR') + ' ' + now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
    nombre,
    cel,
    mensaje: msg,
    leido: false
  };

  // Guardar localmente
  const guardados = JSON.parse(localStorage.getItem('cb_mensajes_clientes') || '[]');
  guardados.unshift(nuevoMensaje);
  localStorage.setItem('cb_mensajes_clientes', JSON.stringify(guardados));

  // Enviar al Backend / Telegram del dueño
  try {
    if (CONFIG.BACKEND_URL && !CONFIG.BACKEND_URL.includes('TU_URL')) {
      const payload = {
        action: 'nuevaConsulta',
        nombre,
        cel,
        mensaje: msg
      };
      await fetch(CONFIG.BACKEND_URL, {
        method: 'POST',
        mode: 'cors',
        body: JSON.stringify(payload)
      });
    }
  } catch(e) {
    console.warn('[Mensajería] No se pudo enviar por red, guardado en panel local:', e);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🚀 Enviar Mensaje'; }
  }

  // Limpiar campos y cerrar
  if (document.getElementById('msg-nombre')) document.getElementById('msg-nombre').value = '';
  if (document.getElementById('msg-cel')) document.getElementById('msg-cel').value = '';
  if (document.getElementById('msg-texto')) document.getElementById('msg-texto').value = '';

  cerrarModalConsulta();
  showToast('🎉 ¡Tu consulta fue enviada con éxito! Te responderemos pronto.', 'success');
  actualizarBadgeMensajes();
}

// ---- Gestión de Mensajes en el Dashboard ----
function cargarMensajesAdmin() {
  const container = document.getElementById('mensajesAdminContainer');
  const badgeEl = document.getElementById('msgCountBadge');
  if (!container) return;

  const mensajes = JSON.parse(localStorage.getItem('cb_mensajes_clientes') || '[]');
  if (badgeEl) badgeEl.textContent = mensajes.length;

  if (mensajes.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:40px 20px; background:#fff; border-radius:12px; border:1px solid #e2e8f0;">
        <span style="font-size:3rem;">📭</span>
        <h3 style="color:#0c4a6e; margin:12px 0 6px 0;">No tenés mensajes nuevos</h3>
        <p style="color:#64748b; font-size:14px; margin:0;">Las consultas que envíen tus clientes desde la web aparecerán acá.</p>
      </div>
    `;
    return;
  }

  let html = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
      <h3 style="margin:0; color:#fff; font-size:1.2rem;">Consultas de Clientes (${mensajes.length})</h3>
      <button class="btn btn-outline" onclick="limpiarTodosLosMensajesAdmin()" style="font-size:12px; padding:6px 12px; color:#fff; border-color:rgba(255,255,255,0.4);">🗑️ Borrar todos</button>
    </div>
    <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap:16px;">
  `;

  mensajes.forEach((m, idx) => {
    const celClean = (m.cel || '').replace(/\D/g, '');
    const waText = encodeURIComponent(`Hola ${m.nombre || 'Cliente'}, te escribo de COPIAS BOTS respecto a tu consulta: "${m.mensaje}"`);
    const waLink = `https://wa.me/${celClean}?text=${waText}`;

    html += `
      <div style="background:#fff; border-radius:14px; padding:18px; box-shadow:0 6px 20px rgba(0,0,0,0.08); border-left:4px solid #0973AD; display:flex; flex-direction:column; justify-content:space-between;">
        <div>
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
            <strong style="font-size:15px; color:#0c4a6e;">👤 ${m.nombre || 'Cliente'}</strong>
            <small style="color:#94a3b8; font-size:11px;">📅 ${m.fecha || ''}</small>
          </div>
          <div style="font-size:13px; color:#0369a1; font-weight:700; margin-bottom:10px;">
            📱 ${m.cel || 'Sin teléfono'}
          </div>
          <div style="background:#f8fafc; padding:12px; border-radius:8px; font-size:13.5px; color:#334155; line-height:1.5; border:1px solid #e2e8f0; margin-bottom:14px;">
            "${m.mensaje || ''}"
          </div>
        </div>
        <div style="display:flex; gap:8px; justify-content:space-between; align-items:center; padding-top:10px; border-top:1px solid #f1f5f9;">
          <a href="${waLink}" target="_blank" class="btn-primary" style="background:#25D366; color:#fff; text-decoration:none; padding:8px 14px; font-size:12px; border-radius:6px; font-weight:700; display:inline-flex; align-items:center; gap:6px;">
            💬 Responder por WhatsApp
          </a>
          <button onclick="eliminarMensajeAdmin(${idx})" style="background:#fee2e2; border:none; color:#dc2626; padding:8px 10px; border-radius:6px; font-size:12px; cursor:pointer; font-weight:700;" title="Eliminar mensaje">
            🗑️
          </button>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;
}

function eliminarMensajeAdmin(idx) {
  const mensajes = JSON.parse(localStorage.getItem('cb_mensajes_clientes') || '[]');
  mensajes.splice(idx, 1);
  localStorage.setItem('cb_mensajes_clientes', JSON.stringify(mensajes));
  cargarMensajesAdmin();
  actualizarBadgeMensajes();
  showToast('Mensaje eliminado.', 'info');
}

function limpiarTodosLosMensajesAdmin() {
  if (confirm('¿Estás seguro de que querés borrar todos los mensajes?')) {
    localStorage.removeItem('cb_mensajes_clientes');
    cargarMensajesAdmin();
    actualizarBadgeMensajes();
    showToast('Bandeja de mensajes vaciada.', 'info');
  }
}

function actualizarBadgeMensajes() {
  const badgeEl = document.getElementById('msgCountBadge');
  if (badgeEl) {
    const mensajes = JSON.parse(localStorage.getItem('cb_mensajes_clientes') || '[]');
    badgeEl.textContent = mensajes.length;
  }
}

