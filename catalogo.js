/* ============================================================
   CATÁLOGO CONECTADO A GOOGLE SHEETS — lógica compartida entre
   index.html y catalogo.html. No hace falta tocar este archivo
   para cargar productos: eso se hace en la planilla de Google.

   Columnas de la planilla (en este orden):
     id | nombre | precio (o valor) | icono | fotos | categoria | activo

   - id: texto corto sin espacios, no se repite (ej: cars-remera)
   - nombre: lo que ve el cliente
   - precio / valor: solo el número, sin puntos ni $
   - icono: un emoji, se usa solo si no hay fotos. Código de íconos:
       👕 remera   🎒 mochila   🧥 campera
       🤿 buzo     🍵 taza      🥻 pijama
       🕶️ antifaz  👝 cartuchera
   - fotos: uno o varios links de imagen separados por coma
     (subir las fotos a imgur.com y pegar los links acá)
   - categoria: camperas / remeras / pijamas / buzos / cartucheras
     / otros — se usa para los filtros del catálogo completo
   - activo: "si" para mostrarlo, "no" para ocultarlo sin borrar
   ============================================================ */

const SHEET_ID = "15vpC3YvaI25eECMmD-r4Gq-Izj2iRjz61GJ2LiV9hys";
const SHEET_GID = "963834391";

const NUMERO_WHATSAPP = "5491124929009"; // 👈 cambiar acá si cambia el número de contacto

const CATEGORIAS = [
  { valor: "camperas",    etiqueta: "Camperas" },
  { valor: "remeras",     etiqueta: "Remeras" },
  { valor: "pijamas",     etiqueta: "Pijamas" },
  { valor: "buzos",       etiqueta: "Buzos" },
  { valor: "cartucheras", etiqueta: "Cartucheras" },
  { valor: "otros",       etiqueta: "Otros" },
];

// Categorías de ropa que piden talle. Mochilas, tazas, cartucheras, etc. no lo necesitan.
const CATEGORIAS_CON_TALLE = ["camperas", "remeras", "buzos", "pijamas"];
const TALLES_DISPONIBLES = [6, 8, 10, 12, 14, 16];

// Productos que se muestran si la planilla todavía no está conectada o falla
const PRODUCTOS_RESPALDO = [
  { id: "amongus-campera",       nombre: "Among Us — Campera de algodón",   precio: 38950, icono: "🧥", fotos: [], categoria: "camperas" },
  { id: "sprunki-campera-capucha", nombre: "Sprunki — Campera de algodón con capucha", precio: 38950, icono: "🧥",
    fotos: ["imagenes/sprunki-campera-capucha-1.jpg","imagenes/sprunki-campera-capucha-2.jpg","imagenes/sprunki-campera-capucha-3.jpg","imagenes/sprunki-campera-capucha-4.jpg"], categoria: "camperas" },
  { id: "cars-campera-capucha",  nombre: "Cars — Campera de algodón con capucha", precio: 31500, icono: "🧥",
    fotos: ["imagenes/cars-campera-capucha-1.jpg","imagenes/cars-campera-capucha-2.jpg","imagenes/cars-campera-capucha-3.jpg","imagenes/cars-campera-capucha-4.jpg","imagenes/cars-campera-capucha-5.jpg"], categoria: "camperas" },
  { id: "dragonball-campera-capucha", nombre: "Dragon Ball — Campera de algodón con capucha", precio: 38950, icono: "🧥",
    fotos: ["imagenes/dragonball-campera-capucha-1.jpg","imagenes/dragonball-campera-capucha-2.jpg","imagenes/dragonball-campera-capucha-3.jpg","imagenes/dragonball-campera-capucha-4.jpg"], categoria: "camperas" },
  { id: "geometrydash-buzo", nombre: "Geometry Dash — Buzo", precio: 34500, icono: "🤿",
    fotos: ["imagenes/geometrydash-buzo-1.jpg","imagenes/geometrydash-buzo-2.jpg","imagenes/geometrydash-buzo-3.jpg"], categoria: "buzos" },
  { id: "guerrerakpop-pijama-antifaz", nombre: "Guerreras K-Pop — Pijama con antifaz", precio: 36500, icono: "🥻",
    fotos: ["imagenes/guerrerakpop-pijama-antifaz-1.jpg","imagenes/guerrerakpop-pijama-antifaz-2.jpg","imagenes/guerrerakpop-pijama-antifaz-3.jpg","imagenes/guerrerakpop-pijama-antifaz-4.jpg","imagenes/guerrerakpop-pijama-antifaz-5.jpg","imagenes/guerrerakpop-pijama-antifaz-6.jpg","imagenes/guerrerakpop-pijama-antifaz-7.jpg"], categoria: "pijamas" },
  { id: "argentinamessi-remera-taza", nombre: "Argentina Messi — Remera + Taza", precio: 32000, icono: "👕",
    fotos: ["imagenes/argentinamessi-remera-taza-1.jpg","imagenes/argentinamessi-remera-taza-2.jpg"], categoria: "remeras" },
  { id: "guerrerakpop-cartuchera-desplegable", nombre: "Guerreras K-Pop — Cartuchera desplegable", precio: 21000, icono: "👝",
    fotos: ["imagenes/guerrerakpop-cartuchera-desplegable-1.jpg","imagenes/guerrerakpop-cartuchera-desplegable-2.jpg"], categoria: "cartucheras" },
  { id: "remera-personalizada",  nombre: "Remera personalizada con nombre", precio: 18000, icono: "👕", fotos: [], categoria: "remeras" },
];

