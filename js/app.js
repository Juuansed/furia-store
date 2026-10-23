/* =========================================================
   FURIA STORE — CONFIGURACIÓN
   Estas son las únicas líneas que hace falta tocar.
   ========================================================= */

// 👉 LINK DE LA PLANILLA DE GOOGLE SHEETS (publicada como CSV)
//    En la planilla: Archivo > Compartir > Publicar en la web >
//    elegí la hoja > "Valores separados por comas (.csv)" > Publicar.
//    Copiá el link que te da Google y pegalo entre las comillas.
//    Ejemplo: "https://docs.google.com/spreadsheets/d/e/2PACX-xxxx/pub?output=csv"
//    Si queda vacío o no carga, se muestran los vestidos de ejemplo.
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSQdI1Clk1KDl3SxOKm087CXEXvJVr1wMBvxKSprf1QS24P4ccviaw5S9VYbU2-PQJ7F-CT5PDHEOLm/pub?gid=0&single=true&output=csv";

// 👉 WHATSAPP: 549 + código de área sin 0 + número sin 15. Ej: 5491123456789
const WHATSAPP_NUMERO = "5491123866890";

// 👉 INSTAGRAM: el usuario, sin @
const INSTAGRAM_USUARIO = "furiastore";


/* =========================================================
   Vestidos de ejemplo (se muestran si la planilla no carga).
   Mismas columnas que la planilla.
   ========================================================= */
const VESTIDOS_EJEMPLO = [
  { id: "1", nombre: "Alba",       precio: "85000",  colores: "Champagne",               talles: "S:2, M:2, L:1",     stock: "5", foto1: "", foto2: "", foto3: "", link_mercadopago: "https://mpago.la/ejemplo-alba",       visible: "SI" },
  { id: "2", nombre: "Medianoche", precio: "98000",  colores: "Negro",                   talles: "XS:1, S:1, M:0",    stock: "2", foto1: "", foto2: "", foto3: "", link_mercadopago: "https://mpago.la/ejemplo-medianoche", visible: "SI" },
  { id: "3", nombre: "Esmeralda",  precio: "112000", colores: "Verde esmeralda",         talles: "S:1, M:1, L:1, XL:1", stock: "4", foto1: "", foto2: "", foto3: "", link_mercadopago: "",                                    visible: "SI" },
  { id: "4", nombre: "Rubí",       precio: "76000",  colores: "Rojo, Bordó",             talles: "M:1, L:0",          stock: "1", foto1: "", foto2: "", foto3: "", link_mercadopago: "https://mpago.la/ejemplo-rubi",       visible: "SI" },
  { id: "5", nombre: "Ónix",       precio: "145000", colores: "Negro, Plateado",         talles: "S:0, M:0",          stock: "0", foto1: "", foto2: "", foto3: "", link_mercadopago: "https://mpago.la/ejemplo-onix",       visible: "SI" },
  { id: "6", nombre: "Bruma",      precio: "69000",  colores: "Azul noche",              talles: "XS:2, S:2, M:1, L:1", stock: "6", foto1: "", foto2: "", foto3: "", link_mercadopago: "https://mpago.la/ejemplo-bruma",      visible: "SI" },
  { id: "7", nombre: "Perla",      precio: "128000", colores: "Blanco perla, Champagne", talles: "S:1, M:1, L:1",     stock: "3", foto1: "", foto2: "", foto3: "", link_mercadopago: "",                                    visible: "SI" },
  { id: "8", nombre: "Aurora",     precio: "92000",  colores: "Dorado",                  talles: "M:1, L:1, XL:0",    stock: "2", foto1: "", foto2: "", foto3: "", link_mercadopago: "https://mpago.la/ejemplo-aurora",     visible: "SI" },
];


/* =========================================================
   De acá para abajo no hace falta tocar nada.
   ========================================================= */

