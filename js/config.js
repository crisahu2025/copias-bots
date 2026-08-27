// ============================================================
// CONFIGURACIÓN — COPIAS BOTS
// ============================================================

const CONFIG = {
  // URL de tu Google Apps Script (la obtenés después de deployar el script v2)
  BACKEND_URL: "https://script.google.com/macros/s/AKfycbyHdghem8NwEd3okumTSGom8gcxeJfd0QXCucrvPBDesxsLNokreBQKwUSo6YUADAJ0sg/exec",

  // Contacto Telegram del negocio (para el botón de la web)
  TELEGRAM_USERNAME: "CopiasBoliviaBot",

  // WhatsApp del negocio (solo números, sin el +)
  WHATSAPP_NUMBER: "5493364333287",
  WHATSAPP_LINK: "https://wa.me/3364333287?text=Buen%20dia%20Copias%20Bots",

  // Precios de fallback si el backend no responde (en pesos)
  // Estos son los precios que se muestran offline
  PRECIOS_FALLBACK: {
    sBN:  50,    // Simple B&N por hoja
    dBN:  40,    // Doble faz B&N por hoja impresa
    sCol: 200,   // Simple Color por hoja
    dCol: 160,   // Doble faz Color por hoja impresa
  }
};