/* ---------- estado ---------- */
let PRODUCTOS = PRODUCTOS_RESPALDO;
let filtroActivo = "todos";
const carrito = cargarCarritoGuardado();
const fotoIndex = {};
const tallaSeleccionada = {}; // { id: talle actualmente elegido en la tarjeta }

function requiereTalle(p){
  return CATEGORIAS_CON_TALLE.includes(p.categoria);
}
function claveCarrito(id, talla){
  return talla ? `${id}__${talla}` : id;
}

function cargarCarritoGuardado(){
  try{
    const guardado = sessionStorage.getItem("carrito-codigo316");
    return guardado ? JSON.parse(guardado) : {};
  } catch(e){ return {}; }
}
function guardarCarrito(){
  try{ sessionStorage.setItem("carrito-codigo316", JSON.stringify(carrito)); } catch(e){}
}

function formatearPrecio(n){
  return "$" + n.toLocaleString("es-AR");
}

function parsearCSV(texto){
  const filas = [];
  let fila = [], campo = "", entreComillas = false;
  for(let i = 0; i < texto.length; i++){
    const c = texto[i];
    if(entreComillas){
      if(c === '"' && texto[i+1] === '"'){ campo += '"'; i++; }
      else if(c === '"'){ entreComillas = false; }
      else { campo += c; }
    } else {
      if(c === '"'){ entreComillas = true; }
      else if(c === ','){ fila.push(campo); campo = ""; }
      else if(c === '\n' || c === '\r'){
        if(campo !== "" || fila.length){ fila.push(campo); filas.push(fila); }
        fila = []; campo = "";
        if(c === '\r' && texto[i+1] === '\n') i++;
      } else { campo += c; }
    }
  }
  if(campo !== "" || fila.length){ fila.push(campo); filas.push(fila); }
  return filas.filter(f => f.length && f.some(v => v.trim() !== ""));
}

