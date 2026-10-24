/**
 * FURIA STORE — Panel para cargar vestidos
 *
 * Es una pequeña aplicación que vive dentro de la planilla del catálogo.
 * Lee y escribe en la misma hoja que usa la página, y guarda las fotos
 * en una carpeta de Google Drive (compartidas para que se vean en la web).
 */

// 👉 Nombre de la hoja (pestaña) donde están los vestidos
const HOJA = "Hoja 1";

// 👉 Carpeta de Drive donde se guardan las fotos que se suben desde el panel
const CARPETA_FOTOS = "Furia Store - Fotos";

// 👉 Dirección de la página (opcional). Si la ponés, el panel muestra un botón "Ver la página".
const SITIO_URL = "";

// 👉 Pestaña donde se guarda la paleta de colores (se crea sola)
const HOJA_COLORES = "Colores";

const CAMPOS = ["nombre", "precio", "talles", "colores", "colores_hex", "stock", "foto1", "foto2", "foto3", "link_mercadopago", "visible"];

// Colores con los que arranca la paleta la primera vez
const COLORES_INICIALES = [
  ["Negro", "#141414"], ["Blanco", "#f3efe6"], ["Champagne", "#d8c29d"], ["Dorado", "#c8a55a"],
  ["Plateado", "#bfc1c6"], ["Rojo", "#a8152b"], ["Bordó", "#5e1624"], ["Verde esmeralda", "#0f5e45"],
  ["Azul noche", "#1c2950"], ["Nude", "#d4b09a"], ["Rosa", "#d9a1ad"], ["Lila", "#a68fc6"],
];


/* ---------- Página del panel ---------- */

function doGet() {
  return HtmlService.createHtmlOutputFromFile("Panel")
    .setTitle("Furia Store · Panel")
    .addMetaTag("viewport", "width=device-width, initial-scale=1, viewport-fit=cover");
}


/* ---------- Lectura ---------- */

function hoja_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(HOJA) || ss.getSheets()[0];
}

// Si a la planilla le faltan las columnas nuevas ("talles", "colores_hex"), las agrega al final
function asegurarTalles_(sh) {
  ["talles", "colores_hex"].forEach(nombre => {
    const titulos = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(t => String(t).trim().toLowerCase());
    if (!titulos.includes(nombre)) sh.getRange(1, sh.getLastColumn() + 1).setValue(nombre);
  });
}

function norm_(s) {
  return String(s || "").trim().toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

function listaColores_(texto) {
  return String(texto || "").split(/[,;]/).map(x => x.trim()).filter(Boolean);
}

// "S:2, M:0, L:1" → suma de unidades (o null si no hay cantidades)
function sumarTalles_(texto) {
  const cantidades = String(texto || "").split(/[,;]/)
    .map(x => x.split(":")[1]).filter(n => n !== undefined && String(n).trim() !== "")
    .map(n => parseInt(n, 10) || 0);
  return cantidades.length ? cantidades.reduce((a, b) => a + b, 0) : null;
}

// { nombre: númeroDeColumna, ... } a partir de los títulos de la fila 1
function columnas_(sh) {
  const titulos = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const col = {};
  titulos.forEach((t, i) => { col[String(t).trim().toLowerCase()] = i + 1; });
  return col;
}

function cargarPanel() {
  const sh = hoja_();
  asegurarTalles_(sh);
  const col = columnas_(sh);
  const faltan = ["nombre", "precio"].filter(c => !col[c]);
  if (faltan.length) throw new Error("A la planilla le faltan las columnas: " + faltan.join(", "));

  const filas = sh.getMaxRows() - 1;
  const datos = filas > 0 ? sh.getRange(2, 1, filas, sh.getLastColumn()).getValues() : [];
  const vestidos = [];
  datos.forEach((r, i) => {
    const v = { fila: i + 2 };
    CAMPOS.forEach(c => { v[c] = col[c] ? r[col[c] - 1] : ""; });
    if (col.id) v.id = r[col.id - 1];
    if (String(v.nombre).trim()) vestidos.push(v);
  });
  return { vestidos, colores: leerPaleta_(), sitio: SITIO_URL };
}


/* ---------- Paleta de colores ---------- */

// Devuelve la pestaña "Colores"; si no existe la crea con los colores iniciales
function hojaColores_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(HOJA_COLORES);
  if (!sh) {
    sh = ss.insertSheet(HOJA_COLORES);
    sh.getRange(1, 1, 1, 2).setValues([["nombre", "hex"]]).setFontWeight("bold");
    sh.getRange(2, 1, COLORES_INICIALES.length, 2).setValues(COLORES_INICIALES);
    sh.setFrozenRows(1);
  }
  return sh;
}

function leerPaleta_() {
  const sh = hojaColores_();
  const n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, 1, n, 2).getValues()
    .filter(r => String(r[0]).trim())
    .map(r => ({ nombre: String(r[0]).trim(), hex: String(r[1]).trim() || "#8a857d" }));
}

