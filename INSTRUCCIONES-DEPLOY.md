# 🚀 Instrucciones de Deploy — Fotocopias Bolivia 271

## Resumen de archivos creados

```
Fotocopias/
├── index.html              ← Página web principal
├── css/
│   └── style.css           ← Estilos del sitio
├── js/
│   ├── config.js           ← ⚠️ Configuración (editá esto primero)
│   └── app.js              ← Lógica de la web
└── backend-v2.gs           ← Script de Google Apps Script actualizado
```

---

## PASO 1 — Configurar el backend (Google Apps Script)

1. Abrí tu Google Sheet (Fotocopias).
2. Hacé clic en **Extensiones → Apps Script**.
3. **Borrá todo el código existente** y pegá el contenido de `backend-v2.gs`.
4. Completá las líneas marcadas con ⬇️:

```javascript
const OWNER_CHAT_ID   = "TU_CHAT_ID_PERSONAL";  // ← tu ID de Telegram
const OWNER_EMAIL     = "tu@gmail.com";           // ← tu Gmail
const API_KEY_SECRETA = "clave-secreta-larga";    // ← inventá una clave larga
```

### ¿Cómo obtener tu Chat ID de Telegram?
1. Abrí Telegram y buscá el bot **@userinfobot**.
2. Escribile `/start`.
3. Te va a responder con tu ID numérico (ej: `123456789`).

### ¿Cómo generar la API Key?
Podés usar cualquier cadena larga y aleatoria, por ejemplo:
`CopyBot_2026_k9mX3pQ8vN1rT7bW5jYz`

---

## PASO 2 — Deployar el Script como Web App

1. En el editor de Apps Script, hacé clic en **Implementar → Nueva implementación**.
2. Tipo: **Aplicación web**.
3. Configuración:
   - **Ejecutar como**: Yo (tu cuenta de Google)
   - **Quién tiene acceso**: Cualquiera
4. Hacé clic en **Implementar** y autorizá los permisos.
5. Copiá la **URL de la aplicación web** que aparece (se ve así):
   `https://script.google.com/macros/s/XXXXXXXXXX/exec`

---

## PASO 3 — Reconfigurar el Webhook de Telegram

1. En el editor de Apps Script, hacé clic en el triángulo ▶ junto a la función **`setWebhook`**.
2. Ejecutala. Esto conecta el bot de Telegram con tu nuevo script.

---

## PASO 4 — Configurar la web (`js/config.js`)

Abrí el archivo `js/config.js` y completá:

```javascript
const CONFIG = {
  BACKEND_URL: "https://script.google.com/macros/s/XXXXXXXXXX/exec",  // ← URL del paso 2
  API_KEY:     "clave-secreta-larga",  // ← la misma clave que pusiste en el script
  TELEGRAM_USERNAME: "CopiasBoliviaBot",       // ← username de tu bot de Telegram
  WHATSAPP_NUMBER:   "5493360xxxxxxx",          // ← tu número con código de país
  ...
};
```

---

## PASO 5 — Subir la web a Netlify (100% gratis)

1. Creá una cuenta gratuita en [netlify.com](https://netlify.com).
2. En el dashboard, hacé clic en **"Add new site" → "Deploy manually"**.
3. Arrastrá toda la carpeta `Fotocopias/` al área que aparece.
4. ¡Listo! Netlify te da una URL como `fotocopias-bolivia271.netlify.app`.

> **Opcional**: Para cambiar el nombre de la URL, en Netlify vas a *Site configuration → Change site name*.

---

## PASO 6 — Habilitar el dominio en el Script (CORS)

Después de tener tu URL de Netlify, abrí `backend-v2.gs` y actualizá:

```javascript
const ALLOWED_ORIGINS = [
  "https://fotocopias-bolivia271.netlify.app",  // ← tu URL de Netlify
  "http://localhost:5500",
];
```

Volvé a hacer una **nueva implementación** del Script (Implementar → Administrar implementaciones → Editar).

---

## ✅ Verificación Final

Probá que todo funcione:

- [ ] Abrí tu web y calculá un presupuesto
- [ ] Completá el formulario de encargue
- [ ] Subí un archivo de prueba
- [ ] Confirmá el pedido
- [ ] Verificá que llegó el pedido a tu Google Sheet
- [ ] Verificá que recibiste el mensaje en Telegram
- [ ] Verificá que recibiste el email
- [ ] Entrá a tu Google Drive y buscá el archivo (debe estar en la carpeta privada)

---

## 🔒 Checklist de Seguridad

- [x] API Key secreta — nadie puede llamar al backend sin ella
- [x] Archivos en Drive privados — no compartidos públicamente
- [x] Rate limiting — máx 5 pedidos por IP cada 24 horas
- [x] Validación de campos en el frontend Y en el backend
- [x] Sanitización de nombres de archivo (anti-inyección)
- [x] HTTPS en todo el tráfico (Netlify + Google Apps Script)

---

## ❓ Preguntas frecuentes

**¿Qué pasa si alguien me manda un archivo malicioso?**
El script solo acepta extensiones PDF, DOC, DOCX, JPG, PNG. Cualquier otro tipo es rechazado.

**¿Los archivos de mis clientes son seguros?**
Sí. Van a tu Google Drive en una carpeta privada. Solo vos podés verlos con tu cuenta de Google.

**¿Cómo actualizo los precios?**
Editá la celda D3:D6 de tu Google Sheet "Lista-de-Precios". La web los lee automáticamente.

**¿Puedo tener un dominio propio como `fotocopias.com`?**
Sí, podés comprar un dominio en [namecheap.com](https://namecheap.com) (~$12/año) y conectarlo a Netlify gratis.