async function cargarProductosDesdeSheet(){
  try{
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${SHEET_GID}`;
    const res = await fetch(url);
    if(!res.ok) throw new Error("No se pudo leer la planilla");
    const texto = await res.text();
    const filas = parsearCSV(texto);
    if(filas.length < 2) return;

    const encabezado = filas[0].map(h => h.trim().toLowerCase());
    const idxId = encabezado.indexOf("id");
    const idxNombre = encabezado.indexOf("nombre");
    const idxPrecio = encabezado.indexOf("precio") >= 0 ? encabezado.indexOf("precio") : encabezado.indexOf("valor");
    const idxIcono = encabezado.indexOf("icono");
    const idxFotos = encabezado.indexOf("fotos");
    const idxCategoria = encabezado.indexOf("categoria");
    const idxActivo = encabezado.indexOf("activo");

    const productosPlanilla = filas.slice(1).map(f => ({
      id: (f[idxId] || "").trim(),
      nombre: (f[idxNombre] || "").trim(),
      precio: parseInt((f[idxPrecio] || "0").replace(/[^\d]/g, ""), 10) || 0,
      icono: (f[idxIcono] || "🎁").trim(),
      fotos: idxFotos >= 0 ? (f[idxFotos] || "").split(",").map(u => u.trim()).filter(Boolean) : [],
      categoria: idxCategoria >= 0 ? (f[idxCategoria] || "otros").trim().toLowerCase() : "otros",
      activo: (f[idxActivo] || "si").trim().toLowerCase(),
    })).filter(p => p.id && p.nombre && p.activo !== "no");

    if(productosPlanilla.length){
      PRODUCTOS = productosPlanilla;
    }
  } catch(err){
    console.warn("No se pudo conectar con la planilla, se muestran los productos de respaldo.", err);
  }
}

/* ---------- render de una tarjeta ---------- */
function tarjetaHTML(p){
  const tieneFotos = p.fotos && p.fotos.length > 0;
  fotoIndex[p.id] = fotoIndex[p.id] || 0;

  const contenidoImagen = tieneFotos
    ? `
      <img src="${p.fotos[0]}" class="patch-photo" id="img-${p.id}" alt="${p.nombre}">
      ${p.fotos.length > 1 ? `
        <button class="gal-arrow gal-prev" onclick="cambiarFoto('${p.id}', -1)" aria-label="Foto anterior">‹</button>
        <button class="gal-arrow gal-next" onclick="cambiarFoto('${p.id}', 1)" aria-label="Foto siguiente">›</button>
        <div class="gal-dots" id="dots-${p.id}">
          ${p.fotos.map((_, i) => `<span class="gal-dot${i === 0 ? " active" : ""}" id="dot-${p.id}-${i}"></span>`).join("")}
        </div>
      ` : ""}
    `
    : `
      <span class="ph-icon">${p.icono}</span>
      <span class="ph-label">FOTO PRODUCTO<br>(reemplazar)</span>
    `;

  const usaTalle = requiereTalle(p);
  if(usaTalle && !tallaSeleccionada[p.id]){
    tallaSeleccionada[p.id] = TALLES_DISPONIBLES[0];
  }
  const talla = usaTalle ? tallaSeleccionada[p.id] : null;
  const clave = claveCarrito(p.id, talla);
  const cantidadActual = carrito[clave] || 0;

  const filaTalles = usaTalle ? `
    <div class="talla-row">
      <span class="talla-label">Talle:</span>
      ${TALLES_DISPONIBLES.map(t => `
        <button class="talla-chip${t === talla ? " active" : ""}" id="talla-${p.id}-${t}" onclick="elegirTalla('${p.id}', ${t})">${t}</button>
      `).join("")}
    </div>
  ` : "";

  return `
  <div class="patch-card">
    <div class="patch-img">
      ${contenidoImagen}
    </div>
    <div class="patch-body">
      <h3>${p.nombre}</h3>
      <div class="patch-price">${formatearPrecio(p.precio)}</div>
      ${filaTalles}
      <div class="patch-qty">
        <button class="qty-btn" onclick="cambiarCantidad('${p.id}', -1)">−</button>
        <span class="qty-val" id="qty-${p.id}">${cantidadActual}</span>
        <button class="qty-btn" onclick="cambiarCantidad('${p.id}', 1)">+</button>
      </div>
      <button class="add-btn" id="add-${p.id}" onclick="agregarAlPedido('${p.id}')">Agregar al pedido</button>
    </div>
  </div>`;
}

function elegirTalla(id, talla){
  tallaSeleccionada[id] = talla;
  TALLES_DISPONIBLES.forEach(t => {
    const chip = document.getElementById(`talla-${id}-${t}`);
    if(chip) chip.classList.toggle("active", t === talla);
  });
  const clave = claveCarrito(id, talla);
  const qtyEl = document.getElementById(`qty-${id}`);
  if(qtyEl) qtyEl.textContent = carrito[clave] || 0;
}

/* ---------- render: destacados (home) ---------- */
function renderDestacados(cantidad){
  const grid = document.getElementById("catalogo-grid");
  if(!grid) return;
  grid.innerHTML = PRODUCTOS.slice(0, cantidad).map(tarjetaHTML).join("");
}

/* ---------- render: catálogo completo con filtros ---------- */
function renderCatalogoCompleto(){
  const grid = document.getElementById("catalogo-grid");
  if(!grid) return;

  const visibles = filtroActivo === "todos"
    ? PRODUCTOS
    : PRODUCTOS.filter(p => p.categoria === filtroActivo);

  grid.innerHTML = visibles.length
    ? visibles.map(tarjetaHTML).join("")
    : `<div class="catalogo-empty">Todavía no hay productos cargados en esta categoría.</div>`;
}

function renderFiltros(){
  const cont = document.getElementById("filtros");
  if(!cont) return;

  const categoriasConProductos = CATEGORIAS.filter(c =>
    PRODUCTOS.some(p => p.categoria === c.valor)
  );

  const chips = [{ valor: "todos", etiqueta: "Todos" }, ...categoriasConProductos];

  cont.innerHTML = chips.map(c => `
    <button class="filter-chip${filtroActivo === c.valor ? " active" : ""}" onclick="aplicarFiltro('${c.valor}')">
      ${c.etiqueta}
    </button>
  `).join("");
}

function aplicarFiltro(valor){
  filtroActivo = valor;
  renderFiltros();
  renderCatalogoCompleto();
}

/* ---------- galería de fotos ---------- */
function cambiarFoto(id, delta){
  const producto = PRODUCTOS.find(p => p.id === id);
  if(!producto || !producto.fotos || producto.fotos.length < 2) return;

  const total = producto.fotos.length;
  const actual = fotoIndex[id] || 0;
  const nuevo = (actual + delta + total) % total;
  fotoIndex[id] = nuevo;

  document.getElementById(`img-${id}`).src = producto.fotos[nuevo];
  for(let i = 0; i < total; i++){
    document.getElementById(`dot-${id}-${i}`).classList.toggle("active", i === nuevo);
  }
}

/* ---------- carrito ---------- */
function cambiarCantidad(id, delta){
  const p = PRODUCTOS.find(x => x.id === id);
  if(!p) return;
  const talla = requiereTalle(p) ? (tallaSeleccionada[id] || TALLES_DISPONIBLES[0]) : null;
  const clave = claveCarrito(id, talla);

  const actual = carrito[clave] || 0;
  const nueva = Math.max(0, actual + delta);
  carrito[clave] = nueva;
  guardarCarrito();
  const el = document.getElementById(`qty-${id}`);
  if(el) el.textContent = nueva;
  actualizarBarra();
}

function agregarAlPedido(id){
  const p = PRODUCTOS.find(x => x.id === id);
  if(!p) return;
  const talla = requiereTalle(p) ? (tallaSeleccionada[id] || TALLES_DISPONIBLES[0]) : null;
  const clave = claveCarrito(id, talla);

  if(!carrito[clave] || carrito[clave] === 0){
    cambiarCantidad(id, 1);
  }
  const btn = document.getElementById(`add-${id}`);
  if(btn){
    btn.textContent = "✓ Agregado";
    btn.classList.add("added");
    setTimeout(() => {
      btn.textContent = "Agregar al pedido";
      btn.classList.remove("added");
    }, 1200);
  }
  actualizarBarra();
}

function actualizarBarra(){
  const bar = document.getElementById("cart-bar");
  const info = document.getElementById("cart-info");
  if(!bar || !info) return;

  let cantidadTotal = 0;
  let precioTotal = 0;

  Object.keys(carrito).forEach(clave => {
    const cantidad = carrito[clave] || 0;
    if(cantidad <= 0) return;
    const id = clave.split("__")[0];
    const p = PRODUCTOS.find(x => x.id === id);
    if(!p) return;
    cantidadTotal += cantidad;
    precioTotal += cantidad * p.precio;
  });

  if(cantidadTotal > 0){
    bar.classList.add("visible");
    info.innerHTML = `${cantidadTotal} producto${cantidadTotal > 1 ? "s" : ""} — <strong>${formatearPrecio(precioTotal)}</strong>`;
  } else {
    bar.classList.remove("visible");
  }
}

function vaciarCarrito(){
  Object.keys(carrito).forEach(clave => {
    carrito[clave] = 0;
  });
  PRODUCTOS.forEach(p => {
    const el = document.getElementById(`qty-${p.id}`);
    if(el) el.textContent = 0;
  });
  guardarCarrito();
  actualizarBarra();
}

function enviarPedido(){
  const entradas = Object.keys(carrito)
    .filter(clave => (carrito[clave] || 0) > 0)
    .map(clave => {
      const [id, talla] = clave.split("__");
      const p = PRODUCTOS.find(x => x.id === id);
      return p ? { p, talla, cantidad: carrito[clave] } : null;
    })
    .filter(Boolean);

  if(entradas.length === 0) return;

  let mensaje = "Hola! Quiero hacer este pedido:\n\n";
  let total = 0;
  entradas.forEach(({ p, talla, cantidad }) => {
    const subtotal = cantidad * p.precio;
    total += subtotal;
    const etiquetaTalla = talla ? ` (talle ${talla})` : "";
    mensaje += `• ${p.nombre}${etiquetaTalla} x${cantidad} — ${formatearPrecio(subtotal)}\n`;
  });
  mensaje += `\nTotal: ${formatearPrecio(total)}`;

  const url = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, "_blank");
}

/* ---------- inicialización ---------- */
function conectarBarraCarrito(){
  const btnClear = document.getElementById("cart-clear");
  const btnSend = document.getElementById("cart-send");
  if(btnClear) btnClear.addEventListener("click", vaciarCarrito);
  if(btnSend) btnSend.addEventListener("click", enviarPedido);
  actualizarBarra();
}

async function iniciarHome(cantidadDestacados){
  await cargarProductosDesdeSheet();
  renderDestacados(cantidadDestacados);
  conectarBarraCarrito();
}

async function iniciarCatalogo(){
  await cargarProductosDesdeSheet();
  renderFiltros();
  renderCatalogoCompleto();
  conectarBarraCarrito();
}