// Agrega un color nuevo o le cambia el tono a uno que ya existe (mismo nombre)
function guardarColor(nombre, hex) {
  nombre = String(nombre || "").trim();
  hex = String(hex || "").trim().toLowerCase();
  if (!nombre) throw new Error("Poné el nombre del color.");
  if (!/^#[0-9a-f]{6}$/.test(hex)) throw new Error("Elegí un color de la paleta.");
  return conLock_(() => {
    const sh = hojaColores_();
    const paleta = leerPaleta_();
    const i = paleta.findIndex(c => norm_(c.nombre) === norm_(nombre));
    if (i >= 0) sh.getRange(i + 2, 2).setValue(hex);
    else sh.appendRow([nombre.charAt(0).toUpperCase() + nombre.slice(1), hex]);
    return leerPaleta_();
  });
}

// Solo se puede quitar un color si ningún vestido publicado (visible) lo usa
function eliminarColor(nombre) {
  return conLock_(() => {
    const sh = hoja_(), col = columnas_(sh);
    const filas = sh.getMaxRows() - 1;
    const datos = sh.getRange(2, 1, filas, sh.getLastColumn()).getValues();
    const usan = datos
      .filter(r => String(r[col.nombre - 1]).trim())
      .filter(r => norm_(r[col.visible - 1]) !== "no")
      .filter(r => listaColores_(r[col.colores - 1]).some(c => norm_(c) === norm_(nombre)))
      .map(r => String(r[col.nombre - 1]).trim());
    if (usan.length) {
      throw new Error(`No se puede quitar "${nombre}": lo usa${usan.length > 1 ? "n" : ""} ${usan.join(", ")}. Cambiá el color de ese vestido u ocultalo primero.`);
    }
    const shc = hojaColores_();
    const paleta = leerPaleta_();
    const i = paleta.findIndex(c => norm_(c.nombre) === norm_(nombre));
    if (i >= 0) shc.deleteRow(i + 2);
    return leerPaleta_();
  });
}


/* ---------- Escritura ---------- */

function conLock_(fn) {
  const lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}

// Primera fila libre después del último vestido (la columna id se numera sola, no se toca)
function filaNueva_(sh, col) {
  const max = sh.getMaxRows();
  const nombres = sh.getRange(2, col.nombre, max - 1, 1).getValues();
  let ultima = 1;
  nombres.forEach((r, i) => { if (String(r[0]).trim()) ultima = i + 2; });
  if (ultima + 1 > max) sh.insertRowAfter(max);
  return ultima + 1;
}

function guardarVestido(v) {
  const nombre = String(v.nombre || "").trim();
  if (!nombre) throw new Error("Falta el nombre del vestido.");
  const precio = Number(String(v.precio).replace(/\D/g, ""));
  if (!precio) throw new Error("Falta el precio.");

  return conLock_(() => {
    const sh = hoja_();
    asegurarTalles_(sh);
    const col = columnas_(sh);
    const fila = v.fila ? Number(v.fila) : filaNueva_(sh, col);
    if (v.fila && String(sh.getRange(fila, col.nombre).getValue()).trim() !== String(v.nombreOriginal || "").trim()) {
      throw new Error("La planilla cambió mientras editabas. Volvé a abrir el vestido y probá de nuevo.");
    }
    const talles = String(v.talles || "").trim();
    const total = sumarTalles_(talles);
    const colores = listaColores_(v.colores);
    const paleta = leerPaleta_();
    const hexDe = c => (paleta.find(p => norm_(p.nombre) === norm_(c)) || {}).hex || "";
    const valores = {
      nombre,
      precio,
      talles,
      colores: colores.join(", "),
      colores_hex: colores.map(hexDe).join(", "),
      stock: total !== null ? total : Math.max(0, parseInt(v.stock, 10) || 0),
      foto1: v.foto1 || "", foto2: v.foto2 || "", foto3: v.foto3 || "",
      link_mercadopago: String(v.link_mercadopago || "").trim(),
      visible: v.visible === false || v.visible === "NO" ? "NO" : "SI",
    };
    CAMPOS.forEach(c => { if (col[c]) sh.getRange(fila, col[c]).setValue(valores[c]); });
    SpreadsheetApp.flush();
    return fila;
  });
}

function cambiarStock(fila, nombre, stock) {
  return conLock_(() => {
    const sh = hoja_(), col = columnas_(sh);
    controlarFila_(sh, col, fila, nombre);
    const n = Math.max(0, parseInt(stock, 10) || 0);
    sh.getRange(fila, col.stock).setValue(n);
    return n;
  });
}

function cambiarVisible(fila, nombre, visible) {
  return conLock_(() => {
    const sh = hoja_(), col = columnas_(sh);
    controlarFila_(sh, col, fila, nombre);
    sh.getRange(fila, col.visible).setValue(visible ? "SI" : "NO");
    return visible;
  });
}

function eliminarVestido(fila, nombre) {
  return conLock_(() => {
    const sh = hoja_(), col = columnas_(sh);
    controlarFila_(sh, col, fila, nombre);
    sh.deleteRow(fila);
    return true;
  });
}

// Evita tocar el vestido equivocado si alguien editó la planilla al mismo tiempo
function controlarFila_(sh, col, fila, nombre) {
  if (String(sh.getRange(fila, col.nombre).getValue()).trim() !== String(nombre).trim()) {
    throw new Error("La planilla cambió. Actualizá el panel y probá de nuevo.");
  }
}


/* ---------- Fotos ---------- */

function carpeta_() {
  const it = DriveApp.getFoldersByName(CARPETA_FOTOS);
  return it.hasNext() ? it.next() : DriveApp.createFolder(CARPETA_FOTOS);
}

// Recibe la foto (ya achicada en el celular) y devuelve el link para la planilla
function subirFoto(base64, nombreArchivo) {
  const blob = Utilities.newBlob(Utilities.base64Decode(base64), "image/jpeg", nombreArchivo || "foto.jpg");
  const archivo = carpeta_().createFile(blob);
  archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return "https://drive.google.com/file/d/" + archivo.getId() + "/view";
}
