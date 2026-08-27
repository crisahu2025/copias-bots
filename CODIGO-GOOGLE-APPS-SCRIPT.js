// ==============================================================================
// SISTEMA DE FOTOCOPIAS — BACKEND EN APPS SCRIPT v8
// Seguridad con PropertiesService + Login de Administrador + CORS JSON
// ==============================================================================

// --- GESTIÓN DINÁMICA DE PROPIEDADES (PROPERTIES SERVICE) ---
function getScriptProp(key, defaultValue) {
  try {
    var props = PropertiesService.getScriptProperties();
    return props.getProperty(key) || defaultValue || "";
  } catch (err) {
    console.warn("No se pudo acceder a ScriptProperties:", err);
    return defaultValue || "";
  }
}

function getSecurityToken() {
  return getScriptProp("SECURITY_TOKEN", "GRAN_REY_SECURE_2026");
}

function getSpreadsheetId() {
  return getScriptProp("SPREADSHEET_ID", "14Eeotx6tT8tv_CsmyuNUlWNsh3mWPxlw3tLouf4RKsY");
}

function getDriveFolderId() {
  return getScriptProp("DRIVE_FOLDER_ID", "1rrJL-qF_n-B322buqKAhfRzb8NSXHqJc");
}

function getAdminEmails() {
  return getScriptProp("ADMIN_EMAILS", "lorena.s.bordon@gmail.com, cris.ahu777@gmail.com");
}

// 🔐 BÓVEDA PRIVADA DE ADMINISTRADORES (Servidores de Google)
var ADMINS_VAULT = {
  "cris.ahu777@gmail.com": "2ae7e37331ac671379c18e7de26274db55c670b922121a0a6017a9d5314635fd",
  "lorena.s.bordon@gmail.com": "8643ee18a0f5c485b74fd2c718644a392f9849d4c4867de04155e19e853cdf92"
};

/**
 * 🔐 CONFIGURACIÓN INICIAL DE CREDENCIALES SEGURAS
 * Ejecutar esta función UNA SOLA VEZ en el editor de Google Apps Script.
 * Almacena las variables privadas de forma segura en Google ScriptProperties.
 */
function CONFIGURAR_CREDENCIALES_SEGURAS() {
  PropertiesService.getScriptProperties().setProperties({
    SECURITY_TOKEN: "GRAN_REY_SECURE_2026",
    SPREADSHEET_ID: "14Eeotx6tT8tv_CsmyuNUlWNsh3mWPxlw3tLouf4RKsY",
    DRIVE_FOLDER_ID: "1rrJL-qF_n-B322buqKAhfRzb8NSXHqJc",
    ADMIN_EMAILS: "lorena.s.bordon@gmail.com, cris.ahu777@gmail.com"
  });
  Logger.log("✅ Propiedades y credenciales de Fotocopias configuradas con éxito en Google Apps Script.");
}

function SETUP_PROPERTIES() {
  CONFIGURAR_CREDENCIALES_SEGURAS();
}

function setCorsHeaders(output) {
  return output.setMimeType(ContentService.MimeType.JSON);
}

function authErrorOutput() {
  return setCorsHeaders(ContentService.createTextOutput(JSON.stringify({
    success: false,
    ok: false,
    error: "No autorizado"
  })));
}

