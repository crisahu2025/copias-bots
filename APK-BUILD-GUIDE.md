# 📱 Guía para Generar el APK y Usar la PWA — COPIAS BOTS

¡Tu sistema ya está 100% configurado como **Progressive Web App (PWA)**!

Ahora tenés dos formas de usarlo:
1. **Instalación directa desde el navegador (PWA):** La forma más fácil para clientes (sin descargar archivos pesados).
2. **Archivo instalador `.apk` para Android:** Para instalarlo como app nativa o subirlo a tiendas.

---

## 🌟 PARTE 1 — Cómo la instalan tus clientes (PWA en 1 Clic)

Cuando tus clientes ingresen a tu web desde el celular:

### En Android (Chrome / Edge / Samsung Internet):
1. Al entrar a la web, verán automáticamente un banner abajo: **"📲 Instalar Copias Bots"**.
2. Tocan **"Instalar"** y en 2 segundos se agrega el ícono oficial de Copias Bots a su pantalla de inicio.
3. Se abre a pantalla completa, sin barra de direcciones, como una app nativa de Android.

### En iPhone (Safari):
1. El cliente entra a la web.
2. Toca el botón **Compartir** (icono con flecha hacia arriba ⬆️).
3. Selecciona **"Agregar a pantalla de inicio ➕"**.

---

## 📦 PARTE 2 — Cómo Generar el archivo `.apk` para Android

El método más rápido y oficial recomendado por Google y Microsoft es **PWABuilder**:

### Paso 1: Publicar los cambios en tu hosting
Asegurate de que tu web esté subida a Vercel o Netlify (por ejemplo `https://tu-proyecto.vercel.app`).

### Paso 2: Entrar a PWABuilder
1. Abrí en tu navegador: **[https://www.pwabuilder.com](https://www.pwabuilder.com)**
2. En el recuadro, pegá la URL de tu web (ej: `https://fotocopias.vercel.app`).
3. Hacé clic en **"Start"**.

### Paso 3: Generar el paquete Android
1. PWABuilder analizará tu web (verás que la puntuación de PWA es óptima porque ya creamos el `manifest.json`, `sw.js` y los íconos 192/512px).
2. Hacé clic en el botón verde **"Package for Stores"** o **"Android"**.
3. En las opciones de Android podés elegir:
   * **Test package (APK directo):** Te descarga el archivo `.apk` firmado de prueba listo para instalar en cualquier celular por WhatsApp, Telegram o cable USB.
   * **Production (AAB):** Si en el futuro querés publicarla en Google Play Store.
4. Hacé clic en **"Generate"** y descargá el archivo `.zip`.
5. Dentro del `.zip` encontrarás tu archivo `.apk`.

---

## 🛠️ PARTE 3 — Método Alternativo con Terminal (Bubblewrap CLI)

Si preferís generar la APK desde tu computadora con Node.js:

1. Abrí la terminal en tu PC.
2. Instalá la herramienta oficial de Google:
   ```bash
   npm install -g @bubblewrap/cli
   ```
3. Inicializá el proyecto con tu URL de producción:
   ```bash
   bubblewrap init --manifest=https://tu-web.vercel.app/manifest.json
   ```
4. Compilá el APK:
   ```bash
   bubblewrap build
   ```
5. La terminal generará tu archivo `app-release-signed.apk`.

---

## 🏪 PARTE 4 — Cómo aprovechar la App en tu local (Bolivia 271)

1. **Cartel con Código QR en el mostrador:**
   * Generá un código QR con el link de tu web/app.
   * Poné un cartel: *"¡Pedí tus fotocopias sin hacer fila! Escaneá acá e instalá Copias Bots en tu celu"*.
2. **Acceso Rápido para vos (Dueño / Administrador):**
   * Desde la app instalada, tocá el menú y andá a **Iniciar Sesión**.
   * Poné tus credenciales y tendrás tu **Dashboard** siempre a mano en tu celular para ver pedidos y cambiar precios.