const STOCK_LABEL = { disponible: "Disponible", ultimas: "Últimas unidades", agotado: "Agotado" };
const TALLE_ORDEN = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "3XL", "4XL", "UNICO", "TALLE UNICO"];
const COLOR_HEX = [
  ["negro", "#141414"], ["esmeralda", "#0f5e45"], ["perla", "#e8e2d4"], ["marfil", "#ece4d2"],
  ["blanco", "#efebe3"], ["champagne", "#d8c29d"], ["champan", "#d8c29d"], ["dorado", "#c8a55a"],
  ["oro", "#c8a55a"], ["plateado", "#bfc1c6"], ["plata", "#bfc1c6"], ["bordo", "#5e1624"],
  ["vino", "#5e1624"], ["rojo", "#a8152b"], ["fucsia", "#c0246b"], ["rosa", "#d9a1ad"],
  ["nude", "#d4b09a"], ["beige", "#d9c7a8"], ["lila", "#a68fc6"], ["violeta", "#5d3d8a"],
  ["verde", "#2d5a3d"], ["celeste", "#9fc3df"], ["azul", "#1c2950"], ["gris", "#6f6f72"],
  ["marron", "#5a3b2a"], ["chocolate", "#4a2c20"], ["cobre", "#b06a3c"], ["naranja", "#d0612a"],
  ["amarillo", "#e2c044"],
];

const state = {
  products: [],
  filters: { talles: new Set(), colores: new Set(), min: null, max: null },
  current: null,
  talle: null,
  openedHere: false,
};

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

/* ---------- Utilidades ---------- */

