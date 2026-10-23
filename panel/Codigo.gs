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

const CAMPOS = ["nombre", "precio", "colores", "stock", "foto1", "foto2", "foto3", "link_mercadopago", "visible"];


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

// { nombre: númeroDeColumna, ... } a partir de los títulos de la fila 1
function columnas_(sh) {
  const titulos = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const col = {};
  titulos.forEach((t, i) => { col[String(t).trim().toLowerCase()] = i + 1; });
  return col;
}

function cargarPanel() {
  const sh = hoja_();
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
  return { vestidos, sitio: SITIO_URL };
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
    const col = columnas_(sh);
    const fila = v.fila ? Number(v.fila) : filaNueva_(sh, col);
    if (v.fila && String(sh.getRange(fila, col.nombre).getValue()).trim() !== String(v.nombreOriginal || "").trim()) {
      throw new Error("La planilla cambió mientras editabas. Volvé a abrir el vestido y probá de nuevo.");
    }
    const valores = {
      nombre,
      precio,
      colores: String(v.colores || "").trim(),
      stock: Math.max(0, parseInt(v.stock, 10) || 0),
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