function doOptions(e) {
  return setCorsHeaders(ContentService.createTextOutput(""));
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return setCorsHeaders(ContentService.createTextOutput(JSON.stringify({
        success: false,
        ok: false,
        error: "Sin datos en la solicitud"
      })));
    }

    var data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return setCorsHeaders(ContentService.createTextOutput(JSON.stringify({
        success: false,
        ok: false,
        error: "Formato JSON inválido"
      })));
    }

    var currentSecurityToken = getSecurityToken();
    
    // ==========================================
    // ACCIÓN: AUTENTICACIÓN SEGURA DE ADMIN
    // ==========================================
    if (data.action === "loginAdmin") {
      var email = (data.email || "").trim().toLowerCase();
      var hash  = (data.hash  || "").trim();
      var pass  = (data.pass  || "").trim();

      if (ADMINS_VAULT[email] && (ADMINS_VAULT[email] === hash || ADMINS_VAULT[email] === pass)) {
        return setCorsHeaders(ContentService.createTextOutput(JSON.stringify({
          success: true,
          ok: true,
          token: currentSecurityToken,
          message: "Autenticación exitosa"
        })));
      } else {
        return setCorsHeaders(ContentService.createTextOutput(JSON.stringify({
          success: false,
          ok: false,
          error: "Email o contraseña incorrectos"
        })));
      }
    }

    // ==========================================
    // ACCIÓN: NOTIFICAR CLIENTE (PEDIDO LISTO)
    // ==========================================
    if (data.action === "notificarCliente") {
      if (!data.token || data.token !== currentSecurityToken) {
        return authErrorOutput();
      }
      
      var emailCliente = data.email;
      var nombreCliente = data.nombre || "Cliente";
      var numPedido = data.orderId || "";
      var detalles = data.detalles || "";

      if (!emailCliente || !emailCliente.includes("@")) {
        return setCorsHeaders(ContentService.createTextOutput(JSON.stringify({
          success: false,
          ok: false,
          error: "Email no válido o ausente"
        })));
      }

      var subject = "¡Tu pedido ya está listo para retirar en COPIAS BOTS! 🖨️ (Nº " + numPedido + ")";
      var htmlBody = 
        "<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0f2fe; border-radius: 12px; padding: 24px; background: #ffffff;'>" +
          "<div style='text-align: center; margin-bottom: 20px;'>" +
            "<h2 style='color: #0973AD; margin: 0; font-size: 24px;'>COPIAS BOTS</h2>" +
            "<p style='color: #0369A1; margin: 4px 0 0 0; font-size: 14px;'>Bolivia 271 · San Nicolás de los Arroyos</p>" +
          "</div>" +
          "<div style='background: #f0f9ff; padding: 16px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #0973AD;'>" +
            "<h3 style='color: #0C4A6E; margin: 0 0 8px 0;'>¡Hola " + nombreCliente + "! 🎉</h3>" +
            "<p style='color: #0369A1; margin: 0; font-size: 15px;'>Tu pedido <strong>Nº " + numPedido + "</strong> está <strong>100% listo para retirar</strong> en nuestro local.</p>" +
          "</div>" +
          "<div style='margin-bottom: 20px; color: #334155; font-size: 14px; line-height: 1.6;'>" +
            "<p><strong>Detalles del trabajo:</strong></p>" +
            "<p style='background: #f8fafc; padding: 10px; border-radius: 6px; font-family: monospace; color: #0f172a; border: 1px solid #e2e8f0;'>" + detalles + "</p>" +
            "<p style='margin-top: 15px;'>📍 <strong>Lugar de retiro:</strong> Bolivia 271, Barrio Santa Clara (San Nicolás)</p>" +
            "<p>⏰ <strong>Horarios de atención:</strong> Lunes a Sábados de 8:00 a 20:00 hs</p>" +
            "<p>🔎 Podés consultar el estado de tu pedido en cualquier momento desde nuestra web en la sección <strong>Estado de Pedido</strong> ingresando el Nº <strong>" + numPedido + "</strong>.</p>" +
          "</div>" +
          "<div style='text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;'>" +
            "¡Muchas gracias por confiar en COPIAS BOTS! Te esperamos." +
          "</div>" +
        "</div>";

      MailApp.sendEmail({
        to: emailCliente,
        subject: subject,
        htmlBody: htmlBody
      });

      return setCorsHeaders(ContentService.createTextOutput(JSON.stringify({
        success: true,
        ok: true
      })));
    }

    // ==========================================
    // ACCIÓN: GUARDAR PRECIOS (ADMIN PANEL)
    // ==========================================
    if (data.action === "guardarPrecios") {
      if (!data.token || data.token !== currentSecurityToken) {
        return authErrorOutput();
      }
      var ssId = getSpreadsheetId();
      var ss = SpreadsheetApp.openById(ssId);
      var sheetPrecios = ss.getSheetByName("Lista-de-Precios");
      if (!sheetPrecios) {
        return setCorsHeaders(ContentService.createTextOutput(JSON.stringify({
          success: false,
          ok: false,
          error: "No existe pestaña Lista-de-Precios"
        })));
      }
      
      var lastRow = sheetPrecios.getLastRow();
      if (lastRow > 1) {
        sheetPrecios.getRange(2, 1, lastRow - 1, 4).clearContent();
      }

      var items = data.items || data.productos || [];
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        sheetPrecios.getRange(i + 2, 1, 1, 4).setValues([[i + 1, item.detalle, item.costo, item.publico]]);
      }

      return setCorsHeaders(ContentService.createTextOutput(JSON.stringify({
        success: true,
        ok: true
      })));
    }

    // ==========================================
    // ACCIÓN: NUEVO PEDIDO (PÚBLICO)
    // ==========================================
    var fileUrl = "Sin archivo";
    if (data.fileBase64 && data.fileName) {
      var base64Data = data.fileBase64.split(',')[1] || data.fileBase64;
      var blob = Utilities.newBlob(Utilities.base64Decode(base64Data), data.fileMimeType, data.fileName);
      
      var folderId = getDriveFolderId();
      var folder = DriveApp.getFolderById(folderId);
      var file = folder.createFile(blob);
      
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      fileUrl = file.getUrl();
    }

    var spreadsheetId = getSpreadsheetId();
    var ssPed = SpreadsheetApp.openById(spreadsheetId);
    var sheet = ssPed.getSheetByName("Pedidos");
    if (!sheet) {
      sheet = ssPed.insertSheet("Pedidos");
      sheet.appendRow(["Pedido", "Fecha", "Hojas", "Tipo", "Color", "Anillado", "Nombre", "Celular", "Correo", "Nombre del Archivo", "Link", "Total", "Papel", "Envio", "Notas"]);
    }

    var lastRowPed = sheet.getLastRow();
    // NÚMEROS DE PEDIDO SECUENCIALES A PARTIR DE 100001
    var numPedidoGen = 100000 + (lastRowPed > 1 ? lastRowPed : 1);
    var fechaStr = Utilities.formatDate(new Date(), "America/Argentina/Buenos_Aires", "dd/MM/yyyy HH:mm");

    // ESTRUCTURA DE COLUMNAS A -> O:
    sheet.appendRow([
      numPedidoGen,                            // A: Pedido
      fechaStr,                                // B: Fecha
      data.hojas || "-",                       // C: Hojas
      data.tipo || "-",                        // D: Tipo
      data.color || "-",                       // E: Color
      data.anillado || "-",                    // F: Anillado
      data.nombre || "-",                      // G: Nombre
      data.telefono || "-",                    // H: Celular
      data.email || "-",                       // I: Correo
      data.fileName || "-",                    // J: Nombre del Archivo
      fileUrl,                                 // K: Link
      data.precioTotal || data.total || 0,     // L: Total
      data.papel || "COMUN",                   // M: Papel
      data.envio || "RETIRO",                  // N: Envio
      data.notas || data.detalles || "-"       // O: Notas
    ]);

    // ENVIAR CORREO AL ADMINISTRADOR
    var adminEmails = getAdminEmails();
    var adminSubject = "🚨 NUEVO PEDIDO #" + numPedidoGen + " - " + (data.nombre || "Cliente");
    var adminBody = "Hola Equipo,\n\n" +
      "Ha ingresado un nuevo pedido web COMPLETO (Nº " + numPedidoGen + ").\n\n" +
      "DATOS DEL CLIENTE:\n" +
      "- Nombre: " + (data.nombre || "-") + "\n" +
      "- Celular: " + (data.telefono || "-") + "\n" +
      "- Email: " + (data.email || "-") + "\n\n" +
      "DETALLES DEL PEDIDO:\n" +
      "- Hojas: " + (data.hojas || "-") + "\n" +
      "- Tipo: " + (data.tipo || "-") + " (" + (data.color || "-") + ")\n" +
      "- Papel: " + (data.papel || "Común (75g)") + "\n" +
      "- Anillado: " + (data.anillado || "-") + "\n" +
      "- Modalidad: " + (data.envio || "Retiro en local") + "\n" +
      "- Notas: " + (data.notas || data.detalles || "-") + "\n" +
      "- TOTAL ESTIMADO: $" + (data.precioTotal || data.total || 0) + "\n\n" +
      "LINK DEL ARCHIVO (DRIVE): " + fileUrl + "\n\n" +
      "Atte. El Sistema Web de Copias Bots.";
      
    try {
      MailApp.sendEmail({ to: adminEmails, subject: adminSubject, body: adminBody });
    } catch(errMailAdmin) {
      console.warn("No se pudo enviar mail al admin:", errMailAdmin);
    }

    // ENVIAR CORREO AL CLIENTE (CONFIRMACIÓN INICIAL CON Nº DE PEDIDO)
    if (data.email && data.email.includes("@")) {
      try {
        var clientSubject = "¡Recibimos tu pedido en COPIAS BOTS! 🎉 (Nº " + numPedidoGen + ")";
        var clientBody = "Hola " + (data.nombre || "Cliente") + ",\n\n" +
          "¡Gracias por elegirnos! Tu pedido fue registrado exitosamente con el NÚMERO DE PEDIDO: " + numPedidoGen + ".\n\n" +
          "Resumen de lo que pediste:\n" +
          "- Impresión: " + data.hojas + " hojas, " + data.tipo + " a " + data.color + "\n" +
          "- Tipo de Papel: " + (data.papel || "Común") + "\n" +
          "- Anillado: " + data.anillado + "\n" +
          "- Entrega: " + (data.envio || "Retiro en local") + "\n" +
          "- Total estimado: $" + (data.precioTotal || data.total || 0) + "\n\n" +
          "Podés seguir el estado de tu pedido en tiempo real en nuestra web desde la sección 'Estado de Pedido' ingresando tu número: " + numPedidoGen + ".\n\n" +
          "Te vamos a avisar por correo o WhatsApp apenas esté listo.\n\n" +
          "Un saludo enorme,\nEl equipo de COPIAS BOTS.";
        MailApp.sendEmail({ to: data.email, subject: clientSubject, body: clientBody });
      } catch(errClient) {
        console.warn("No se pudo enviar mail al cliente:", errClient);
      }
    }

    return setCorsHeaders(ContentService.createTextOutput(JSON.stringify({ 
      success: true, 
      ok: true,
      orderId: numPedidoGen,
      fileUrl: fileUrl
    })));

  } catch (error) {
    return setCorsHeaders(ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      ok: false,
      error: error.toString() 
    })));
  }
}