function norm(s) {
  return String(s ?? "").trim().toLowerCase()
    .normalize("NFD").replace(/\p{M}/gu, "")
    .replace(/\s+/g, "_");
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function splitList(s) {
  return String(s ?? "").split(/[,;]/).map(x => x.trim()).filter(Boolean);
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const pesos = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
function formatPrecio(n) {
  return n ? pesos.format(n).replace(/\s/g, "") : "Consultar";
}

function parsePrecio(v) {
  // Acepta "85000", "85.000", "$85.000" o "85000,50"
  const limpio = String(v ?? "").replace(/[^\d,]/g, "").replace(",", ".");
  const n = Math.round(Number(limpio));
  return Number.isFinite(n) ? n : 0;
}

function parseStock(v) {
  const t = String(v ?? "").trim();
  if (t === "") return null;               // vacío = se muestra Disponible
  const n = parseInt(t.replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

function stockState(n) {
  if (n === null) return "disponible";
  if (n <= 0) return "agotado";
  if (n <= 2) return "ultimas";
  return "disponible";
}

function colorHex(nombre) {
  const k = norm(nombre);
  const hit = COLOR_HEX.find(([key]) => k.includes(key));
  return hit ? hit[1] : "#8a857d";
}

function talleRank(t) {
  const i = TALLE_ORDEN.indexOf(norm(t).replace(/_/g, " ").toUpperCase());
  if (i >= 0) return i;
  const n = parseFloat(t);
  return Number.isFinite(n) ? 100 + n : 1000;
}

// "S:2, M:0, L:1" → [{ talle: "S", stock: 2 }, …]. Sin número ("S, M") = disponible, sin cantidad.
function parseTalles(s) {
  return splitList(s).map(item => {
    const [t, n] = item.split(":").map(x => x.trim());
    const stock = n === undefined || n === "" ? null : parseStock(n);
    return { talle: t.toUpperCase(), stock };
  }).filter(x => x.talle).sort((a, b) => talleRank(a.talle) - talleRank(b.talle));
}

function waLink(msg) {
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(msg)}`;
}

function mensajeVestido(p, talle) {
  return talle
    ? `Hola, me interesa el vestido ${p.nombre} en talle ${talle}`
    : `Hola, me interesa el vestido ${p.nombre}`;
}

/* ---------- Fotos: Google Drive → imagen directa ---------- */

// Convierte links de "compartir" de Drive en un link de imagen que se puede mostrar.
// Acepta: drive.google.com/file/d/ID/view?usp=sharing, drive.google.com/open?id=ID,
// drive.google.com/uc?id=ID, docs.google.com/uc?export=view&id=ID, etc.
// Cualquier otro link (por ejemplo de Instagram o de otro hosting) se usa tal cual.
function driveId(url) {
  if (!/(drive|docs)\.google\.com|googleusercontent\.com/.test(url)) return null;
  const m = url.match(/\/d\/([\w-]{15,})/) || url.match(/[?&]id=([\w-]{15,})/);
  return m ? m[1] : null;
}

function fotoDesdeLink(url) {
  url = String(url ?? "").trim();
  if (!url) return null;
  const id = driveId(url);
  if (id) return { src: `https://lh3.googleusercontent.com/d/${id}=w1200`, drive: id };
  return { src: url, drive: null };
}

// Si una foto no carga: 1) prueba el otro formato de Drive, 2) muestra un dibujo de reemplazo.
document.addEventListener("error", e => {
  const img = e.target;
  if (!(img instanceof HTMLImageElement)) return;
  if (img.dataset.drive && !img.dataset.retry) {
    img.dataset.retry = "1";
    img.src = `https://drive.google.com/thumbnail?id=${img.dataset.drive}&sz=w1200`;
  } else if (img.dataset.ph) {
    const ph = img.dataset.ph;
    delete img.dataset.ph;
    img.src = ph;
  }
}, true);

// Dibujo elegante de un vestido en el color del producto (para ejemplo o si falta la foto).
function placeholderSVG(hex, variante = 0) {
  const fondo = ["#2b2723", "#25221f", "#302b26"][variante % 3];
  const bodice = "M134 62 Q150 80 166 62 L172 64 L176 132 Q150 142 124 132 L128 64 Z";
  const falda = variante === 1
    ? "M124 132 Q150 142 176 132 Q186 220 172 284 Q198 326 224 362 Q150 376 76 362 Q102 326 128 284 Q114 220 124 132 Z"
    : "M124 132 Q150 142 176 132 Q204 232 238 356 Q150 376 62 356 Q96 232 124 132 Z";
  const zoom = variante === 2 ? ' transform="translate(150 150) scale(1.9) translate(-150 -112)"' : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400">
    <defs>
      <radialGradient id="bg" cx="50%" cy="36%" r="78%"><stop offset="0" stop-color="${fondo}"/><stop offset="1" stop-color="#0a0a0a"/></radialGradient>
      <linearGradient id="sh" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".5"/><stop offset=".45" stop-color="#fff" stop-opacity=".14"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></linearGradient>
    </defs>
    <rect width="300" height="400" fill="url(#bg)"/>
    <g${zoom}>
      <path d="M150 40 q0-12 8-12 q7 0 7 7 q0 5-7 8 M114 60 L150 42 L186 60" fill="none" stroke="#c8a24e" stroke-opacity=".5" stroke-width="1.4"/>
      <path d="M131 64 L140 50 M169 64 L160 50" stroke="${hex}" stroke-width="2"/>
      <g stroke="#c8a24e" stroke-opacity=".35" stroke-width=".8">
        <path d="${falda}" fill="${hex}"/><path d="${falda}" fill="url(#sh)"/>
        <path d="${bodice}" fill="${hex}"/><path d="${bodice}" fill="url(#sh)"/>
      </g>
    </g>
  </svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.replace(/\s{2,}/g, " "));
}

/* ---------- Planilla CSV ---------- */

function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(v => v.trim() !== ""));
}

function csvUrl() {
  const u = new URL(CSV_URL.trim());
  // Por si se pegó el link de "página web" en vez del de CSV
  if (u.pathname.endsWith("/pubhtml")) u.pathname = u.pathname.replace(/\/pubhtml$/, "/pub");
  if (u.pathname.endsWith("/pub")) u.searchParams.set("output", "csv");
  return u.toString();
}

async function cargarPlanilla() {
  if (!CSV_URL.trim()) throw new Error("No hay link de planilla cargado");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(csvUrl(), { cache: "no-store", signal: ctrl.signal });
    if (!res.ok) throw new Error(`La planilla respondió ${res.status}`);
    const text = (await res.text()).replace(/^﻿/, "");
    if (text.trim().startsWith("<")) throw new Error("El link no es un CSV publicado");
    const [head, ...rows] = parseCSV(text);
    const keys = (head || []).map(norm);
    if (!keys.includes("nombre")) throw new Error("No se encontró la columna 'nombre'");
    return rows.map(r => Object.fromEntries(keys.map((k, i) => [k, r[i] ?? ""])));
  } finally {
    clearTimeout(timer);
  }
}

