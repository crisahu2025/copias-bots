# 📱 Reglas y Estándares de Diseño Móvil (Mobile UI Guidelines)
> **COPIAS BOTS · PWA & Mobile Web Architecture**

Este documento define las reglas de oro y directrices de diseño *Mobile-First* para evitar solapamientos de elementos, botones desalineados o fallas en pantallas pequeñas.

---

## 1. 🛡️ Regla de Cero Solapamiento en el Header (Zero Overlapping Rule)

* **En Celulares (`<= 768px`):**
  * La barra superior fija (`.site-header`) **SOLO** debe contener:
    1. **Logotipo / Nombre** alineado a la izquierda.
    2. **Botón Hamburguesa** alineado a la derecha.
  * **PROHIBIDO:** Colocar botones de texto (`.btn-cta`, `.btn-nav-msg`, "Iniciar Sesión", "Consultas") sueltos o flotantes en la barra superior en pantallas móviles.
  * **Destino de las Acciones:** Todos los botones de acción deben residir **dentro del Drawer / Menú Desplegable Móvil (`.nav-drawer-actions`)**.

---

## 2. 🍔 Arquitectura del Menú Hamburguesa (Mobile Drawer)

* **Estructura Unificada:**
  * El menú móvil debe ser un único contenedor vertical (`.nav-links.open`) con `position: fixed`, que se despliega inmediatamente debajo del header (`top: 56px; left: 0; right: 0;`).
  * Incluye animación suave de deslizamiento (`animation: mobileSlideDown 0.25s ease`).
  * Incluye fondo blanco con sombra pronunciada (`box-shadow: 0 25px 60px rgba(0,0,0,0.3)`).
  * Incluye un **Backdrop semi-transparente con blur** (`.nav-backdrop`) que bloquea el scroll y cierra el menú al tocar cualquier parte fuera de él.
* **Comportamiento Táctil:**
  * Al hacer clic en cualquier enlace interno (`Inicio`, `Presupuesto`, `Encargue`, etc.) o en el botón de consulta, el menú se debe **cerrar automáticamente** (`closeMenuMobile()`).
  * La hamburguesa debe animarse a una **'✕'** clara cuando el menú esté abierto (`.hamburger.active`).

---

## 3. 📐 Estándares de Dimensiones y Zonas Táctiles (Touch Targets)

* **Área táctil mínima:** Todo botón, enlace o elemento interactivo debe tener un área táctil mínima de **44 × 44 px** para evitar toques accidentales con el dedo.
* **Separación entre tarjetas y botones:** Mínimo `8px` a `12px` de margen vertical entre botones apilados.
* **Padding del Body / Secciones:** Para headers fijos de `56px`, el `body` o la primera sección deben tener al menos `56px` a `80px` de `padding-top` para evitar que el contenido quede oculto debajo de la barra.

---

## 4. 🧪 Checklist de Verificación Responsive Obligatorio

Antes de cualquier despliegue a producción, validar:
1. **Viewport 360px (Móvil Estándar):**
   - [x] El logo y el botón hamburguesa están alineados en los extremos sin tocarse.
   - [x] No hay desbordamiento horizontal (*horizontal overflow / scroll horizontal*).
   - [x] El menú hamburguesa abre y cierra limpiamente.
   - [x] Los botones "Dejar Consulta" e "Iniciar Sesión" están integrados dentro del drawer.
2. **Viewport 768px (Tablet):**
   - [x] Transición limpia entre modo móvil y barra horizontal de escritorio.
3. **Viewport 1200px (Desktop):**
   - [x] Menú horizontal centrado, acciones a la derecha, hamburguesa oculta.