function doGet(e) {
  try {
    if (!e || !e.parameter) {
      return authErrorOutput();
    }

    var action = e.parameter.action;
    var currentSecurityToken = getSecurityToken();
    var ssId = getSpreadsheetId();

    // 1. CONSULTA PÚBLICA DE ESTADO POR Nº DE PEDIDO (SIN TOKEN NECESARIO)
    if (action === "consultarEstado") {
      var numBuscado = String(e.parameter.num || '').replace(/\D/g, '');
      if (!numBuscado) {
        return setCorsHeaders(ContentService.createTextOutput(JSON.stringify({
          success: false,
          ok: false,
          error: "Ingresá un número de pedido válido."
        })));
      }
      var ss = SpreadsheetApp.openById(ssId);
      var sheet = ss.getSheetByName("Pedidos");
      if (!sheet) {
        return setCorsHeaders(ContentService.createTextOutput(JSON.stringify({
          success: false,
          ok: false,
          error: "No hay pedidos registrados."
        })));
      }

      var lastRow = sheet.getLastRow();
      if (lastRow < 2) {
        return setCorsHeaders(ContentService.createTextOutput(JSON.stringify({
          success: false,
          ok: false,
          error: "No hay pedidos registrados."
        })));
      }

      var numCols = sheet.getLastColumn();
      var rows = sheet.getRange(2, 1, lastRow - 1, numCols).getValues();

      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var calcNum = String(100001 + i);
        var rowIdStr = String(row[0] || '');

        if (rowIdStr === numBuscado || calcNum === numBuscado || rowIdStr.includes(numBuscado)) {
          return setCorsHeaders(ContentService.createTextOutput(JSON.stringify({
            success: true,
            ok: true,
            pedido: {
              num: calcNum,
              fecha: row[1] || row[0],
              hojas: row[2] || row[1],
              tipo: row[3] || row[2],
              color: row[4] || row[3],
              anillado: row[5] || row[4],
              nombre: row[6] || row[5],
              celular: row[7] || row[6],
              email: row[8] || row[7],
              total: row[11] || row[10] || 0,
              papel: row[12] || "COMUN",
              envio: row[13] || "RETIRO",
              notas: row[14] || "-"
            }
          })));
        }
      }
      return setCorsHeaders(ContentService.createTextOutput(JSON.stringify({
        success: false,
        ok: false,
        error: "No se encontró el pedido Nº " + numBuscado + ". Verificá el número enviado por mail."
      })));
    }

    // 2. CONSULTA PÚBLICA DE PRECIOS
    if (action === "precios") {
      var ssPrecios = SpreadsheetApp.openById(ssId);
      var sheetPrecios = ssPrecios.getSheetByName("Lista-de-Precios");
      if (!sheetPrecios) {
        return setCorsHeaders(ContentService.createTextOutput(JSON.stringify({
          success: false,
          ok: false,
          error: "No existe pestaña de precios"
        })));
      }

      var lastRowPrecios = sheetPrecios.getLastRow();
      if (lastRowPrecios < 2) {
        return setCorsHeaders(ContentService.createTextOutput(JSON.stringify({
          success: false,
          ok: false,
          error: "No hay precios configurados"
        })));
      }

      var dataPrecios = sheetPrecios.getRange(2, 1, lastRowPrecios - 1, 4).getValues();
      var items = [];
      for (var j = 0; j < dataPrecios.length; j++) {
        var rowP = dataPrecios[j];
        if (rowP[1]) {
          items.push({
            detalle: rowP[1],
            costo: parseFloat(rowP[2]) || 0,
            publico: parseFloat(rowP[3]) || 0
          });
        }
      }

      var basic = {
        sBN: items.length > 0 ? items[0].publico : 55,
        dBN: items.length > 1 ? items[1].publico : 60,
        sCol: items.length > 2 ? items[2].publico : 65,
        dCol: items.length > 3 ? items[3].publico : 70
      };

      return setCorsHeaders(ContentService.createTextOutput(JSON.stringify({
        success: true,
        ok: true,
        precios: { basic: basic, items: items }
      })));
    }

    // 3. ENDPOINTS PROTEGIDOS (REQUIEREN TOKEN)
    if (!e.parameter.token || e.parameter.token !== currentSecurityToken) {
      return authErrorOutput();
    }
    
    // Obtener lista completa de pedidos para el panel admin
    if (action === "getPedidos") {
      var ssAdmin = SpreadsheetApp.openById(ssId);
      var sheetAdmin = ssAdmin.getSheetByName("Pedidos");
      if (!sheetAdmin) {
        return setCorsHeaders(ContentService.createTextOutput(JSON.stringify([])));
      }

      var lastRowAdmin = sheetAdmin.getLastRow();
      if (lastRowAdmin < 2) {
        return setCorsHeaders(ContentService.createTextOutput(JSON.stringify([])));
      }

      var numColsAdmin = sheetAdmin.getLastColumn();
      var rowsAdmin = sheetAdmin.getRange(2, 1, lastRowAdmin - 1, numColsAdmin).getValues();
      var pedidos = rowsAdmin.map(function(row, index) {
        var calcNum = String(100001 + index);

        var fechaVal = row[1];
        var hojasVal = row[2];
        var tipoVal = row[3];
        var colorVal = row[4];
        var aniVal = row[5];
        var nombreVal = row[6];
        var telVal = row[7];
        var emailVal = row[8];
        var fileNombreVal = row[9];
        var fileUrlVal = row[10];
        var totalVal = row[11];
        var papelVal = row[12] || "COMUN";
        var envioVal = row[13] || "RETIRO";
        var notasVal = row[14] || "-";

        return {
          id: calcNum,
          num: calcNum,
          fecha: fechaVal,
          hojas: hojasVal,
          tipo: tipoVal,
          color: colorVal,
          anillado: aniVal,
          nombre: nombreVal,
          telefono: telVal,
          email: emailVal,
          archivo_nombre: fileNombreVal,
          archivo: fileUrlVal,
          precio: totalVal,
          papel: papelVal,
          envio: envioVal,
          notas: notasVal,
          detalles: "Hojas: " + hojasVal + " | " + tipoVal + " (" + colorVal + ") | Papel: " + papelVal + " | Anillado: " + aniVal
        };
      });

      return setCorsHeaders(ContentService.createTextOutput(JSON.stringify(pedidos.reverse())));
    }

    return setCorsHeaders(ContentService.createTextOutput(JSON.stringify({
      success: true,
      ok: true,
      status: "API Fotocopias Activa",
      timestamp: new Date().toISOString()
    })));

  } catch (error) {
    return setCorsHeaders(ContentService.createTextOutput(JSON.stringify({
      success: false,
      ok: false,
      error: error.toString()
    })));
  }
}