function normalizarFila(raw, i) {
  const fila = {};
  for (const [k, v] of Object.entries(raw)) fila[norm(k)] = String(v ?? "").trim();
  const nombre = fila.nombre;
  if (!nombre) return null;

  const fotoKeys = Object.keys(fila).filter(k => /^foto/.test(k)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const mpKey = Object.keys(fila).find(k => k.includes("mercado") || k === "link" || k === "link_pago");
  const talles = parseTalles(fila.talles);
  // Si los talles tienen cantidades, el stock total es la suma; si no, se usa la columna stock
  const conCantidad = talles.filter(t => t.stock !== null);
  const stock = conCantidad.length ? conCantidad.reduce((s, t) => s + t.stock, 0) : parseStock(fila.stock);
  const colores = splitList(fila.colores).map(capitalize);

  return {
    id: fila.id || norm(nombre) || String(i + 1),
    nombre,
    precio: parsePrecio(fila.precio),
    talles,
    tallesDisponibles: talles.filter(t => t.stock !== 0).map(t => t.talle),
    colores,
    stock,
    estado: stockState(stock),
    fotos: fotoKeys.map(k => fotoDesdeLink(fila[k])).filter(Boolean),
    mp: /^https?:\/\//i.test(fila[mpKey] || "") ? fila[mpKey] : "",
    visible: norm(fila.visible) !== "no",
    hex: colorHex(colores[0] || ""),
  };
}

/* ---------- Render: catálogo ---------- */

function fotosDe(p) {
  const placeholders = [0, 1, 2].map(v => placeholderSVG(p.hex, v));
  if (!p.fotos.length) return placeholders.map(src => ({ src, drive: null, ph: null }));
  return p.fotos.map((f, i) => ({ ...f, ph: placeholders[i % 3] }));
}

function imgTag(f, alt, eager = false) {
  return `<img src="${esc(f.src)}" alt="${esc(alt)}" loading="${eager ? "eager" : "lazy"}" decoding="async"`
    + (f.drive ? ` data-drive="${esc(f.drive)}"` : "")
    + (f.ph ? ` data-ph="${esc(f.ph)}"` : "")
    + `>`;
}

function badge(p) {
  return `<span class="badge badge--${p.estado}">${STOCK_LABEL[p.estado]}</span>`;
}

function pasaFiltros(p) {
  const f = state.filters;
  if (f.talles.size && !p.tallesDisponibles.some(t => f.talles.has(t))) return false;
  if (f.colores.size && !p.colores.some(c => f.colores.has(norm(c)))) return false;
  if (f.min !== null && p.precio < f.min) return false;
  if (f.max !== null && p.precio > f.max) return false;
  return true;
}

function filtrosActivos() {
  const f = state.filters;
  return f.talles.size + f.colores.size + (f.min !== null ? 1 : 0) + (f.max !== null ? 1 : 0);
}

function renderGrid() {
  const grid = $("#grid"), empty = $("#empty");
  const lista = state.products
    .filter(pasaFiltros)
    .sort((a, b) => (a.estado === "agotado") - (b.estado === "agotado"));

  grid.innerHTML = lista.map((p, i) => `
    <article class="card" data-stock="${p.estado}">
      <button class="card-link" type="button" data-id="${esc(p.id)}" aria-label="Ver ${esc(p.nombre)}">
        <div class="card-media">${imgTag(fotosDe(p)[0], p.nombre, i < 4)}${badge(p)}</div>
        <div class="card-body">
          <h3 class="card-name">${esc(p.nombre)}</h3>
          <p class="card-price">${formatPrecio(p.precio)}</p>
          ${p.tallesDisponibles.length ? `<p class="card-sizes">${p.tallesDisponibles.map(esc).join(" · ")}</p>` : ""}
        </div>
      </button>
    </article>`).join("");
  grid.setAttribute("aria-busy", "false");

  const n = lista.length;
  $("#resultCount").textContent = `${n} ${n === 1 ? "vestido" : "vestidos"}`;
  $("#filtersApply").textContent = n ? `Ver ${n} ${n === 1 ? "vestido" : "vestidos"}` : "Sin resultados";

  const activos = filtrosActivos();
  $("#filtersBadge").hidden = !activos;
  $("#filtersBadge").textContent = activos;
  $("#filtersClearInline").hidden = !activos;

  empty.hidden = n > 0;
  if (!n) {
    empty.innerHTML = state.products.length
      ? `<p>No hay vestidos con esos filtros.</p><button class="btn btn-ghost" type="button" data-clear>Limpiar filtros</button>`
      : `<p>Estamos preparando la nueva colección.</p><a class="btn btn-accent" href="${waLink("Hola! Quería consultar por los vestidos disponibles.")}" target="_blank" rel="noopener">Consultar por WhatsApp</a>`;
  }
}

function renderFiltros() {
  const talles = [...new Set(state.products.flatMap(p => p.tallesDisponibles))].sort((a, b) => talleRank(a) - talleRank(b));
  $("#fTallesGrupo").hidden = !talles.length;
  $("#fTalles").innerHTML = talles.map(t =>
    `<button class="chip" type="button" data-talle="${esc(t)}" aria-pressed="${state.filters.talles.has(t)}">${esc(t)}</button>`).join("");

  const colores = new Map();
  state.products.forEach(p => p.colores.forEach(c => { if (!colores.has(norm(c))) colores.set(norm(c), c); }));

  $("#fColores").innerHTML = [...colores].map(([k, c]) =>
    `<button class="chip" type="button" data-color="${esc(k)}" aria-pressed="${state.filters.colores.has(k)}"><span class="swatch" style="background:${colorHex(c)}"></span>${esc(c)}</button>`).join("");

  const precios = state.products.map(p => p.precio).filter(Boolean);
  if (precios.length) {
    $("#fMin").placeholder = formatPrecio(Math.min(...precios));
    $("#fMax").placeholder = formatPrecio(Math.max(...precios));
  }
}

function limpiarFiltros() {
  state.filters = { talles: new Set(), colores: new Set(), min: null, max: null };
  $("#fMin").value = ""; $("#fMax").value = "";
  renderFiltros();
  renderGrid();
}

/* ---------- Render: detalle ---------- */

function renderDetalle() {
  const p = state.current;
  const fotos = fotosDe(p);
  const puedePagar = p.mp && p.estado !== "agotado";
  const pide = p.tallesDisponibles.length > 1 ? " data-needs-talle" : "";

  const acciones = puedePagar
    ? `<a class="btn btn-accent" href="${esc(p.mp)}" target="_blank" rel="noopener"${pide}>Comprar con Mercado Pago</a>
       <a class="btn btn-ghost" data-wa-producto target="_blank" rel="noopener"${pide}>
         <svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><use href="#ico-wa"/></svg>Consultar por WhatsApp</a>`
    : `<a class="btn btn-accent" data-wa-producto target="_blank" rel="noopener">
         <svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><use href="#ico-wa"/></svg>Consultar por WhatsApp</a>`;

  const talles = p.talles.length ? `
    <div class="sizes">
      <p class="detail-label">Talle <em>Elegí tu talle</em></p>
      <div class="chips">${p.talles.map(t => t.stock === 0
        ? `<button class="chip chip--sin" type="button" disabled title="Sin stock">${esc(t.talle)}</button>`
        : `<button class="chip" type="button" data-pick-talle="${esc(t.talle)}" aria-pressed="${state.talle === t.talle}">${esc(t.talle)}</button>`).join("")}</div>
      <p class="size-note" id="sizeNote"></p>
    </div>` : "";

  const nota = puedePagar
    ? "Después de pagar, mandanos el comprobante por WhatsApp con tu talle y coordinamos el retiro en el local."
    : p.estado === "agotado"
      ? "Este modelo está agotado por ahora. Escribinos y te avisamos si vuelve a entrar o te mostramos opciones similares."
      : "Escribinos por WhatsApp y te confirmamos disponibilidad y formas de pago.";

  $("#detailBody").innerHTML = `
    <div class="gallery">
      <div class="slides">${fotos.map((f, i) => imgTag(f, `${p.nombre}, foto ${i + 1}`, i === 0)).join("")}</div>
      ${fotos.length > 1 ? `
        <button class="gal-arrow gal-prev" type="button" aria-label="Foto anterior"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>
        <button class="gal-arrow gal-next" type="button" aria-label="Foto siguiente"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button>
        <div class="dots">${fotos.map((_, i) => `<button type="button" aria-label="Foto ${i + 1}" aria-current="${i === 0}"></button>`).join("")}</div>` : ""}
    </div>
    <div class="detail-info">
      ${badge(p)}
      <h2 class="detail-name">${esc(p.nombre)}</h2>
      <p class="detail-price">${formatPrecio(p.precio)}</p>
      ${p.colores.length ? `<p class="detail-meta">Color: <strong>${p.colores.map(esc).join(", ")}</strong></p>` : ""}
      ${talles}
      <div class="detail-actions">${acciones}</div>
      <p class="detail-note">${nota}</p>
    </div>`;

  actualizarTalle();
}

function actualizarTalle() {
  const p = state.current, body = $("#detailBody");
  $$("[data-wa-producto]", body).forEach(a => { a.href = waLink(mensajeVestido(p, state.talle)); });
  $$("[data-pick-talle]", body).forEach(b => b.setAttribute("aria-pressed", b.dataset.pickTalle === state.talle));
  const elegido = p.talles.find(t => t.talle === state.talle);
  const note = $("#sizeNote", body);
  if (note) note.textContent = elegido && elegido.stock !== null && elegido.stock <= 2
    ? (elegido.stock === 1 ? `Queda 1 en talle ${elegido.talle}` : `Quedan ${elegido.stock} en talle ${elegido.talle}`)
    : "";
  if (state.talle) $(".sizes", body)?.classList.remove("need");
}

function abrirDetalle(p) {
  const dlg = $("#detail");
  state.current = p;
  // Talle preseleccionado: si hay uno solo disponible, o si filtraste por un talle que este vestido tiene
  const filtrados = [...state.filters.talles].filter(t => p.tallesDisponibles.includes(t));
  state.talle = p.tallesDisponibles.length === 1 ? p.tallesDisponibles[0] : filtrados.length === 1 ? filtrados[0] : null;
  renderDetalle();
  if (!dlg.open) dlg.showModal();
  document.documentElement.classList.add("lock");
  $("#detailBody").scrollTop = 0;
  document.title = `${p.nombre} · Furia Store`;
}

function ocultarDetalle() {
  const dlg = $("#detail");
  if (dlg.open) dlg.close();
  document.documentElement.classList.remove("lock");
  state.current = null;
  state.openedHere = false;
  document.title = "Furia Store · Vestidos de fiesta en Pacheco";
}

function cerrarDetalle() {
  if (state.openedHere) history.back();   // vuelve atrás y el hashchange lo cierra
  else {
    history.replaceState(null, "", location.pathname + location.search + "#catalogo");
    ocultarDetalle();
  }
}

// El detalle usa la dirección (#vestido/ID): así el botón "atrás" del celu lo cierra
// y se puede compartir el link de un vestido.
function route() {
  const m = location.hash.match(/^#vestido\/(.+)$/);
  const p = m && state.products.find(x => x.id === decodeURIComponent(m[1]));
  if (p) abrirDetalle(p);
  else if (state.current) ocultarDetalle();
}

/* ---------- Eventos ---------- */

function conectarEventos() {
  // Abrir un vestido
  $("#grid").addEventListener("click", e => {
    const btn = e.target.closest("[data-id]");
    if (!btn) return;
    state.openedHere = true;
    location.hash = `vestido/${encodeURIComponent(btn.dataset.id)}`;
  });
  $("#empty").addEventListener("click", e => { if (e.target.closest("[data-clear]")) limpiarFiltros(); });

  // Detalle
  const dlg = $("#detail");
  $(".detail-close").addEventListener("click", cerrarDetalle);
  dlg.addEventListener("cancel", e => { e.preventDefault(); cerrarDetalle(); });
  dlg.addEventListener("click", e => { if (e.target === dlg) cerrarDetalle(); });
  $("#detailBody").addEventListener("click", e => {
    const pick = e.target.closest("[data-pick-talle]");
    if (pick) { state.talle = pick.dataset.pickTalle; actualizarTalle(); return; }

    const needs = e.target.closest("[data-needs-talle]");
    if (needs && !state.talle) {
      e.preventDefault();
      const sizes = $(".sizes", $("#detailBody"));
      sizes.classList.remove("need"); void sizes.offsetWidth; sizes.classList.add("need");
      sizes.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const slides = $(".slides", $("#detailBody"));
    const dot = e.target.closest(".dots button");
    if (dot) slides.scrollTo({ left: [...dot.parentNode.children].indexOf(dot) * slides.clientWidth, behavior: "smooth" });
    if (e.target.closest(".gal-prev")) slides.scrollBy({ left: -slides.clientWidth, behavior: "smooth" });
    if (e.target.closest(".gal-next")) slides.scrollBy({ left: slides.clientWidth, behavior: "smooth" });
  });
  $("#detailBody").addEventListener("scroll", e => {
    if (!e.target.classList?.contains("slides")) return;
    const i = Math.round(e.target.scrollLeft / e.target.clientWidth);
    $$(".dots button", $("#detailBody")).forEach((d, j) => d.setAttribute("aria-current", i === j));
  }, true);

  // Filtros
  const sheet = $("#filters");
  $("#filtersOpen").addEventListener("click", () => { sheet.showModal(); document.documentElement.classList.add("lock"); });
  sheet.addEventListener("close", () => document.documentElement.classList.remove("lock"));
  sheet.addEventListener("click", e => {
    if (e.target === sheet || e.target.closest("[data-close]")) { sheet.close(); return; }
    const t = e.target.closest("[data-talle]"), c = e.target.closest("[data-color]");
    if (t) toggle(state.filters.talles, t.dataset.talle, t);
    if (c) toggle(state.filters.colores, c.dataset.color, c);
  });
  $("#filtersClear").addEventListener("click", limpiarFiltros);
  $("#filtersClearInline").addEventListener("click", limpiarFiltros);

  let t;
  const precio = () => {
    clearTimeout(t);
    t = setTimeout(() => {
      const v = el => (el.value === "" ? null : Number(el.value));
      state.filters.min = v($("#fMin"));
      state.filters.max = v($("#fMax"));
      renderGrid();
    }, 250);
  };
  $("#fMin").addEventListener("input", precio);
  $("#fMax").addEventListener("input", precio);

  window.addEventListener("hashchange", route);
}

function toggle(set, value, btn) {
  set.has(value) ? set.delete(value) : set.add(value);
  btn.setAttribute("aria-pressed", set.has(value));
  renderGrid();
}

function conectarLinksFijos() {
  $$("[data-wa]").forEach(a => {
    a.href = waLink(a.dataset.waMsg || "Hola! Quería hacer una consulta sobre los vestidos.");
    a.target = "_blank";
    a.rel = "noopener";
  });
  $$("[data-ig]").forEach(a => { a.href = `https://instagram.com/${INSTAGRAM_USUARIO}`; });
  $$("[data-ig-text]").forEach(s => { s.textContent = `@${INSTAGRAM_USUARIO}`; });
  $("#year").textContent = new Date().getFullYear();
}

/* ---------- Inicio ---------- */

async function init() {
  conectarLinksFijos();
  conectarEventos();

  let filas, ejemplo = false;
  try {
    filas = await cargarPlanilla();
  } catch (err) {
    console.warn("Furia Store: usando vestidos de ejemplo →", err.message);
    filas = VESTIDOS_EJEMPLO;
    ejemplo = true;
  }

  state.products = filas.map(normalizarFila).filter(p => p && p.visible);
  // El id lo numera la planilla sola; por las dudas, si se repite, se le agrega un sufijo
  const vistos = new Set();
  state.products.forEach(p => {
    let id = p.id, n = 2;
    while (vistos.has(id)) id = `${p.id}-${n++}`;
    vistos.add(p.id = id);
  });

  if (ejemplo) {
    const n = $("#notice");
    n.textContent = "Estás viendo vestidos de ejemplo. Consultanos por WhatsApp por el stock actual.";
    n.hidden = false;
  }

  renderFiltros();
  renderGrid();
  route();
}

init();
